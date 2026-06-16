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

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { resolve, join } from "node:path"
import { fileURLToPath } from "node:url"
import { load } from "js-yaml"
import {
  initializeApp,
  cert,
  type ServiceAccount,
} from "firebase-admin/app"
import { getFirestore, type Firestore as FullFirestore } from "firebase-admin/firestore"

/** Narrow Firestore dependency to only the methods we actually use */
type FirestoreSubset = Pick<FullFirestore, "batch" | "collection">
import { ComponentYamlSchema, type Component } from "../src/schemas/componentSchema"
import { BlueprintFullYamlSchema, type BlueprintFull } from "../src/schemas/blueprintSchema"
import { StackDefinitionYamlSchema, type Stack } from "../src/schemas/stackSchema"
import { METRIC_CATEGORIES } from "../src/lib/constants"

/** Firestore batch write limit (500 operations per batch) */
const BATCH_LIMIT = 500

/** Maximum YAML file size (1MB) to prevent memory exhaustion */
const MAX_YAML_FILE_SIZE = 1024 * 1024

/** Maximum service account file size (10KB) */
const MAX_CREDENTIAL_FILE_SIZE = 10 * 1024

/**
 * Logger interface for seed functions (injectable for quiet test runs).
 *
 * Use `noopLogger` from seed-helpers.ts to suppress output in tests
 * that don't verify log messages. Use a spy logger (vi.fn()) in tests
 * that verify warnings or errors are logged correctly.
 */
export interface SeedLogger {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

// ------ Exported Functions (testable) ------

/**
 * Validate and parse a service account credential file.
 * Checks: existence, size (max 10KB), valid JSON, required fields.
 */
export function validateServiceAccountFile(credPath: string): ServiceAccount {
  if (!existsSync(credPath)) {
    throw new Error(`Service account file not found: ${credPath}`)
  }

  const fileSize = statSync(credPath).size
  if (fileSize > MAX_CREDENTIAL_FILE_SIZE) {
    throw new Error(
      `Service account file too large: ${fileSize} bytes (max ${MAX_CREDENTIAL_FILE_SIZE})`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(credPath, "utf-8"))
  } catch {
    throw new Error(`Service account file is not valid JSON: ${credPath}`)
  }

  const sa = parsed as Record<string, unknown>
  const required = ["project_id", "private_key", "client_email"] as const
  for (const field of required) {
    if (typeof sa[field] !== "string" || sa[field].length === 0) {
      throw new Error(`Service account missing required field: ${field}`)
    }
  }

  return {
    project_id: sa.project_id as string,
    private_key: sa.private_key as string,
    client_email: sa.client_email as string,
  } as ServiceAccount
}

/**
 * Load and validate all YAML component files from a directory.
 * Returns validated components or throws on validation errors.
 */
export function loadAndValidateComponents(dataDir: string, logger: SeedLogger = console): Component[] {
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".yaml"))

  logger.log(`Found ${files.length} YAML files in ${dataDir}`)

  if (files.length === 0) {
    logger.warn("WARNING: No YAML files found in data directory. Nothing to validate.")
    return []
  }

  const components: Component[] = []
  let hasErrors = false

  for (const file of files) {
    const filePath = join(dataDir, file)

    const fileSize = statSync(filePath).size
    if (fileSize > MAX_YAML_FILE_SIZE) {
      logger.error(`ERROR: File too large — ${file} (${fileSize} bytes, max ${MAX_YAML_FILE_SIZE})`)
      hasErrors = true
      continue
    }

    const raw = readFileSync(filePath, "utf-8")

    let parsed: unknown
    try {
      parsed = load(raw)
    } catch (err) {
      logger.error(`ERROR: YAML parse failed — ${file}`)
      logger.error(err instanceof Error ? err.message : String(err))
      hasErrors = true
      continue
    }

    const result = ComponentYamlSchema.safeParse(parsed)
    if (!result.success) {
      logger.error(`ERROR: Zod validation failed — ${file}`)
      logger.error(result.error.issues)
      hasErrors = true
      continue
    }

    components.push(result.data)
    logger.log(`  ✓ ${file} → ${result.data.id} (${result.data.category})`)
  }

  if (hasErrors) {
    throw new Error("Validation failed on one or more files.")
  }

  logger.log(`\nValidated ${components.length} components.`)
  return components
}

/**
 * Load and validate all YAML blueprint files from a directory.
 * Returns validated blueprints (camelCase) or throws on validation errors.
 */
