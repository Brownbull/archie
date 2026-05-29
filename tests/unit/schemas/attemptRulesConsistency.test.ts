import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { AttemptStoredSchema } from "@/schemas/attemptSchema"

/**
 * No Firestore emulator is available in this environment, so the owner-only rules can't be
 * executed in a test. This guards the next-best invariant: the firestore.rules `attempts` create
 * allowlist + validations stay in lockstep with AttemptStoredSchema, so schema drift can't silently
 * outrun the server-side rules (the real enforcement boundary). Full rule-behavior coverage is
 * deferred to an emulator harness (PENDING D9).
 */
const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8")
const schemaKeys = Object.keys(AttemptStoredSchema.shape)

describe("firestore.rules ↔ attempt schema consistency (Epic 17 P4)", () => {
  it("the attempts create allowlist is exactly the schema fields + createdAt", () => {
    const block = rules.match(/match \/attempts\/[^{]*\{[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/)
    expect(block).not.toBeNull()
    const allowlist = block![1].split(",").map((s) => s.trim().replace(/['"]/g, "")).filter(Boolean).sort()
    expect(allowlist).toEqual([...schemaKeys, "createdAt"].sort())
  })

  it("the create rule type+range validates every schema field (defense-in-depth)", () => {
    for (const field of schemaKeys) {
      expect(rules).toContain(`request.resource.data.${field}`)
    }
  })

  it("pins createdAt to the server clock (no client-spoofed timestamps)", () => {
    expect(rules).toContain("request.resource.data.createdAt == request.time")
  })

  it("keeps attempts immutable (no update/delete) and owner-scoped on read", () => {
    expect(rules).toContain("allow update, delete: if false")
    expect(rules).toContain("request.auth.uid == resource.data.userId")
  })
})
