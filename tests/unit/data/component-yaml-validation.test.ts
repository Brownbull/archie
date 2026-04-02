import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import { ComponentYamlSchema } from "@/schemas/componentSchema"
import { COMPONENT_CATEGORIES } from "@/lib/constants"

const componentDir = join(__dirname, "../../../src/data/components")
const componentFiles = readdirSync(componentDir).filter((f) =>
  f.endsWith(".yaml")
)

function parseComponent(filename: string) {
  const content = readFileSync(join(componentDir, filename), "utf-8")
  return ComponentYamlSchema.safeParse(load(content))
}

const validCategories = Object.keys(COMPONENT_CATEGORIES)

describe("Component YAML validation", () => {
  // 1.1 — Floor guard: catches accidental deletion; bump when stories add components
  it("discovers at least 18 component YAML files", () => {
    expect(componentFiles.length).toBeGreaterThanOrEqual(18)
  })

  describe.each(componentFiles)("%s", (filename) => {
    // Parse once per file, reuse across all tests in this describe block (read-only)
    let result: ReturnType<typeof parseComponent>
    beforeAll(() => {
      result = parseComponent(filename)
    })

    // 1.2 — Schema validation
    it("passes ComponentYamlSchema validation", () => {
      expect(
        result.success,
        JSON.stringify(result.error?.issues, null, 2) ?? "schema parse failed"
      ).toBe(true)
    })

    // 1.3 — Base metrics span 4+ categories
    it("has base_metrics spanning 4+ categories", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      const categories = new Set(result.data.baseMetrics.map((m) => m.category))
      expect(
        categories.size,
        `${filename} has ${categories.size} metric categories: ${[...categories].join(", ")}`
      ).toBeGreaterThanOrEqual(4)
    })

    // 1.4 — Has 2+ config variants
    it("has 2+ config_variants", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      expect(result.data.configVariants.length).toBeGreaterThanOrEqual(2)
    })

    // 1.5 — Has cost-efficiency metric in base_metrics
    it("has cost-efficiency metric in base_metrics", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      const costMetrics = result.data.baseMetrics.filter(
        (m) => m.category === "cost-efficiency"
      )
      expect(costMetrics.length).toBeGreaterThanOrEqual(1)
    })

    // 1.5b — Every variant has cost-efficiency override
    it("has cost-efficiency override in every variant", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      for (const variant of result.data.configVariants) {
        const costMetrics = variant.metrics.filter(
          (m) => m.category === "cost-efficiency"
        )
        expect(
          costMetrics.length,
          `variant '${variant.id}' in ${filename} missing cost-efficiency override`
        ).toBeGreaterThanOrEqual(1)
      }
    })

    // 1.6 — Category exists in COMPONENT_CATEGORIES
    it("has a valid COMPONENT_CATEGORIES category", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      expect(
        validCategories,
        `${filename} category '${result.data.category}' not in COMPONENT_CATEGORIES`
      ).toContain(result.data.category)
    })

    // 1.7 — Every variant has metric_explanations with 2+ entries (V6)
    it("every variant has metric_explanations with 2+ entries", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      for (const variant of result.data.configVariants) {
        if (!variant.metricExplanations) {
          expect.fail(`variant '${variant.id}' in ${filename} missing metricExplanations`)
        }
        const entries = Object.entries(variant.metricExplanations)
        expect(
          entries.length,
          `variant '${variant.id}' in ${filename} has ${entries.length} explanation(s), need 2+`
        ).toBeGreaterThanOrEqual(2)
        for (const [metricId, explanation] of entries) {
          expect(
            explanation.reason,
            `variant '${variant.id}' metric '${metricId}' in ${filename} missing reason`
          ).toBeTruthy()
          expect(
            explanation.contributingFactors.length,
            `variant '${variant.id}' metric '${metricId}' in ${filename} missing contributingFactors`
          ).toBeGreaterThanOrEqual(1)
        }
      }
    })

    // 1.8 — Every variant has a non-empty code_snippet (V6)
    it("every variant has a non-empty code_snippet", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      for (const variant of result.data.configVariants) {
        if (!variant.codeSnippet) {
          expect.fail(`variant '${variant.id}' in ${filename} missing codeSnippet`)
        }
        expect(
          variant.codeSnippet.language,
          `variant '${variant.id}' in ${filename} codeSnippet missing language`
        ).toBeTruthy()
        expect(
          variant.codeSnippet.code,
          `variant '${variant.id}' in ${filename} codeSnippet missing code`
        ).toBeTruthy()
      }
    })

    // 1.10 — AC-2: connectionProperties present (schema marks optional, AC requires it)
    it("has connection_properties", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      expect(
        result.data.connectionProperties,
        `${filename} missing connection_properties`
      ).toBeDefined()
    })

    // 1.9 — Variants have distinct metric profiles
    it("variants have distinct metric profiles", () => {
      expect(result.success, `${filename} schema parse failed`).toBe(true)
      if (!result.success) return
      const variants = result.data.configVariants
      // 1.4 already requires 2+ variants; guard kept for safety if run in isolation
      const signatures = variants.map((v) => {
        const sorted = [...v.metrics]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((m) => `${m.id}:${m.numericValue}`)
          .join("|")
        return sorted
      })
      const uniqueSignatures = new Set(signatures)
      expect(
        uniqueSignatures.size,
        `${filename}: ${variants.length} variants but only ${uniqueSignatures.size} distinct metric profiles`
      ).toBe(variants.length)
    })
  })
})
