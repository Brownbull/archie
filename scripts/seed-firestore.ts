/**
 * Seed Firestore with component data from YAML files.
 *
 * Usage:
 *   npm run seed:firestore              # Seed Firestore
 *   npm run seed:firestore -- --dry-run  # Validate only, no writes
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
 *   - OR Firebase emulator running
 */

import { readFileSync, readdirSync } from "node:fs"
import { resolve, join } from "node:path"
import { load } from "js-yaml"
import { z } from "zod"
import {
  initializeApp,
  cert,
  type ServiceAccount,
} from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// ------ Zod schemas for YAML validation (snake_case) ------

const MetricValueYamlSchema = z.object({
  id: z.string(),
  value: z.enum(["low", "medium", "high"]),
  numeric_value: z.number().int().min(1).max(10),
  category: z.string(),
}).strict()

const CodeSnippetSchema = z.object({
  language: z.string(),
  code: z.string(),
}).strict()

const MetricExplanationYamlSchema = z.object({
  reason: z.string(),
  contributing_factors: z.array(z.string()),
}).strict()

const ConfigVariantYamlSchema = z.object({
  id: z.string(),
  name: z.string(),
  metrics: z.array(MetricValueYamlSchema),
  code_snippet: CodeSnippetSchema.optional(),
  metric_explanations: z.record(z.string(), MetricExplanationYamlSchema).optional(),
}).strict()

const ConnectionPropertiesYamlSchema = z.object({
  protocol: z.string(),
  communication_patterns: z.array(z.string()),
  typical_latency: z.string(),
  co_location_potential: z.boolean(),
}).strict()

const ComponentYamlSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  is: z.string(),
  gain: z.array(z.string()).min(1),
  cost: z.array(z.string()).min(1),
  tags: z.array(z.string()),
  base_metrics: z.array(MetricValueYamlSchema),
  config_variants: z.array(ConfigVariantYamlSchema).min(1),
  compatibility: z.record(z.string(), z.string()).optional(),
  connection_properties: ConnectionPropertiesYamlSchema.optional(),
}).strict()

// ------ Transform snake_case YAML -> camelCase Firestore ------

interface FirestoreMetric {
  id: string
  value: string
  numericValue: number
  category: string
}

function transformMetric(m: z.infer<typeof MetricValueYamlSchema>): FirestoreMetric {
  return { id: m.id, value: m.value, numericValue: m.numeric_value, category: m.category }
}

function transformComponent(yaml: z.infer<typeof ComponentYamlSchema>) {
  return {
    id: yaml.id,
    name: yaml.name,
    category: yaml.category,
    description: yaml.description,
    is: yaml.is,
    gain: yaml.gain,
    cost: yaml.cost,
    tags: yaml.tags,
    baseMetrics: yaml.base_metrics.map(transformMetric),
    configVariants: yaml.config_variants.map((v) => ({
      id: v.id,
      name: v.name,
      metrics: v.metrics.map(transformMetric),
      ...(v.code_snippet && { codeSnippet: v.code_snippet }),
      ...(v.metric_explanations && {
        metricExplanations: Object.fromEntries(
          Object.entries(v.metric_explanations).map(([k, e]) => [
            k,
            { reason: e.reason, contributingFactors: e.contributing_factors },
          ]),
        ),
      }),
    })),
    ...(yaml.compatibility && { compatibility: yaml.compatibility }),
    ...(yaml.connection_properties && {
      connectionProperties: {
        protocol: yaml.connection_properties.protocol,
        communicationPatterns: yaml.connection_properties.communication_patterns,
        typicalLatency: yaml.connection_properties.typical_latency,
        coLocationPotential: yaml.connection_properties.co_location_potential,
      },
    }),
  }
}

// ------ Main ------

async function main() {
  const isDryRun = process.argv.includes("--dry-run")
  const dataDir = resolve(import.meta.dirname ?? ".", "../src/data/components")
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".yaml"))

  console.log(`Found ${files.length} YAML files in ${dataDir}`)
  if (isDryRun) console.log("DRY RUN — validating only, no Firestore writes\n")

  // 1. Read and validate all YAML files
  const components: ReturnType<typeof transformComponent>[] = []
  let hasErrors = false

  for (const file of files) {
    const filePath = join(dataDir, file)
    const raw = readFileSync(filePath, "utf-8")
    const parsed = load(raw)

    const result = ComponentYamlSchema.safeParse(parsed)
    if (!result.success) {
      console.error(`VALIDATION FAILED: ${file}`)
      console.error(result.error.issues)
      hasErrors = true
      continue
    }

    const transformed = transformComponent(result.data)
    components.push(transformed)
    console.log(`  ✓ ${file} → ${transformed.id} (${transformed.category})`)
  }

  if (hasErrors) {
    console.error("\nAborting: Zod validation failed on one or more files.")
    process.exit(1)
  }

  console.log(`\nValidated ${components.length} components.`)

  if (isDryRun) {
    console.log("Dry run complete — all files valid.")
    return
  }

  // 2. Initialize Firebase Admin
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credPath) {
    console.error("Error: GOOGLE_APPLICATION_CREDENTIALS env var not set.")
    console.error("Set it to the path of your Firebase service account JSON file.")
    process.exit(1)
  }

  const serviceAccount = JSON.parse(readFileSync(credPath, "utf-8")) as ServiceAccount
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  // 3. Batch write components
  const batch = db.batch()

  for (const comp of components) {
    const ref = db.collection("components").doc(comp.id)
    batch.set(ref, comp)
  }

  // Write metadata
  const metadataRef = db.collection("_metadata").doc("seed")
  batch.set(metadataRef, {
    version: "1.0.0",
    seededAt: new Date().toISOString(),
    componentCount: components.length,
  })

  await batch.commit()
  console.log(`Seeded ${components.length} components to Firestore.`)
  console.log("Metadata written to _metadata/seed.")
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
