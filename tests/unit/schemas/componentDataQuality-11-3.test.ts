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

/** 10 existing components that need cost-efficiency added by story 11-3 */
const EXISTING_TEN = [
  "redis.yaml", "postgresql.yaml", "nginx.yaml", "kafka.yaml",
  "node-express.yaml", "cloudflare-cdn.yaml", "redis-cache.yaml",
  "websocket-server.yaml", "rabbitmq.yaml", "prometheus.yaml",
]

/** Expected base cost-efficiency numeric values per component */
const EXPECTED_BASE_VALUES: Record<string, number> = {
  "redis.yaml": 8,
  "postgresql.yaml": 5,
  "nginx.yaml": 9,
  "kafka.yaml": 3,
  "node-express.yaml": 8,
  "cloudflare-cdn.yaml": 6,
  "redis-cache.yaml": 7,
  "websocket-server.yaml": 6,
  "rabbitmq.yaml": 5,
  "prometheus.yaml": 7,
}

function numericToValue(n: number): string {
  if (n >= 7) return "high"
  if (n >= 4) return "medium"
  return "low"
}

describe("Story 11-3: Cost-Efficiency Metric", () => {
  it.each(EXISTING_TEN)(
    "%s has a cost-efficiency metric in base_metrics",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      const costMetrics = result.data.baseMetrics.filter(
        (m) => m.category === "cost-efficiency"
      )
      expect(costMetrics.length).toBeGreaterThanOrEqual(1)
    }
  )

  it.each(EXISTING_TEN)(
    "%s has cost-efficiency overrides in every variant",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      for (const variant of result.data.configVariants) {
        const costMetrics = variant.metrics.filter(
          (m) => m.category === "cost-efficiency"
        )
        expect(
          costMetrics.length,
          `variant '${variant.id}' in ${filename} missing cost-efficiency`
        ).toBeGreaterThanOrEqual(1)
      }
    }
  )

  it.each(EXISTING_TEN)(
    "%s cost-efficiency numeric_value matches value string (1-3=low, 4-6=medium, 7-10=high)",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      const allMetrics = [
        ...result.data.baseMetrics,
        ...result.data.configVariants.flatMap((v) => v.metrics),
      ].filter((m) => m.category === "cost-efficiency")

      for (const m of allMetrics) {
        expect(m.value, `${filename} metric ${m.id}: value=${m.value} but numeric=${m.numericValue}`)
          .toBe(numericToValue(m.numericValue))
      }
    }
  )

  it.each(EXISTING_TEN)(
    "%s base cost-efficiency matches expected score",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      const costMetric = result.data.baseMetrics.find(
        (m) => m.category === "cost-efficiency"
      )
      expect(costMetric).toBeDefined()
      expect(costMetric!.numericValue).toBe(EXPECTED_BASE_VALUES[filename])
    }
  )

  it.each(EXISTING_TEN)(
    "%s still passes ComponentYamlSchema after modification",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
    }
  )
})
