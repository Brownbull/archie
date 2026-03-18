import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump, load } from "js-yaml"
import { evaluateFitBatch } from "@/engine/fitEvaluator"
import { exportArchitecture } from "@/services/yamlExporter"
import { importYamlString } from "@/services/yamlImporter"
import { CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { DEFAULT_WEIGHT_PROFILE, MAX_DATA_CONTEXT_ITEMS_PER_NODE, type DataContextItem } from "@/lib/constants"
import { makeNode, makeEdge } from "../helpers"

// --- Mock setup (same pattern as yaml-constraint-roundtrip.test.ts) ---

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

// --- Test data ---

const sampleItems: DataContextItem[] = [
  {
    id: "dci-1",
    name: "User Sessions",
    accessPattern: "read-heavy",
    averageSize: "medium",
    structureType: "simple-kv",
  },
  {
    id: "dci-2",
    name: "Order History",
    accessPattern: "write-heavy",
    averageSize: "large",
    structureType: "nested-json",
  },
]

// --- Tests ---

describe("YAML data context round-trip (integration)", () => {
  const nodes = [
    makeNode({ id: "n1", position: { x: 96, y: 208 }, data: { archieComponentId: "postgresql", activeConfigVariantId: "single-node" } }),
    makeNode({ id: "n2", position: { x: 352, y: 208 }, data: { archieComponentId: "redis" } }),
  ]
  const edges = [makeEdge({ id: "e1", source: "n1", target: "n2" })]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("AC-1 + AC-3: export with data context -> import -> items restored", () => {
    it("round-trips data context items with correct field values", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])

      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const result = importYamlString(yaml)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.dataContextItems.size).toBe(1)
      const n1Items = result.architecture.dataContextItems.get("n1")
      expect(n1Items).toHaveLength(1)
      expect(n1Items![0]).toMatchObject({
        id: "dci-1",
        name: "User Sessions",
        accessPattern: "read-heavy",
        averageSize: "medium",
        structureType: "simple-kv",
      })
    })

    it("round-trips multiple items on multiple nodes", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", sampleItems)
      dataContextItems.set("n2", [sampleItems[0]])

      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const result = importYamlString(yaml)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.dataContextItems.size).toBe(2)
      expect(result.architecture.dataContextItems.get("n1")).toHaveLength(2)
      expect(result.architecture.dataContextItems.get("n2")).toHaveLength(1)
    })
  })

  describe("AC-2: export without data context -> omitted", () => {
    it("export without data context omits section, reimport has empty map", () => {
      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [])
      const parsed = load(yaml) as { nodes: Record<string, unknown>[] }

      // data_context absent from all nodes
      for (const node of parsed.nodes) {
        expect(node).not.toHaveProperty("data_context")
      }

      // Reimport still works — empty map
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.dataContextItems.size).toBe(0)
    })
  })

  describe("AC-3: import v2 with data context -> items available", () => {
    it("imports hand-crafted v2 YAML with data_context", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{
          id: "n1",
          component_id: "postgresql",
          position: { x: 96, y: 208 },
          data_context: [
            { id: "dc1", name: "Cache Keys", access_pattern: "read-heavy", average_size: "small", structure_type: "simple-kv" },
          ],
        }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.dataContextItems.size).toBe(1)
      const items = result.architecture.dataContextItems.get("n1")
      expect(items).toHaveLength(1)
      expect(items![0]).toMatchObject({
        id: "dc1",
        name: "Cache Keys",
        accessPattern: "read-heavy",
        averageSize: "small",
        structureType: "simple-kv",
      })
    })
  })

  describe("AC-4: import without data context -> no items", () => {
    it("imports v2 YAML without data_context -> empty map", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.dataContextItems.size).toBe(0)
    })
  })

  describe("Backward compatibility: v1 import -> no data context", () => {
    it("imports v1 YAML with empty data context map", () => {
      const v1Yaml = dump({
        schema_version: "1.0.0",
        nodes: [{ id: "n1", component_id: "postgresql", position: { x: 96, y: 208 } }],
        edges: [],
      })

      const result = importYamlString(v1Yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.dataContextItems.size).toBe(0)
    })
  })

  describe("AC-5: import invalid data context -> rejection", () => {
    it("rejects v2 YAML with unknown access_pattern", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{
          id: "n1",
          component_id: "postgresql",
          position: { x: 96, y: 208 },
          data_context: [
            { id: "dc1", name: "Bad", access_pattern: "nonexistent", average_size: "small", structure_type: "simple-kv" },
          ],
        }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    })

    it("rejects v2 YAML with missing name in data context item", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{
          id: "n1",
          component_id: "postgresql",
          position: { x: 96, y: 208 },
          data_context: [
            { id: "dc1", access_pattern: "read-heavy", average_size: "small", structure_type: "simple-kv" },
          ],
        }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
    })

    it("rejects v2 YAML with extra fields in data context item (strict)", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{
          id: "n1",
          component_id: "postgresql",
          position: { x: 96, y: 208 },
          data_context: [
            { id: "dc1", name: "Bad", access_pattern: "read-heavy", average_size: "small", structure_type: "simple-kv", extra_field: "nope" },
          ],
        }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    })

    it("rejects v2 YAML with duplicate data context item IDs", () => {
      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{
          id: "n1",
          component_id: "postgresql",
          position: { x: 96, y: 208 },
          data_context: [
            { id: "dc1", name: "Item A", access_pattern: "read-heavy", average_size: "small", structure_type: "simple-kv" },
            { id: "dc1", name: "Item B", access_pattern: "write-heavy", average_size: "large", structure_type: "nested-json" },
          ],
        }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    })
  })

  describe("Boundary: MAX_DATA_CONTEXT_ITEMS_PER_NODE", () => {
    it("rejects import with more than max items per node", () => {
      const overLimitItems = Array.from({ length: MAX_DATA_CONTEXT_ITEMS_PER_NODE + 1 }, (_, i) => ({
        id: `dc-${i}`,
        name: `Item ${i}`,
        access_pattern: "read-heavy",
        average_size: "small",
        structure_type: "simple-kv",
      }))

      const yaml = dump({
        schema_version: CURRENT_SCHEMA_VERSION,
        nodes: [{
          id: "n1",
          component_id: "postgresql",
          position: { x: 96, y: 208 },
          data_context: overLimitItems,
        }],
        edges: [],
      })

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors.some((e) => e.code === "SCHEMA_VALIDATION_ERROR")).toBe(true)
    })
  })

  describe("AC-6: fit results NOT in exported YAML", () => {
    it("exported YAML does not contain any fit-related fields", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])

      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const parsed = load(yaml) as { nodes: { data_context?: Record<string, unknown>[] }[] }

      // Structural check: data_context items should only have definition fields
      for (const node of parsed.nodes) {
        if (node.data_context) {
          for (const item of node.data_context) {
            expect(item).not.toHaveProperty("fit_result")
            expect(item).not.toHaveProperty("fitResult")
            expect(item).not.toHaveProperty("fit_level")
            expect(item).not.toHaveProperty("fit")
          }
        }
      }
    })
  })

  describe("AC-6 affirmative: fit is computed from library after import", () => {
    it("evaluateFitBatch returns computed fit results for imported items (AC-1)", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])

      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      const importedItems = result.architecture.dataContextItems.get("n1")!
      expect(importedItems).toHaveLength(1)

      // Mock profile: all dimensions map to positive compatibility
      const profileA: Record<string, string> = {
        "read-heavy": "great",
        "medium": "good",
        "simple-kv": "great",
      }

      const results = evaluateFitBatch(importedItems, profileA)
      expect(results).toHaveLength(1)
      expect(results[0]).toBeDefined()
      expect(results[0].level).toBe("great-fit")
      expect(results[0].factors).toHaveLength(3)
      expect(results[0].explanation).toBeTruthy()
    })

    it("fit result reflects current profile, not stale export data (AC-2)", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])

      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      const importedItems = result.architecture.dataContextItems.get("n1")!

      // Profile A: all positive → great-fit
      const profileA: Record<string, string> = {
        "read-heavy": "great",
        "medium": "great",
        "simple-kv": "great",
      }

      // Profile B: all negative → risky
      const profileB: Record<string, string> = {
        "read-heavy": "incompatible",
        "medium": "poor",
        "simple-kv": "poor",
      }

      const resultsA = evaluateFitBatch(importedItems, profileA)
      const resultsB = evaluateFitBatch(importedItems, profileB)

      expect(resultsA[0].level).toBe("great-fit")
      expect(resultsB[0].level).toBe("risky")
      expect(resultsA[0].level).not.toBe(resultsB[0].level)
    })
  })

  describe("Full round-trip: create -> add items -> export -> import -> identical -> re-export identical", () => {
    it("full lifecycle preserves architecture, weights, constraints, and data context", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", sampleItems)
      dataContextItems.set("n2", [sampleItems[0]])

      // Step 1: Export
      const yaml = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)

      // Step 2: Import
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Step 3: Verify data context
      expect(result.architecture.dataContextItems.size).toBe(2)
      expect(result.architecture.dataContextItems.get("n1")).toHaveLength(2)
      expect(result.architecture.dataContextItems.get("n2")).toHaveLength(1)
      expect(result.architecture.dataContextItems.get("n1")![0]).toMatchObject({
        id: "dci-1",
        name: "User Sessions",
        accessPattern: "read-heavy",
      })

      // Step 4: Re-export with imported data
      const reExport = exportArchitecture(
        result.architecture.nodes,
        result.architecture.edges,
        result.architecture.weightProfile,
        result.architecture.constraints,
        result.architecture.dataContextItems,
      )

      // Step 5: Verify YAML structure is identical
      const origParsed = load(yaml) as Record<string, unknown>
      const reParsed = load(reExport) as Record<string, unknown>
      expect(reParsed).toEqual(origParsed)
    })
  })
})