export function loadAndValidateBlueprints(dataDir: string, logger: SeedLogger = console): BlueprintFull[] {
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".yaml"))

  logger.log(`Found ${files.length} YAML files in ${dataDir}`)

  if (files.length === 0) {
    logger.warn("WARNING: No blueprint YAML files found in directory.")
    return []
  }

  const blueprints: BlueprintFull[] = []
  let hasErrors = false

  for (const file of files) {
    const filePath = join(dataDir, file)

    const fileSize = statSync(filePath).size
    if (fileSize > MAX_YAML_FILE_SIZE) {
      logger.error(`ERROR: File too large — ${file} (${fileSize} bytes, max ${MAX_YAML_FILE_SIZE})`)
      hasErrors = true
      continue
    }

    const raw = readFileSync(filePath, "utf-8")

    let parsed: unknown
    try {
      parsed = load(raw)
    } catch (err) {
      logger.error(`ERROR: YAML parse failed — ${file}`)
      logger.error(err instanceof Error ? err.message : String(err))
      hasErrors = true
      continue
    }

    const result = BlueprintFullYamlSchema.safeParse(parsed)
    if (!result.success) {
      logger.error(`ERROR: Zod validation failed — ${file}`)
      logger.error(result.error.issues)
      hasErrors = true
      continue
    }

    blueprints.push(result.data)
    logger.log(`  ✓ ${file} → ${result.data.id}`)
  }

  if (hasErrors) {
    throw new Error("Validation failed on one or more blueprint files.")
  }

  logger.log(`\nValidated ${blueprints.length} blueprints.`)
  return blueprints
}

/**
 * Validate blueprint node references against the component library.
 * Warns on unknown component IDs and unknown config variant IDs.
 * Returns total warning count — blueprints still seed (references are warnings, not blockers).
 */
export function validateBlueprintReferences(
  blueprints: BlueprintFull[],
  components: Component[],
  logger: SeedLogger = console,
): number {
  const componentMap = new Map(components.map((c) => [c.id, c]))
  // Pre-compute variant ID sets once per component — avoids rebuilding on every node iteration
  const variantMap = new Map(components.map((c) => [c.id, new Set(c.configVariants.map((v) => v.id))]))
  let warningCount = 0

  for (const bp of blueprints) {
    for (const node of bp.skeleton.nodes) {
      if (!componentMap.has(node.componentId)) {
        logger.warn(
          `WARNING: Blueprint '${bp.id}' node '${node.id}' references unknown component '${node.componentId}'`,
        )
        warningCount++
        continue
      }
      if (node.configVariantId) {
        // Safe: componentMap.has() passed above, variantMap built from same components array
      const variantIds = variantMap.get(node.componentId)!
        if (!variantIds.has(node.configVariantId)) {
          logger.warn(
            `WARNING: Blueprint '${bp.id}' node '${node.id}' references unknown config variant '${node.configVariantId}' for component '${node.componentId}'`,
          )
          warningCount++
        }
      }
    }
  }

  return warningCount
}

/**
 * Write components to Firestore using chunked batch writes.
 * Respects the 500-operation-per-batch Firestore limit.
 * Metadata is committed in its own separate batch after all component writes.
 */
export async function seedToFirestore(db: FirestoreSubset, components: Component[], logger: SeedLogger = console): Promise<number> {
  if (components.length === 0) {
    logger.log("No components to seed.")
    return 0
  }
  const totalChunks = Math.ceil(components.length / BATCH_LIMIT)

  for (let chunkNum = 1; chunkNum <= totalChunks; chunkNum++) {
    const start = (chunkNum - 1) * BATCH_LIMIT
    const chunk = components.slice(start, start + BATCH_LIMIT)
    const batch = db.batch()
    for (const comp of chunk) {
      const ref = db.collection("components").doc(comp.id)
      batch.set(ref, comp)
    }
    await batch.commit()
    logger.log(`Batch ${chunkNum}/${totalChunks} committed (${chunk.length} operations)`)
  }

  logger.log(`Seeded ${components.length} components to Firestore.`)
  return components.length
}

/**
 * Write blueprints to Firestore in a single batch.
 * Each blueprint document ID equals the blueprint's id field.
 */
export async function seedBlueprintsToFirestore(
  db: FirestoreSubset,
  blueprints: BlueprintFull[],
  logger: SeedLogger = console,
): Promise<number> {
  if (blueprints.length === 0) {
    logger.log("No blueprints to seed.")
    return 0
  }

  const totalChunks = Math.ceil(blueprints.length / BATCH_LIMIT)

  for (let chunkNum = 1; chunkNum <= totalChunks; chunkNum++) {
    const start = (chunkNum - 1) * BATCH_LIMIT
    const chunk = blueprints.slice(start, start + BATCH_LIMIT)
    const batch = db.batch()
    for (const blueprint of chunk) {
      const ref = db.collection("blueprints").doc(blueprint.id)
      batch.set(ref, blueprint)
    }
    await batch.commit()
    logger.log(`Blueprint batch ${chunkNum}/${totalChunks} committed (${chunk.length} operations)`)
  }

  logger.log(`Seeded ${blueprints.length} blueprints to Firestore.`)
  return blueprints.length
}

