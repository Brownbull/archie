import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { load } from "js-yaml"
import { ChallengeYamlSchema } from "@/schemas/challengeSchema"
import { COMPONENT_CATEGORIES } from "@/lib/constants"

const DIR = join(process.cwd(), "src/data/challenges")
const files = readdirSync(DIR).filter((f) => f.endsWith(".yaml")).sort()
const validCategories = new Set<string>(Object.keys(COMPONENT_CATEGORIES))

function parse(file: string) {
  return ChallengeYamlSchema.safeParse(load(readFileSync(join(DIR, file), "utf8")))
}

describe("challenge content (Epic 16 P5)", () => {
  it("ships exactly 10 challenge levels", () => {
    expect(files.length).toBe(38)
  })

  it.each(files)("%s parses against the schema with known categories", (file) => {
    const res = parse(file)
    expect(res.success ? "" : JSON.stringify(res.error.issues)).toBe("")
    if (!res.success) return
    const c = res.data
    expect(c.requiredComponents.length).toBeGreaterThan(0)
    for (const cat of c.requiredComponents) expect(validCategories.has(cat)).toBe(true)
    // az_outage targets a category; component_failure/latency_spike target a node id (free string)
    for (const e of c.scheduledEvents) {
      if (e.type === "az_outage") expect(validCategories.has(e.target)).toBe(true)
    }
    expect(c.trafficCurve.length).toBeGreaterThan(0)
    expect(c.budgetCap).toBeGreaterThan(0)
  })

  it("has unique ids and covers all three difficulty tiers", () => {
    const parsed = files.map(parse)
    expect(parsed.every((r) => r.success)).toBe(true)
    const data = parsed.flatMap((r) => (r.success ? [r.data] : []))
    expect(new Set(data.map((c) => c.id)).size).toBe(38)
    expect(new Set(data.map((c) => c.difficulty))).toEqual(new Set(["beginner", "intermediate", "advanced"]))
  })
})
