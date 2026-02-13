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
import {
  initializeApp,
  cert,
  type ServiceAccount,
} from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { ComponentYamlSchema, type Component } from "../src/schemas/componentSchema"

// ------ Main ------

async function main() {
  const isDryRun = process.argv.includes("--dry-run")
  const dataDir = resolve(import.meta.dirname ?? ".", "../src/data/components")
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".yaml"))

  console.log(`Found ${files.length} YAML files in ${dataDir}`)
  if (isDryRun) console.log("DRY RUN — validating only, no Firestore writes\n")

  // 1. Read and validate all YAML files
  const components: Component[] = []
  let hasErrors = false

  for (const file of files) {
    const filePath = join(dataDir, file)
    const raw = readFileSync(filePath, "utf-8")

    let parsed: unknown
    try {
      parsed = load(raw)
    } catch (err) {
      console.error(`ERROR: YAML parse failed — ${file}`)
      console.error(err instanceof Error ? err.message : String(err))
      hasErrors = true
      continue
    }

    const result = ComponentYamlSchema.safeParse(parsed)
    if (!result.success) {
      console.error(`ERROR: Zod validation failed — ${file}`)
      console.error(result.error.issues)
      hasErrors = true
      continue
    }

    components.push(result.data)
    console.log(`  ✓ ${file} → ${result.data.id} (${result.data.category})`)
  }

  if (hasErrors) {
    console.error("\nAborting: validation failed on one or more files.")
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
    console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS env var not set.")
    console.error("Options:")
    console.error("  1. Set it to your Firebase service account JSON path")
    console.error("  2. Start Firebase emulator: firebase emulators:start")
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