/**
 * Load and validate all YAML stack files from a directory.
 * Returns validated stacks (camelCase) or throws on validation errors.
 * Missing directory is treated as "no stacks" (warning, not error).
 */
export function loadAndValidateStacks(dataDir: string, logger: SeedLogger = console): Stack[] {
  if (!existsSync(dataDir)) {
    logger.warn(`WARNING: stacks directory not found: ${dataDir}`)
    return []
  }

  const files = readdirSync(dataDir).filter((f) => f.endsWith(".yaml"))

  logger.log(`Found ${files.length} YAML files in ${dataDir}`)

  if (files.length === 0) {
    logger.warn("WARNING: No stack YAML files found in directory.")
    return []
  }

  const stacks: Stack[] = []
  let hasErrors = false

  for (const file of files) {
    const filePath = join(dataDir, file)

    const fileSize = statSync(filePath).size
    if (fileSize > MAX_YAML_FILE_SIZE) {
      logger.error(`ERROR: File too large — ${file} (${fileSize} bytes, max ${MAX_YAML_FILE_SIZE})`)
      hasErrors = true
      continue
    }

    const raw = readFileSync(filePath, "utf-8")

    let parsed: unknown
    try {
      parsed = load(raw)
    } catch (err) {
      logger.error(`ERROR: YAML parse failed — ${file}`)
      logger.error(err instanceof Error ? err.message : String(err))
      hasErrors = true
      continue
    }

    const result = StackDefinitionYamlSchema.safeParse(parsed)
    if (!result.success) {
      logger.error(`ERROR: Zod validation failed — ${file}`)
      logger.error(result.error.issues)
      hasErrors = true
      continue
    }

    stacks.push(result.data)
    logger.log(`  ✓ ${file} → ${result.data.id}`)
  }

  if (hasErrors) {
    throw new Error("Validation failed on one or more stack files.")
  }

  logger.log(`\nValidated ${stacks.length} stacks.`)
  return stacks
}

/**
 * Validate stack component/variant references against the component library.
 * Warns on unknown component IDs and unknown variant IDs (warnings, not blockers —
 * resolveStackPlacement skips unknown components at runtime).
 */
export function validateStackReferences(
  stacks: Stack[],
  components: Component[],
  logger: SeedLogger = console,
): number {
  const componentMap = new Map(components.map((c) => [c.id, c]))
  const variantMap = new Map(components.map((c) => [c.id, new Set(c.configVariants.map((v) => v.id))]))
  let warningCount = 0

  for (const stack of stacks) {
    for (const sc of stack.components) {
      if (!componentMap.has(sc.componentId)) {
        logger.warn(`WARNING: Stack '${stack.id}' references unknown component '${sc.componentId}'`)
        warningCount++
        continue
      }
      const variantIds = variantMap.get(sc.componentId)!
      if (!variantIds.has(sc.variantId)) {
        logger.warn(
          `WARNING: Stack '${stack.id}' references unknown variant '${sc.variantId}' for component '${sc.componentId}'`,
        )
        warningCount++
      }
    }
  }

  return warningCount
}

/**
 * Derive a stack's trade-off profile from its components' metrics, matching how the
 * canvas computes category scores (dashboardCalculator.computeCategoryScores): a plain
 * average of each category's metric numericValues. Each component contributes its base
 * metrics overridden by its active variant's metrics (by metric id). Only categories with
 * data are included. Computed at seed time so the StackCard preview stays consistent with
 * the live canvas, and authors don't have to hand-maintain scores.
 */
export function computeStackTradeOffProfile(stack: Stack, components: Component[]): Stack["tradeOffProfile"] {
  const componentMap = new Map(components.map((c) => [c.id, c]))
  const sums = new Map<string, { sum: number; count: number }>()

  for (const sc of stack.components) {
    const component = componentMap.get(sc.componentId)
    if (!component || component.configVariants.length === 0) continue
    const variant = component.configVariants.find((v) => v.id === sc.variantId) ?? component.configVariants[0]

    // Merge base metrics with the active variant's overrides (variant wins by metric id).
    const merged = new Map<string, { numericValue: number; category: string }>()
    for (const m of component.baseMetrics) merged.set(m.id, { numericValue: m.numericValue, category: m.category })
    for (const m of variant.metrics) merged.set(m.id, { numericValue: m.numericValue, category: m.category })

    for (const m of merged.values()) {
      const entry = sums.get(m.category) ?? { sum: 0, count: 0 }
      entry.sum += m.numericValue
      entry.count += 1
      sums.set(m.category, entry)
    }
  }

  const profile: Stack["tradeOffProfile"] = []
  for (const cat of METRIC_CATEGORIES) {
    const entry = sums.get(cat.id)
    if (!entry || entry.count === 0) continue
    profile.push({
      categoryId: cat.id,
      categoryName: cat.name,
      score: Math.round((entry.sum / entry.count) * 10) / 10,
      metricCount: entry.count,
      hasData: true,
    })
  }

  return profile
}

