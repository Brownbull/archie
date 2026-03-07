import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump, load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { importYamlString } from "@/services/yamlImporter"
import { CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { DEFAULT_WEIGHT_PROFILE, type WeightProfile } from "@/lib/constants"
import { makeNode, makeEdge } from "../helpers"

// --- Mock setup (same pattern as yamlRoundTrip.test.ts) ---

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

describe("YAML weight profile round-trip (integration)", () => {
  const nodes = [
    makeNode({ id: "n1", position: { x: 96, y: 208 }, data: { archieComponentId: "postgresql", activeConfigVariantId: "single-node" } }),
    makeNode({ id: "n2", position: { x: 352, y: 208 }, data: { archieComponentId: "redis" } }),
  ]
  const edges = [makeEdge({ id: "e1", source: "n1", target: "n2" })]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("AC-1 + AC-3: export non-default -> import -> weights restored", () => {
    it("round-trips custom weight profile identically", () => {
      const customProfile: WeightProfile = {
        ...DEFAULT_WEIGHT_PROFILE,
        performance: 0.3,
        scalability: 0.7,
      }

      const yaml = exportArchitecture(nodes, edges, customProfile)
      const result = importYamlString(yaml)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.weightProfile).toBeDefined()
      expect(result.architecture.weightProfile!.performance).toBe(0.3)
      expect(result.architecture.weightProfile!.scalability).toBe(0.7)
    })
  })

  describe("AC-2 + AC-4: export default -> import v1 -> default weights", () => {
    it("export with default weights omits weight_profile, reimport defaults", () => {
      const yaml = exportArchitecture(nodes, edges, { ...DEFAULT_WEIGHT_PROFILE })
      const parsed = load(yaml) as Record<string, unknown>

      // weight_profile is absent (AC-2)
      expect(parsed).not.toHaveProperty("weight_profile")

      // Reimport still works — defaults applied (AC-4)
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // weightProfile should be default (filled by importer fallback)
      expect(result.architecture.weightProfile).toBeDefined()
      expect(result.architecture.weightProfile!.performance).toBe(1.0)
    })

    it("imports v1 YAML (no weight_profile) with default weights", () => {
      const v1Yaml = dump({
        schema_version: "1.0.0",
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
      })

      const result = importYamlString(v1Yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // v1 migration adds default weight profile
      expect(result.architecture.weightProfile).toBeDefined()
      expect(result.architecture.weightProfile!.performance).toBe(1.0)
    })
  })

  describe("AC-5: invalid weight profile rejection", () => {
    it("rejects weight value above 1.0", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        weight_profile: {
          ...DEFAULT_WEIGHT_PROFILE,
          performance: 2.0,
        },
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    })

    it("rejects weight value below 0", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        weight_profile: {
          ...DEFAULT_WEIGHT_PROFILE,
          performance: -0.5,
        },
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
    })

    it("rejects unknown category in weight profile", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        weight_profile: {
          ...DEFAULT_WEIGHT_PROFILE,
          unknown_category: 0.5,
        },
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
    })
  })

  describe("AC-ARCH-PATTERN-4: all-zero weight normalization", () => {
    it("normalizes all-zero weights to equal weights", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
        weight_profile: Object.fromEntries(
          Object.keys(DEFAULT_WEIGHT_PROFILE).map((k) => [k, 0]),
        ),
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // All weights should be normalized to equal (1.0)
      const wp = result.architecture.weightProfile!
      for (const key of Object.keys(DEFAULT_WEIGHT_PROFILE)) {
        expect(wp[key as keyof WeightProfile]).toBe(1.0)
      }
    })
  })

  describe("Full round-trip: create -> adjust -> export -> import -> identical state", () => {
    it("full lifecycle preserves architecture and custom weights", () => {
      // Step 1: Export with custom weights
      const customProfile: WeightProfile = {
        ...DEFAULT_WEIGHT_PROFILE,
        performance: 0.2,
        scalability: 0.8,
        reliability: 0.5,
      }

      const yaml = exportArchitecture(nodes, edges, customProfile)

      // Step 2: Import
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Step 3: Verify structural integrity
      expect(result.architecture.nodes).toHaveLength(2)
      expect(result.architecture.edges).toHaveLength(1)

      // Step 4: Verify weight profile
      expect(result.architecture.weightProfile!.performance).toBe(0.2)
      expect(result.architecture.weightProfile!.scalability).toBe(0.8)
      expect(result.architecture.weightProfile!.reliability).toBe(0.5)

      // Step 5: Re-export and verify identical
      const reExport = exportArchitecture(
        result.architecture.nodes,
        result.architecture.edges,
        result.architecture.weightProfile,
      )
      const reParsed = load(reExport) as Record<string, unknown>
      const origParsed = load(yaml) as Record<string, unknown>

      expect(reParsed).toEqual(origParsed)
    })
  })
})
