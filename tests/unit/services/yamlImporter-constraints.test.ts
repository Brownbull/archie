import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump } from "js-yaml"
import { importYamlString } from "@/services/yamlImporter"
import { METRIC_CATEGORIES } from "@/lib/constants"

// Mock componentLibrary — importYamlString calls componentLibrary.getComponent during hydration
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn().mockReturnValue({
      name: "PostgreSQL",
      category: "data-storage",
      configVariants: [{ id: "single-node", name: "Single Node" }],
    }),
  },
}))

// Mock compatibilityChecker — needed by hydration pipeline
vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn().mockReturnValue({ isCompatible: true, reason: null }),
}))

const ALL_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id)

function makeV2Yaml(overrides: Record<string, unknown> = {}): string {
  const defaultProfile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 1.0]))
  return dump({
    schema_version: "2.0.0",
    name: "Test Architecture",
    nodes: [
      {
        id: "node-1",
        component_id: "postgresql",
        config_variant_id: "single-node",
        position: { x: 100, y: 200 },
      },
    ],
    edges: [],
    weight_profile: defaultProfile,
    ...overrides,
  })
}

function makeV1Yaml(overrides: Record<string, unknown> = {}): string {
  return dump({
    schema_version: "1.0.0",
    name: "Test Architecture",
    nodes: [
      {
        id: "node-1",
        component_id: "postgresql",
        config_variant_id: "single-node",
        position: { x: 100, y: 200 },
      },
    ],
    edges: [],
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("v2 Import with Constraints (AC-2, AC-3)", () => {
  it("imports v2 YAML with valid constraints", () => {
    const yaml = makeV2Yaml({
      constraints: [
        { category_id: "performance", operator: "lte", threshold: 5, label: "Max cost" },
        { category_id: "reliability", operator: "gte", threshold: 7, label: "Min reliability" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.constraints).toHaveLength(2)
      expect(result.architecture.constraints[0]).toMatchObject({
        categoryId: "performance",
        operator: "lte",
        threshold: 5,
        label: "Max cost",
      })
      // TD-6-4b AC-2: hydration is deterministic — no id field (assigned in store)
      expect(result.architecture.constraints[0]).not.toHaveProperty("id")
      expect(result.architecture.constraints[1]).toMatchObject({
        categoryId: "reliability",
        operator: "gte",
        threshold: 7,
        label: "Min reliability",
      })
      expect(result.architecture.constraints[1]).not.toHaveProperty("id")
    }
  })

  it("imports v2 YAML without constraints — defaults to empty array (AC-3)", () => {
    const yaml = makeV2Yaml()
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.constraints).toEqual([])
    }
  })

  it("imports v2 YAML with empty constraints array — returns empty array", () => {
    const yaml = makeV2Yaml({ constraints: [] })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.constraints).toEqual([])
    }
  })
})

describe("v1 Backward Compatibility (Task 4.10)", () => {
  it("v1 import returns empty constraints array", () => {
    const yaml = makeV1Yaml()
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.constraints).toEqual([])
    }
  })
})

describe("Constraint Validation via Import Pipeline (AC-4)", () => {
  it("rejects YAML with invalid constraint — threshold 0", () => {
    const yaml = makeV2Yaml({
      constraints: [
        { category_id: "performance", operator: "lte", threshold: 0, label: "Bad" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    }
  })

  it("rejects YAML with invalid constraint — unknown category", () => {
    const yaml = makeV2Yaml({
      constraints: [
        { category_id: "unknown-category", operator: "lte", threshold: 5, label: "Bad" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    }
  })

  it("rejects YAML with invalid constraint — bad operator", () => {
    const yaml = makeV2Yaml({
      constraints: [
        { category_id: "performance", operator: "eq", threshold: 5, label: "Bad" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    }
  })

  it("sanitizes constraint label with HTML in import pipeline (AC-5)", () => {
    const yaml = makeV2Yaml({
      constraints: [
        { category_id: "cost-efficiency", operator: "lte", threshold: 4, label: "<b>Cost</b> limit" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.constraints[0].label).toBe("Cost limit")
    }
  })
})
