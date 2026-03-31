import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import { ComponentYamlSchema } from "@/schemas/componentSchema"

const componentDir = join(__dirname, "../../../src/data/components")

function parseComponent(filename: string) {
  const content = readFileSync(join(componentDir, filename), "utf-8")
  return ComponentYamlSchema.safeParse(load(content))
}

const ALL_COMPONENTS = [
  "cloudflare-cdn.yaml", "data-lake.yaml", "etl-pipeline.yaml", "graph-db.yaml",
  "kafka.yaml", "llm-gateway.yaml", "nginx.yaml", "node-express.yaml",
  "payment-gateway.yaml", "postgresql.yaml", "prometheus.yaml", "rabbitmq.yaml",
  "redis-cache.yaml", "redis.yaml", "serverless.yaml", "siem.yaml",
  "vector-db.yaml", "websocket-server.yaml",
]

const STORY_11 = [
  "payment-gateway.yaml", "graph-db.yaml", "data-lake.yaml", "siem.yaml",
  "llm-gateway.yaml", "vector-db.yaml", "serverless.yaml", "etl-pipeline.yaml",
]

describe("Component data quality — AC-3/AC-4/AC-5", () => {
  it("all 18 components have 2-3 variants each with codeSnippet (AC-3)", () => {
    for (const filename of ALL_COMPONENTS) {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) continue
      expect(result.data.configVariants.length).toBeGreaterThanOrEqual(2)
      expect(result.data.configVariants.length).toBeLessThanOrEqual(3)
      for (const v of result.data.configVariants) {
        expect(v.codeSnippet).toBeDefined()
        expect(v.codeSnippet!.code.length).toBeGreaterThan(0)
      }
    }
  })

  it("Story 11 components cover at least 4 of 7 metric categories (AC-4)", () => {
    for (const filename of STORY_11) {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) continue
      const categories = new Set(result.data.baseMetrics.map(m => m.category))
      expect(categories.size).toBeGreaterThanOrEqual(4)
    }
  })

  it.each([
    ["payment-gateway.yaml", ["payment", "fintech"]],
    ["graph-db.yaml", ["graph", "database"]],
    ["data-lake.yaml", ["analytics", "storage"]],
    ["siem.yaml", ["security", "siem"]],
  ])("%s includes domain-relevant tags (AC-5)", (filename, tags) => {
    const result = parseComponent(filename)
    expect(result.success).toBe(true)
    if (result.success) expect(tags.some(t => result.data.tags.includes(t))).toBe(true)
  })
})
