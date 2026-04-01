import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import { ComponentYamlSchema } from "@/schemas/componentSchema"
import { FailureResponseSchema } from "@/schemas/demandSchema"
import { FAILURE_PRESET_IDS, FAILURE_MULTIPLIER_MIN, FAILURE_MULTIPLIER_MAX } from "@/lib/constants"

const componentDir = join(__dirname, "../../../src/data/components")

function parseComponent(filename: string) {
  const content = readFileSync(join(componentDir, filename), "utf-8")
  return ComponentYamlSchema.safeParse(load(content))
}

/** The 8 new components from Stories 11-1 and 11-2 that need failure responses */
const TARGET_EIGHT = [
  "llm-gateway.yaml",
  "vector-db.yaml",
  "serverless.yaml",
  "etl-pipeline.yaml",
  "payment-gateway.yaml",
  "graph-db.yaml",
  "data-lake.yaml",
  "siem.yaml",
]

const MINIMUM_FAILURE_SCENARIOS = 3
const failurePresetSet = new Set<string>(FAILURE_PRESET_IDS)

describe("Story 11-4: Failure Response Data for New Components", () => {
  it.each(TARGET_EIGHT)(
    "%s passes ComponentYamlSchema (schema acceptance)",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
    }
  )

  it.each(TARGET_EIGHT)(
    "%s has failureResponses field (AC-2)",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
      if (!result.success) return
      expect(
        Object.keys(result.data.failureResponses ?? {}).length,
        `${filename} failureResponses is empty or missing`
      ).toBeGreaterThan(0)
    }
  )

  it.each(TARGET_EIGHT)(
    "%s covers at least 3 of 6 failure scenarios (AC-2 minimum coverage)",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      const scenarioCount = Object.keys(result.data.failureResponses ?? {}).length
      expect(
        scenarioCount,
        `${filename} has ${scenarioCount} failure scenarios, need >= ${MINIMUM_FAILURE_SCENARIOS}`
      ).toBeGreaterThanOrEqual(MINIMUM_FAILURE_SCENARIOS)
    }
  )

  it.each(TARGET_EIGHT)(
    "%s all failure multipliers are in 0.1-1.0 range (AC-ARCH-PATTERN-2)",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      const responses = result.data.failureResponses ?? {}
      for (const [scenarioId, modifiers] of Object.entries(responses)) {
        for (const [metricId, value] of Object.entries(modifiers as Record<string, number>)) {
          expect(
            value,
            `${filename} → ${scenarioId} → ${metricId}: ${value} outside [${FAILURE_MULTIPLIER_MIN}, ${FAILURE_MULTIPLIER_MAX}]`
          ).toBeGreaterThanOrEqual(FAILURE_MULTIPLIER_MIN)
          expect(
            value,
            `${filename} → ${scenarioId} → ${metricId}: ${value} outside [${FAILURE_MULTIPLIER_MIN}, ${FAILURE_MULTIPLIER_MAX}]`
          ).toBeLessThanOrEqual(FAILURE_MULTIPLIER_MAX)
        }
      }
    }
  )

  it.each(TARGET_EIGHT)(
    "%s all failure preset IDs are known FAILURE_PRESET_IDS (no typos)",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      const responses = result.data.failureResponses ?? {}
      for (const scenarioId of Object.keys(responses)) {
        expect(
          failurePresetSet.has(scenarioId),
          `${filename}: unknown failure preset ID "${scenarioId}"`
        ).toBe(true)
      }
    }
  )

  it.each(TARGET_EIGHT)(
    "%s all referenced metric IDs exist in component base_metrics (no phantom metrics)",
    (filename) => {
      const result = parseComponent(filename)
      expect(result.success).toBe(true)
      if (!result.success) return
      const baseMetricIds = new Set(result.data.baseMetrics.map((m) => m.id))
      const responses = result.data.failureResponses ?? {}
      for (const [scenarioId, modifiers] of Object.entries(responses)) {
        for (const metricId of Object.keys(modifiers as Record<string, number>)) {
          expect(
            baseMetricIds.has(metricId),
            `${filename} → ${scenarioId}: metric "${metricId}" not in base_metrics [${[...baseMetricIds].join(", ")}]`
          ).toBe(true)
        }
      }
    }
  )

  it("rejects failure_responses with more than 10 entries (schema boundary)", () => {
    const tooMany: Record<string, Record<string, number>> = {}
    for (let i = 0; i < 11; i++) {
      tooMany[`failure-test-${i}`] = { "some-metric": 0.5 }
    }
    const result = FailureResponseSchema.safeParse(tooMany)
    expect(result.success, "FailureResponseSchema should reject >10 entries").toBe(false)
  })

  describe("Directional accuracy pins — severe degradation ≤ 0.4 (TD-11-4a AC-2)", () => {
    const ACCURACY_PINS = [
      { filename: "llm-gateway.yaml", preset: "failure-traffic-spike", metric: "cost-per-inference", threshold: 0.4 },
      { filename: "data-lake.yaml", preset: "failure-data-corruption", metric: "data-durability", threshold: 0.4 },
      { filename: "payment-gateway.yaml", preset: "failure-network-partition", metric: "payment-availability", threshold: 0.4 },
    ]

    it.each(ACCURACY_PINS)(
      "$filename $preset → $metric ≤ $threshold",
      ({ filename, preset, metric, threshold }) => {
        const result = parseComponent(filename)
        expect(result.success, result.error?.message ?? "schema parse failed").toBe(true)
        if (!result.success) return
        const value = result.data.failureResponses?.[preset]?.[metric]
        expect(value, `${filename} → ${preset} → ${metric} is undefined`).toBeDefined()
        expect(
          value!,
          `${filename} → ${preset} → ${metric}: ${value} should be ≤ ${threshold}`
        ).toBeLessThanOrEqual(threshold)
      }
    )
  })
})
