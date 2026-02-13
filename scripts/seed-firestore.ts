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

/** Firestore batch write limit (500 operations per batch) */
const BATCH_LIMIT = 500

/** Maximum YAML file size (1MB) to prevent memory exhaustion */
const MAX_YAML_FILE_SIZE = 1024 * 1024

/** Maximum service account file size (10KB) */
const MAX_CREDENTIAL_FILE_SIZE = 10 * 1024

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

  return parsed as ServiceAccount
}

/**
 * Load and validate all YAML component files from a directory.
 * Returns validated components or throws on validation errors.
 */
export function loadAndValidateComponents(dataDir: string): Component[] {
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".yaml"))

  console.log(`Found ${files.length} YAML files in ${dataDir}`)

  if (files.length === 0) {
    console.warn("WARNING: No YAML files found in data directory. Nothing to validate.")
    return []
  }

  const components: Component[] = []
  let hasErrors = false

  for (const file of files) {
    const filePath = join(dataDir, file)

    const fileSize = statSync(filePath).size
    if (fileSize > MAX_YAML_FILE_SIZE) {
      console.error(`ERROR: File too large — ${file} (${fileSize} bytes, max ${MAX_YAML_FILE_SIZE})`)
      hasErrors = true
      continue
    }

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
    throw new Error("Validation failed on one or more files.")
  }

  console.log(`\nValidated ${components.length} components.`)
  return components
}

/**
 * Write components to Firestore using chunked batch writes.
 * Respects the 500-operation-per-batch Firestore limit.
 * The metadata write is included in chunk accounting.
 */
export async function seedToFirestore(db: FirestoreSubset, components: Component[]): Promise<number> {
  // Reserve 1 slot in the last chunk for the metadata write
  const totalOps = components.length + 1 // +1 for metadata
  const totalChunks = Math.ceil(totalOps / BATCH_LIMIT)

  let opIndex = 0
  const writtenIds: string[] = []

  for (let chunkNum = 1; chunkNum <= totalChunks; chunkNum++) {
    const batch = db.batch()
    let opsInBatch = 0

    // Add component writes to this chunk
    while (opIndex < components.length && opsInBatch < BATCH_LIMIT) {
      // If this is the last chunk, reserve 1 slot for metadata
      const isLastChunk = chunkNum === totalChunks
      const reservedSlots = isLastChunk ? 1 : 0
      if (opsInBatch >= BATCH_LIMIT - reservedSlots && isLastChunk) {
        break
      }

      const comp = components[opIndex]
      const ref = db.collection("components").doc(comp.id)
      batch.set(ref, comp)
      writtenIds.push(comp.id)
      opsInBatch++
      opIndex++
    }

    // Add metadata to the last chunk
    if (chunkNum === totalChunks) {
      const metadataRef = db.collection("_metadata").doc("seed")
      batch.set(metadataRef, {
        version: "1.0.0",
        seededAt: new Date().toISOString(),
        componentCount: components.length,
      })
      opsInBatch++
    }

    await batch.commit()
    console.log(`Batch ${chunkNum}/${totalChunks} committed (${opsInBatch} operations)`)
  }

  if (writtenIds.length !== components.length) {
    console.warn(
      `WARNING: Write count mismatch — expected ${components.length}, tracked ${writtenIds.length}`,
    )
  }

  console.log(`Seeded ${writtenIds.length} components to Firestore.`)
  console.log("Metadata written to _metadata/seed.")
  return writtenIds.length
}

// ------ Main ------

async function main() {
  const isDryRun = process.argv.includes("--dry-run")
  const dataDir = resolve(import.meta.dirname ?? ".", "../src/data/components")

  if (isDryRun) console.log("DRY RUN — validating only, no Firestore writes\n")

  let components: Component[]
  try {
    components = loadAndValidateComponents(dataDir)
  } catch {
    console.error("\nAborting: validation failed on one or more files.")
    process.exit(1)
  }

  if (isDryRun) {
    console.log("Dry run complete — all files valid.")
    return
  }

  // Initialize Firebase Admin
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credPath) {
    console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS env var not set.")
    console.error("Set it to your Firebase service account JSON path.")
    process.exit(1)
  }

  let serviceAccount: ServiceAccount
  try {
    serviceAccount = validateServiceAccountFile(credPath)
  } catch (err) {
    console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  await seedToFirestore(db, components)
}

// Only auto-execute when run directly (not when imported by tests)
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error("Seed failed:", err)
    process.exit(1)
  })
}
