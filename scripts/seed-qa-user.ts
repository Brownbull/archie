/**
 * Seed the QA/staging test user in Firebase Auth.
 *
 * Usage:
 *   npx tsx scripts/seed-qa-user.ts
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
 *   - QA_EMAIL and QA_PASSWORD env vars (from .env.local or exported)
 *
 * The script is idempotent: if the user already exists it prints a message and exits.
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const envPath = resolve(__dirname, "..", ".env.local")
if (existsSync(envPath)) config({ path: envPath })

const email = process.env.QA_EMAIL
const password = process.env.QA_PASSWORD

if (!email || !password) {
  console.error("Missing QA_EMAIL or QA_PASSWORD. Set them in .env.local or export them.")
  process.exit(1)
}

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!saPath || !existsSync(saPath)) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS not set or file missing.")
  process.exit(1)
}

const sa = JSON.parse(readFileSync(saPath, "utf-8")) as ServiceAccount
const app = initializeApp({ credential: cert(sa) })
const authAdmin = getAuth(app)

async function main() {
  try {
    const existing = await authAdmin.getUserByEmail(email!)
    console.log(`QA user already exists: uid=${existing.uid}, email=${existing.email}`)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === "auth/user-not-found") {
      const created = await authAdmin.createUser({
        email: email!,
        password: password!,
        displayName: "QA Tester",
        emailVerified: true,
      })
      console.log(`QA user created: uid=${created.uid}, email=${created.email}`)
    } else {
      throw err
    }
  }
}

void main()
