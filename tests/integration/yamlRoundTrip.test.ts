import { describe, it, expect, vi, beforeEach } from "vitest"
import { load, dump } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { importYamlString } from "@/services/yamlImporter"
import { CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { CANVAS_GRID_SIZE, MAX_REPLICAS } from "@/lib/constants"
import type { ArchieNode } from "@/stores/architectureStore"
import { makeNode, makeEdge } from "../helpers"

// --- Mock setup (same pattern as yamlImporter.test.ts) ---

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
    compatibility?: Record<string, string>
  }

  function buildComponent(overrides: Partial<TestComponent> & { id: string }): TestComponent {
    return {
      name: overrides.id,
      category: "compute",
      description: "A test component",
      is: "A test component for integration tests",
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
  map.set("nginx", buildComponent({
    id: "nginx",
    name: "Nginx",
    category: "compute",
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

// --- Local helper (position comparison) ---

function expectPositionClose(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  tolerance = CANVAS_GRID_SIZE,
) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
}

// --- Integration Tests ---

describe("YAML round-trip (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("full round-trip: 3 nodes + 2 edges preserves structural equality", () => {
    const nodes = [
      makeNode({ id: "node-1", position: { x: 96, y: 208 }, data: { archieComponentId: "postgresql", activeConfigVariantId: "single-node" } }),
      makeNode({ id: "node-2", position: { x: 352, y: 208 }, data: { archieComponentId: "redis" } }),
      makeNode({ id: "node-3", position: { x: 608, y: 208 }, data: { archieComponentId: "nginx" } }),
    ]
    const edges = [
      makeEdge({ id: "edge-1", source: "node-1", target: "node-2" }),
      makeEdge({ id: "edge-2", source: "node-2", target: "node-3" }),
    ]

    const yaml = exportArchitecture(nodes, edges)
    const result = importYamlString(yaml)

    expect(result.success).toBe(true)
    if (!result.success) return

    // Node count and edge count match (task 4.4)
    expect(result.architecture.nodes).toHaveLength(3)
    expect(result.architecture.edges).toHaveLength(2)

    // Node IDs preserved exactly
    const importedIds = result.architecture.nodes.map((n) => n.id).sort()
    expect(importedIds).toEqual(["node-1", "node-2", "node-3"])

    // Component IDs preserved exactly
    const node1 = result.architecture.nodes.find((n) => n.id === "node-1")!
    expect(node1.data.archieComponentId).toBe("postgresql")
    expect(node1.data.activeConfigVariantId).toBe("single-node")

    // Edge source/target preserved exactly
    const edge1 = result.architecture.edges.find((e) => e.id === "edge-1")!
    expect(edge1.source).toBe("node-1")
    expect(edge1.target).toBe("node-2")
  })

  it("modification round-trip: changed variant is preserved after re-export and reimport", () => {
    // Start with single-node variant
    const originalNodes = [
      makeNode({ id: "node-1", position: { x: 96, y: 208 }, data: { archieComponentId: "postgresql", activeConfigVariantId: "single-node" } }),
    ]

    // Export original
    const firstExport = exportArchitecture(originalNodes, [])
    const firstImport = importYamlString(firstExport)
    expect(firstImport.success).toBe(true)
    if (!firstImport.success) return
    expect(firstImport.architecture.nodes[0].data.activeConfigVariantId).toBe("single-node")

    // Simulate modification: change variant to replica-set
    const modifiedNodes = firstImport.architecture.nodes.map((n) =>
      n.id === "node-1" ? { ...n, data: { ...n.data, activeConfigVariantId: "replica-set" } } : n,
    ) as ArchieNode[]

    // Re-export and reimport (task 4.3)
    const secondExport = exportArchitecture(modifiedNodes, [])
    const secondImport = importYamlString(secondExport)
    expect(secondImport.success).toBe(true)
    if (!secondImport.success) return

    // Modification preserved
    expect(secondImport.architecture.nodes[0].data.activeConfigVariantId).toBe("replica-set")
  })

  it("structural equality: positions preserved within grid-snap tolerance", () => {
    // On-grid positions: multiples of CANVAS_GRID_SIZE (16)
    const nodes = [
      makeNode({ id: "node-1", position: { x: 96, y: 208 }, data: { archieComponentId: "postgresql" } }),
      makeNode({ id: "node-2", position: { x: 352, y: 208 }, data: { archieComponentId: "redis" } }),
    ]

    const yaml = exportArchitecture(nodes, [])
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return

    const n1 = result.architecture.nodes.find((n) => n.id === "node-1")!
    const n2 = result.architecture.nodes.find((n) => n.id === "node-2")!

    // Positions are on-grid → snap is a no-op → exact match (tolerance still applies per AC-ARCH-PATTERN-6)
    expectPositionClose(n1.position, { x: 96, y: 208 })
    expectPositionClose(n2.position, { x: 352, y: 208 })
  })

  it("exported YAML contains no computed/runtime fields", () => {
    const nodes = [
      makeNode({ id: "node-1", data: { archieComponentId: "postgresql", activeConfigVariantId: "single-node" } }),
    ]
    const edges = [makeEdge({ id: "edge-1", source: "node-1", target: "node-1" })]

    const yaml = exportArchitecture(nodes, edges)
    const parsed = load(yaml) as Record<string, unknown>

    // Top-level: no runtime state
    expect(parsed).not.toHaveProperty("computedMetrics")
    expect(parsed).not.toHaveProperty("heatmapColors")
    expect(parsed).not.toHaveProperty("rippleActiveNodeIds")
    expect(parsed).not.toHaveProperty("currentTier")
    expect(parsed).not.toHaveProperty("overallScore")

    // Node-level: only skeleton fields
    const yamlNodes = parsed.nodes as Record<string, unknown>[]
    const firstNode = yamlNodes[0]
    const allowedNodeKeys = new Set(["id", "component_id", "config_variant_id", "position"])
    for (const key of Object.keys(firstNode)) {
      expect(allowedNodeKeys.has(key)).toBe(true)
    }

    // Edge-level: no incompatibility data
    const yamlEdges = parsed.edges as Record<string, unknown>[]
    const firstEdge = yamlEdges[0]
    expect(firstEdge).not.toHaveProperty("isIncompatible")
    expect(firstEdge).not.toHaveProperty("incompatibilityReason")
  })

  it("empty architecture round-trip: export and reimport produce empty canvas", () => {
    const yaml = exportArchitecture([], [])
    const result = importYamlString(yaml)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.architecture.nodes).toHaveLength(0)
    expect(result.architecture.edges).toHaveLength(0)
  })

  it("placeholder node round-trip: unknown component_id preserved across export/import", () => {
    const unknownId = "unknown-future-component"
    const nodes = [
      makeNode({
        id: "node-placeholder",
        type: "placeholder" as "component",
        position: { x: 96, y: 208 },
        data: { archieComponentId: unknownId, activeConfigVariantId: "" },
      }),
    ]

    const yaml = exportArchitecture(nodes, [])

    // YAML should contain the unknown component_id
    const parsed = load(yaml) as { nodes: Record<string, unknown>[] }
    expect(parsed.nodes[0]).toHaveProperty("component_id", unknownId)

    // Reimport: unknown component → placeholder in result
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.architecture.nodes).toHaveLength(1)
    expect(result.architecture.placeholderIds).toContain("node-placeholder")
    expect(result.architecture.nodes[0].data.archieComponentId).toBe(unknownId)
  })

  it("schema_version in exported YAML matches CURRENT_SCHEMA_VERSION", () => {
    const nodes = [makeNode({ id: "node-1", data: { archieComponentId: "postgresql" } })]
    const yaml = exportArchitecture(nodes, [])
    const parsed = load(yaml) as Record<string, unknown>

    expect(parsed.schema_version).toBe(CURRENT_SCHEMA_VERSION)
  })

  // --- Epic 14: replica round-trip ---

  it("preserves replicaCount > 1 through a full export -> import round-trip", () => {
    const nodes = [
      makeNode({ id: "node-1", data: { archieComponentId: "postgresql", activeConfigVariantId: "single-node", replicaCount: 3 } }),
      makeNode({ id: "node-2", data: { archieComponentId: "redis", replicaCount: 1 } }),
    ]
    const yaml = exportArchitecture(nodes, [])

    // replicas serialized only when > 1 (default omitted)
    const parsed = load(yaml) as { nodes: Array<Record<string, unknown>> }
    expect(parsed.nodes[0].replicas).toBe(3)
    expect(parsed.nodes[1]).not.toHaveProperty("replicas")

    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes.find((n) => n.id === "node-1")!.data.replicaCount).toBe(3)
    expect(result.architecture.nodes.find((n) => n.id === "node-2")!.data.replicaCount).toBe(1)
  })

  it("migrates a v3.0.0 file (no replicas) to the current schema with replicaCount defaulting to 1", () => {
    const v3Yaml = dump({
      schema_version: "3.0.0",
      nodes: [{ id: "node-1", component_id: "postgresql", position: { x: 0, y: 0 } }],
      edges: [],
    })
    const result = importYamlString(v3Yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(1)
  })

  it("preserves replicaCount at the MAX_REPLICAS boundary through round-trip", () => {
    const nodes = [makeNode({ id: "node-1", data: { archieComponentId: "postgresql", replicaCount: MAX_REPLICAS } })]
    const yaml = exportArchitecture(nodes, [])
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(MAX_REPLICAS)
  })

  it("hydrates an explicit replicas: 1 in YAML to replicaCount 1", () => {
    const yaml = dump({
      schema_version: CURRENT_SCHEMA_VERSION,
      nodes: [{ id: "node-1", component_id: "postgresql", position: { x: 0, y: 0 }, replicas: 1 }],
      edges: [],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(1)
  })

  // --- ISAPivot: trafficKind round-trip + legacy trafficPattern migration ---

  it("round-trips a traffic source's trafficKind and emits traffic_kind (never traffic_pattern)", () => {
    const nodes = [
      makeNode({ id: "src", data: { archieComponentId: "web-users", componentCategory: "traffic", trafficKind: "search" } }),
      makeNode({ id: "src2", data: { archieComponentId: "web-users", componentCategory: "traffic", trafficKind: "steady" } }),
    ]
    const yaml = exportArchitecture(nodes, [])
    const parsed = load(yaml) as { nodes: Array<Record<string, unknown>> }
    expect(parsed.nodes[0].traffic_kind).toBe("search")
    expect(parsed.nodes[0]).not.toHaveProperty("traffic_pattern") // legacy field never emitted
    expect(parsed.nodes[1]).not.toHaveProperty("traffic_kind") // steady omitted for compactness

    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes.find((n) => n.id === "src")!.data.trafficKind).toBe("search")
  })

  it("migrates a legacy traffic_pattern file to trafficKind (wobble→realistic, surge→realistic)", () => {
    const legacyYaml = dump({
      schema_version: CURRENT_SCHEMA_VERSION,
      nodes: [
        { id: "a", component_id: "web-users", position: { x: 0, y: 0 }, traffic_pattern: "wobble" },
        { id: "b", component_id: "web-users", position: { x: 100, y: 0 }, traffic_pattern: "surge" },
      ],
      edges: [],
    })
    const result = importYamlString(legacyYaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes.find((n) => n.id === "a")!.data.trafficKind).toBe("realistic")
    expect(result.architecture.nodes.find((n) => n.id === "b")!.data.trafficKind).toBe("realistic")
  })

  it("does NOT emit traffic_kind for a non-traffic node that carries a stray value", () => {
    const nodes = [makeNode({ id: "db", data: { archieComponentId: "postgresql", componentCategory: "data-storage", trafficKind: "periodic" } })]
    const parsed = load(exportArchitecture(nodes, [])) as { nodes: Array<Record<string, unknown>> }
    expect(parsed.nodes[0]).not.toHaveProperty("traffic_kind")
  })

  it("round-trips traffic workload + origin and omits the defaults", () => {
    const nodes = [
      makeNode({ id: "s1", data: { archieComponentId: "web-users", componentCategory: "traffic", trafficWorkload: "write", trafficOrigin: "multi-region" } }),
      makeNode({ id: "s2", data: { archieComponentId: "web-users", componentCategory: "traffic", trafficWorkload: "mixed", trafficOrigin: "one-region" } }),
    ]
    const yaml = exportArchitecture(nodes, [])
    const parsed = load(yaml) as { nodes: Array<Record<string, unknown>> }
    expect(parsed.nodes[0].traffic_workload).toBe("write")
    expect(parsed.nodes[0].traffic_origin).toBe("multi-region")
    expect(parsed.nodes[1]).not.toHaveProperty("traffic_workload") // mixed = default → omitted
    expect(parsed.nodes[1]).not.toHaveProperty("traffic_origin")   // one-region = default → omitted

    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    const s1 = result.architecture.nodes.find((n) => n.id === "s1")!.data
    expect(s1.trafficWorkload).toBe("write")
    expect(s1.trafficOrigin).toBe("multi-region")
  })
})
