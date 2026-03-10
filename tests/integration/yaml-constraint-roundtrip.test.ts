import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump, load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { importYamlString } from "@/services/yamlImporter"
import { CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { DEFAULT_WEIGHT_PROFILE, type Constraint, type MetricCategoryId } from "@/lib/constants"
import { makeNode, makeEdge, makeConstraint, resetConstraintCounter } from "../helpers"

// --- Mock setup (same pattern as yaml-weight-roundtrip.test.ts) ---

const { testComponentMap } = vi.hoisted(() => {
  type TestComponent = {
    id: string
    name: string
    category: string
    description: string
    is: string
    gain: string[]
    cost: string[]
    tags: string[]
    baseMetrics: never[]
    configVariants: { id: string; name: string; metrics: never[] }[]
  }

  function buildComponent(overrides: Partial<TestComponent> & { id: string }): TestComponent {
    return {
      name: overrides.id,
      category: "compute",
      description: "A test component",
      is: "A test component",
      gain: ["Test gain"],
      cost: ["Test cost"],
      tags: [],
      baseMetrics: [],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
      ...overrides,
    }
  }

  const map = new Map<string, TestComponent>()
  map.set("postgresql", buildComponent({
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    configVariants: [
      { id: "single-node", name: "Single Node", metrics: [] },
      { id: "replica-set", name: "Replica Set", metrics: [] },
    ],
  }))
  map.set("redis", buildComponent({
    id: "redis",
    name: "Redis",
    category: "caching",
    configVariants: [{ id: "default", name: "Default", metrics: [] }],
  }))

  return { testComponentMap: map }
})

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => testComponentMap.get(id)),
    isInitialized: () => true,
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

// --- Tests ---

describe("YAML constraint round-trip (integration)", () => {
  const nodes = [
    makeNode({ id: "n1", position: { x: 96, y: 208 }, data: { archieComponentId: "postgresql", activeConfigVariantId: "single-node" } }),
    makeNode({ id: "n2", position: { x: 352, y: 208 }, data: { archieComponentId: "redis" } }),
  ]
  const edges = [makeEdge({ id: "e1", source: "n1", target: "n2" })]

  beforeEach(() => {
    vi.clearAllMocks()
    resetConstraintCounter()
  })

  describe("AC-1 + AC-3: export with constraints -> import -> constraints restored", () => {
    it("round-trips constraints with correct field values", () => {
      const constraints: Constraint[] = [
        makeConstraint({ categoryId: "performance" as MetricCategoryId, operator: "lte", threshold: 5, label: "Max cost" }),
        makeConstraint({ categoryId: "scalability" as MetricCategoryId, operator: "gte", threshold: 7, label: "Min scale" }),
      ]

      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)
      const result = importYamlString(yaml)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.constraints).toHaveLength(2)
      // Field values should match (IDs are regenerated on import, not preserved)
      expect(result.architecture.constraints[0]).toMatchObject({
        categoryId: "performance",
        operator: "lte",
        threshold: 5,
        label: "Max cost",
      })
      expect(result.architecture.constraints[1]).toMatchObject({
        categoryId: "scalability",
        operator: "gte",
        threshold: 7,
        label: "Min scale",
      })
    })

    it("imported constraints do NOT have runtime IDs (TD-6-4b AC-2: ID assignment moved to store)", () => {
      const constraints: Constraint[] = [
        makeConstraint({ categoryId: "reliability" as MetricCategoryId }),
      ]

      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, constraints)
      const result = importYamlString(yaml)

      expect(result.success).toBe(true)
      if (!result.success) return

      // hydration is now deterministic — no id field
      expect(result.architecture.constraints[0]).not.toHaveProperty("id")
    })
  })

  describe("AC-2: export without constraints -> omitted", () => {
    it("export with empty constraints omits section, reimport defaults to empty", () => {
      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [])
      const parsed = load(yaml) as Record<string, unknown>

      // constraints section is absent
      expect(parsed).not.toHaveProperty("constraints")

      // Reimport still works — defaults to empty
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.constraints).toEqual([])
    })
  })

  describe("AC-3: import v2 with constraints -> violations evaluated", () => {
    it("imports v2 YAML with constraints and produces constraint data", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        constraints: [
          { category_id: "performance", operator: "lte", threshold: 3, label: "Low perf" },
        ],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.constraints).toHaveLength(1)
      expect(result.architecture.constraints[0]).toMatchObject({
        categoryId: "performance",
        operator: "lte",
        threshold: 3,
        label: "Low perf",
      })
    })
  })

  describe("AC-4: import v2 without constraints -> empty array", () => {
    it("imports v2 YAML without constraints section", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.constraints).toEqual([])
    })
  })

  describe("AC-5: import invalid constraints -> rejection", () => {
    it("rejects v2 YAML with threshold=0 (below minimum of 1)", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        constraints: [
          { category_id: "performance", operator: "lte", threshold: 0, label: "Bad" },
        ],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    })

    it("rejects v2 YAML with unknown category in constraint", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        constraints: [
          { category_id: "nonexistent", operator: "lte", threshold: 5, label: "Bad" },
        ],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
    })

    it("rejects v2 YAML with missing operator in constraint", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        constraints: [
          { category_id: "performance", threshold: 5, label: "Bad" },
        ],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
    })
  })

  describe("Backward compatibility: v1 import -> no constraints", () => {
    it("imports v1 YAML with default empty constraints", () => {
      const v1Yaml = dump({
        schema_version: "1.0.0",
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
      })

      const result = importYamlString(v1Yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // v1 has no constraints — should default to empty array
      expect(result.architecture.constraints).toEqual([])
    })
  })

  describe("Full round-trip: create -> add constraints -> export -> import -> identical state", () => {
    it("full lifecycle preserves architecture, weights, and constraints", () => {
      const customProfile = { ...DEFAULT_WEIGHT_PROFILE, performance: 0.3 }
      const constraints: Constraint[] = [
        makeConstraint({ categoryId: "performance" as MetricCategoryId, operator: "lte", threshold: 5, label: "Perf ceiling" }),
        makeConstraint({ categoryId: "reliability" as MetricCategoryId, operator: "gte", threshold: 8, label: "Reliability floor" }),
      ]

      // Step 1: Export with custom weights + constraints
      const yaml = exportArchitecture(nodes, edges, customProfile, constraints)

      // Step 2: Import
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Step 3: Verify structural integrity
      expect(result.architecture.nodes).toHaveLength(2)
      expect(result.architecture.edges).toHaveLength(1)

      // Step 4: Verify weights
      expect(result.architecture.weightProfile.performance).toBe(0.3)

      // Step 5: Verify constraints
      expect(result.architecture.constraints).toHaveLength(2)
      expect(result.architecture.constraints[0]).toMatchObject({
        categoryId: "performance",
        operator: "lte",
        threshold: 5,
        label: "Perf ceiling",
      })
      expect(result.architecture.constraints[1]).toMatchObject({
        categoryId: "reliability",
        operator: "gte",
        threshold: 8,
        label: "Reliability floor",
      })

      // Step 6: Re-export and verify YAML structure is identical
      const reExport = exportArchitecture(
        result.architecture.nodes,
        result.architecture.edges,
        result.architecture.weightProfile,
        result.architecture.constraints,
      )
      const reParsed = load(reExport) as Record<string, unknown>
      const origParsed = load(yaml) as Record<string, unknown>

      expect(reParsed).toEqual(origParsed)
    })
  })
})