/**
 * Write stacks to Firestore in chunked batches. Each stack document ID equals the
 * stack's id field. The trade-off profile is (re)computed from `components` before write
 * unless the stack already carries one, so the seeded document always has a profile.
 */
export async function seedStacksToFirestore(
  db: FirestoreSubset,
  stacks: Stack[],
  components: Component[],
  logger: SeedLogger = console,
): Promise<number> {
  if (stacks.length === 0) {
    logger.log("No stacks to seed.")
    return 0
  }

  const enriched = stacks.map((stack) => ({
    ...stack,
    tradeOffProfile:
      stack.tradeOffProfile.length > 0 ? stack.tradeOffProfile : computeStackTradeOffProfile(stack, components),
  }))

  const totalChunks = Math.ceil(enriched.length / BATCH_LIMIT)

  for (let chunkNum = 1; chunkNum <= totalChunks; chunkNum++) {
    const start = (chunkNum - 1) * BATCH_LIMIT
    const chunk = enriched.slice(start, start + BATCH_LIMIT)
    const batch = db.batch()
    for (const stack of chunk) {
      const ref = db.collection("stacks").doc(stack.id)
      batch.set(ref, stack)
    }
    await batch.commit()
    logger.log(`Stack batch ${chunkNum}/${totalChunks} committed (${chunk.length} operations)`)
  }

  logger.log(`Seeded ${enriched.length} stacks to Firestore.`)
  return enriched.length
}

// ------ Main ------

async function main() {
  const isDryRun = process.argv.includes("--dry-run")
  const componentsDir = resolve(import.meta.dirname ?? ".", "../src/data/components")
  const blueprintsDir = resolve(import.meta.dirname ?? ".", "../src/data/blueprints")
  const stacksDir = resolve(import.meta.dirname ?? ".", "../src/data/stacks")

  if (isDryRun) console.log("DRY RUN — validating only, no Firestore writes\n")

  let components: Component[]
  try {
    components = loadAndValidateComponents(componentsDir)
  } catch (err) {
    console.error("\nAborting: validation failed on one or more component files.")
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  let blueprints: BlueprintFull[]
  try {
    blueprints = loadAndValidateBlueprints(blueprintsDir)
  } catch (err) {
    console.error("\nAborting: validation failed on one or more blueprint files.")
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  let stacks: Stack[]
  try {
    stacks = loadAndValidateStacks(stacksDir)
  } catch (err) {
    console.error("\nAborting: validation failed on one or more stack files.")
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  // Cross-reference validation (warnings only — blueprints still seed, runtime uses placeholders)
  const refWarnings = validateBlueprintReferences(blueprints, components)
  if (refWarnings > 0) {
    console.warn(`\n${refWarnings} reference warning(s) found. Blueprints will still seed (runtime uses placeholders for unknown components).`)
  }

  const stackRefWarnings = validateStackReferences(stacks, components)
  if (stackRefWarnings > 0) {
    console.warn(`\n${stackRefWarnings} stack reference warning(s) found. Stacks will still seed (runtime skips unknown components).`)
  }

  if (isDryRun) {
    console.log("Dry run complete — all files valid.")
    return
  }

  // Initialize Firebase Admin
  const rawCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!rawCredPath) {
    console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS env var not set.")
    console.error("Set it to your Firebase service account JSON path.")
    process.exit(1)
  }
  const credPath = resolve(rawCredPath)

  let serviceAccount: ServiceAccount
  try {
    serviceAccount = validateServiceAccountFile(credPath)
  } catch (err) {
    console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()
  db.settings({ ignoreUndefinedProperties: true })

  const componentCount = await seedToFirestore(db, components)
  const blueprintCount = await seedBlueprintsToFirestore(db, blueprints)
  const stackCount = await seedStacksToFirestore(db, stacks, components)

  const metaBatch = db.batch()
  metaBatch.set(db.collection("_metadata").doc("seed"), {
    version: "1.0.0",
    seededAt: new Date().toISOString(),
    componentCount,
    blueprintCount,
    stackCount,
  })
  await metaBatch.commit()
  console.log("Metadata written to _metadata/seed — client caches will refresh on next load.")
}

// Only auto-execute when run directly (not when imported by tests)
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error("Seed failed:", err)
    process.exit(1)
  })
}
