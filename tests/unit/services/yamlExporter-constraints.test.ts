import { describe, it, expect, beforeEach } from "vitest"
import { load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { DEFAULT_WEIGHT_PROFILE, type MetricCategoryId } from "@/lib/constants"
import { makeNode, makeEdge, makeConstraint, resetConstraintCounter } from "../../helpers"

describe("yamlExporter — constraint export", () => {
  const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql" } })]
  const edges = [makeEdge({ id: "e1", source: "n1", target: "n1" })]

  beforeEach(() => {
    resetConstraintCounter()
  })

  describe("AC-1: Export with active constraints", () => {
    it("includes constraints section when constraints array is non-empty", () => {
      const constraints = [
        makeConstraint({ categoryId: "performance" as MetricCategoryId, operator: "lte", threshold: 5, label: "Low perf OK" }),
      ]

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)
      const parsed = load(result) as Record<string, unknown>

      expect(parsed).toHaveProperty("constraints")
      expect(parsed.constraints).toHaveLength(1)
    })

    it("exports multiple constraints", () => {
      const constraints = [
        makeConstraint({ categoryId: "performance" as MetricCategoryId, operator: "lte", threshold: 5, label: "Perf constraint" }),
        makeConstraint({ categoryId: "scalability" as MetricCategoryId, operator: "gte", threshold: 7, label: "Scale constraint" }),
      ]

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)
      const parsed = load(result) as Record<string, unknown>

      expect(parsed.constraints).toHaveLength(2)
    })
  })

  describe("AC-2: Export omits empty constraints", () => {
    it("omits constraints section when constraints array is empty", () => {
      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [])
      const parsed = load(result) as Record<string, unknown>

      expect(parsed).not.toHaveProperty("constraints")
    })

    it("omits constraints section when constraints param is undefined", () => {
      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE)
      const parsed = load(result) as Record<string, unknown>

      expect(parsed).not.toHaveProperty("constraints")
    })
  })

  describe("AC-ARCH-PATTERN-2: snake_case field names in YAML", () => {
    it("uses category_id (not categoryId) in exported YAML", () => {
      const constraints = [
        makeConstraint({ categoryId: "reliability" as MetricCategoryId, operator: "gte", threshold: 8, label: "High reliability" }),
      ]

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)
      const parsed = load(result) as { constraints: Record<string, unknown>[] }

      expect(parsed.constraints[0]).toHaveProperty("category_id", "reliability")
      expect(parsed.constraints[0]).not.toHaveProperty("categoryId")
    })

    it("strips runtime id field from exported constraints", () => {
      const constraints = [
        makeConstraint({ categoryId: "performance" as MetricCategoryId }),
      ]

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)
      const parsed = load(result) as { constraints: Record<string, unknown>[] }

      expect(parsed.constraints[0]).not.toHaveProperty("id")
    })

    it("preserves operator, threshold, and label as-is", () => {
      const constraints = [
        makeConstraint({ operator: "gte", threshold: 3, label: "Min score" }),
      ]

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)
      const parsed = load(result) as { constraints: Record<string, unknown>[] }

      expect(parsed.constraints[0]).toMatchObject({
        operator: "gte",
        threshold: 3,
        label: "Min score",
      })
    })
  })

  describe("Schema validation", () => {
    it("validates exported YAML against ArchitectureFileYamlSchema", () => {
      const constraints = [
        makeConstraint({ categoryId: "performance" as MetricCategoryId, operator: "lte", threshold: 5, label: "Test" }),
      ]

      // Should not throw — exported object must pass schema validation
      expect(() => exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)).not.toThrow()
    })
  })
})
