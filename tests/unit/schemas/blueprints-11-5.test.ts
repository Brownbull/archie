import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import { BlueprintFullYamlSchema } from "@/schemas/blueprintSchema"

const blueprintDir = join(__dirname, "../../../src/data/blueprints")

function parseBlueprint(filename: string) {
  const content = readFileSync(join(blueprintDir, filename), "utf-8")
  return BlueprintFullYamlSchema.safeParse(load(content))
}

/** Components added in stories 11-1 and 11-2 */
const NEW_COMPONENTS_FROM_11_1_11_2 = [
  "llm-gateway", "vector-db", "serverless", "etl-pipeline",
  "payment-gateway", "graph-db", "data-lake", "siem",
]

const BLUEPRINTS_11_5 = [
  "social-media-feed.yaml",
  "ai-agent-orchestration.yaml",
  "data-analytics-pipeline.yaml",
  "video-streaming.yaml",
  "fintech-payment.yaml",
]

describe("Story 11-5: Blueprint Architectures", () => {
  it.each(BLUEPRINTS_11_5)(
    "%s passes BlueprintFullYamlSchema validation (AC-3)",
    (filename) => {
      const result = parseBlueprint(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
    }
  )

  it.each(BLUEPRINTS_11_5)(
    "%s uses at least one new component from 11-1/11-2 (AC-2)",
    (filename) => {
      const result = parseBlueprint(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
      if (!result.success) return
      const componentIds = result.data.skeleton.nodes.map((n) => n.componentId)
      const usesNewComponent = componentIds.some((id) =>
        NEW_COMPONENTS_FROM_11_1_11_2.includes(id)
      )
      expect(
        usesNewComponent,
        `${filename} does not use any new component from 11-1/11-2: ${componentIds.join(", ")}`
      ).toBe(true)
    }
  )

  it.each(BLUEPRINTS_11_5)(
    "%s has no overlapping node positions (AC-ARCH-NO-2)",
    (filename) => {
      const result = parseBlueprint(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
      if (!result.success) return
      const positions = result.data.skeleton.nodes.map(
        (n) => `${n.position.x},${n.position.y}`
      )
      const unique = new Set(positions)
      expect(
        unique.size,
        `${filename} has overlapping positions: ${positions.join(" | ")}`
      ).toBe(positions.length)
    }
  )

  it.each(BLUEPRINTS_11_5)(
    "%s has meaningful description with trade-off language (AC-5, V6)",
    (filename) => {
      const result = parseBlueprint(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
      if (!result.success) return
      expect(result.data.description.length).toBeGreaterThan(80)
      expect(result.data.description.toLowerCase()).toMatch(
        /trade|latency|cost|complexity|resilience/
      )
    }
  )

  it.each(BLUEPRINTS_11_5)(
    "%s nodes within canvas bounds x:0-1200 y:0-600 (AC-ARCH-PATTERN-2)",
    (filename) => {
      const result = parseBlueprint(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
      if (!result.success) return
      for (const node of result.data.skeleton.nodes) {
        expect(node.position.x).toBeGreaterThanOrEqual(0)
        expect(node.position.x).toBeLessThanOrEqual(1200)
        expect(node.position.y).toBeGreaterThanOrEqual(0)
        expect(node.position.y).toBeLessThanOrEqual(600)
      }
    }
  )

  it.each(BLUEPRINTS_11_5)(
    "%s has 5-6 components (AC-ARCH-PATTERN-3)",
    (filename) => {
      const result = parseBlueprint(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
      if (!result.success) return
      const count = result.data.skeleton.nodes.length
      expect(count).toBeGreaterThanOrEqual(5)
      expect(count).toBeLessThanOrEqual(6)
    }
  )

  it.each(BLUEPRINTS_11_5)(
    "%s id matches filename (AC-4)",
    (filename) => {
      const result = parseBlueprint(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
      if (!result.success) return
      const expectedId = filename.replace(".yaml", "")
      expect(result.data.id).toBe(expectedId)
    }
  )

  it("rejects malformed YAML (AC-3 error path)", () => {
    const malformed = load("id: bad\nname: Bad\nskeleton: not-an-object")
    const result = BlueprintFullYamlSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })

  it("total blueprint count is 15 (10 existing + 5 new) (AC-1)", () => {
    const allFiles = readdirSync(blueprintDir).filter((f: string) =>
      f.endsWith(".yaml")
    )
    expect(allFiles.length).toBe(15)
  })
})
