import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump } from "js-yaml"
import { importYamlString } from "@/services/yamlImporter"
import { CURRENT_SCHEMA_VERSION, setPortResolver } from "@/schemas/architectureFileSchema"
import { METRIC_CATEGORIES, type PortDefinition } from "@/lib/constants"

const ALL_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id)
const defaultProfile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 1.0]))

const testPorts: Record<string, PortDefinition[]> = {
  "node-express": [
    { id: "http-in", type: "http", direction: "in" },
    { id: "http-out", type: "http", direction: "out" },
    { id: "db-out", type: "database", direction: "out" },
    { id: "cache-out", type: "cache", direction: "out" },
    { id: "auth-in", type: "auth", direction: "in" },
    { id: "monitor-out", type: "monitor", direction: "out" },
  ],
  postgresql: [
    { id: "db-in", type: "database", direction: "in" },
    { id: "monitor-out", type: "monitor", direction: "out" },
  ],
  redis: [
    { id: "db-in", type: "database", direction: "in" },
    { id: "cache-in", type: "cache", direction: "in" },
    { id: "monitor-out", type: "monitor", direction: "out" },
  ],
  nginx: [
    { id: "http-in", type: "http", direction: "in" },
    { id: "http-out", type: "http", direction: "out" },
  ],
  prometheus: [
    { id: "monitor-in", type: "monitor", direction: "in" },
    { id: "monitor-out", type: "monitor", direction: "out" },
  ],
}

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => {
      const ports = testPorts[id]
      if (!ports) return undefined
      return {
        id,
        name: id,
        category: "compute",
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
        ports,
      }
    }),
    isInitialized: () => true,
  },
}))

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn().mockReturnValue({ isCompatible: true, reason: null }),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("@/services/scenarioLoader", () => ({
  isKnownScenarioId: vi.fn(() => false),
  getScenarioPreset: vi.fn(),
  getAllScenarioPresets: vi.fn(() => []),
}))

vi.mock("@/services/failureLoader", () => ({
  isKnownFailurePresetId: vi.fn(() => false),
}))

function makeV2Yaml(overrides: Record<string, unknown> = {}): string {
  return dump({
    schema_version: "2.0.0",
    nodes: [
      { id: "n1", component_id: "node-express", position: { x: 100, y: 100 } },
      { id: "n2", component_id: "postgresql", position: { x: 300, y: 100 } },
    ],
    edges: [
      { id: "e1", source_node_id: "n1", target_node_id: "n2" },
    ],
    weight_profile: defaultProfile,
    ...overrides,
  })
}

function makeV3Yaml(overrides: Record<string, unknown> = {}): string {
  return dump({
    schema_version: "3.0.0",
    nodes: [
      { id: "n1", component_id: "node-express", position: { x: 100, y: 100 } },
      { id: "n2", component_id: "postgresql", position: { x: 300, y: 100 } },
    ],
    edges: [
      { id: "e1", source_node_id: "n1", target_node_id: "n2", source_handle_id: "db-out", target_handle_id: "db-in" },
    ],
    weight_profile: defaultProfile,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("v2-to-v3 Migration", () => {
  it("auto-maps edges to matching port handles by type", () => {
    const result = importYamlString(makeV2Yaml())
    expect(result.success).toBe(true)
    if (!result.success) return

    const edge = result.architecture.edges[0]
    expect(edge.data?.sourceHandleId).toBe("db-out")
    expect(edge.data?.targetHandleId).toBe("db-in")
  })

  it("picks highest-priority port type when multiple match", () => {
    const yaml = makeV2Yaml({
      nodes: [
        { id: "n1", component_id: "node-express", position: { x: 100, y: 100 } },
        { id: "n2", component_id: "redis", position: { x: 300, y: 100 } },
      ],
      edges: [
        { id: "e1", source_node_id: "n1", target_node_id: "n2" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return

    const edge = result.architecture.edges[0]
    // node-express has db-out and cache-out; redis has db-in and cache-in
    // database has higher priority than cache in PORT_SORT_ORDER
    expect(edge.data?.sourceHandleId).toBe("db-out")
    expect(edge.data?.targetHandleId).toBe("db-in")
  })

  it("leaves handles null when no port types match", () => {
    const yaml = makeV2Yaml({
      nodes: [
        { id: "n1", component_id: "nginx", position: { x: 100, y: 100 } },
        { id: "n2", component_id: "postgresql", position: { x: 300, y: 100 } },
      ],
      edges: [
        { id: "e1", source_node_id: "n1", target_node_id: "n2" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return

    const edge = result.architecture.edges[0]
    // nginx outputs http; postgresql inputs database — no type match
    expect(edge.data?.sourceHandleId).toBeNull()
    expect(edge.data?.targetHandleId).toBeNull()
  })

  it("leaves handles null when component has no ports", () => {
    const yaml = makeV2Yaml({
      nodes: [
        { id: "n1", component_id: "unknown-comp", position: { x: 100, y: 100 } },
        { id: "n2", component_id: "postgresql", position: { x: 300, y: 100 } },
      ],
      edges: [
        { id: "e1", source_node_id: "n1", target_node_id: "n2" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return

    const edge = result.architecture.edges[0]
    expect(edge.data?.sourceHandleId).toBeNull()
    expect(edge.data?.targetHandleId).toBeNull()
  })

  it("sets React Flow sourceHandle/targetHandle on hydrated edges", () => {
    const result = importYamlString(makeV2Yaml())
    expect(result.success).toBe(true)
    if (!result.success) return

    const edge = result.architecture.edges[0]
    expect(edge.sourceHandle).toBe("db-out")
    expect(edge.targetHandle).toBe("db-in")
  })

  it("preserves all existing v2 fields after migration", () => {
    const result = importYamlString(makeV2Yaml())
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.architecture.nodes).toHaveLength(2)
    expect(result.architecture.edges).toHaveLength(1)
    expect(result.architecture.nodes[0].data.archieComponentId).toBe("node-express")
    expect(result.architecture.nodes[1].data.archieComponentId).toBe("postgresql")
  })
})

describe("v3 Direct Import", () => {
  it("imports v3 YAML with handle IDs", () => {
    const result = importYamlString(makeV3Yaml())
    expect(result.success).toBe(true)
    if (!result.success) return

    const edge = result.architecture.edges[0]
    expect(edge.data?.sourceHandleId).toBe("db-out")
    expect(edge.data?.targetHandleId).toBe("db-in")
    expect(edge.sourceHandle).toBe("db-out")
    expect(edge.targetHandle).toBe("db-in")
  })

  it("imports v3 YAML without handle IDs (legacy edges)", () => {
    const yaml = makeV3Yaml({
      edges: [
        { id: "e1", source_node_id: "n1", target_node_id: "n2" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return

    const edge = result.architecture.edges[0]
    expect(edge.data?.sourceHandleId).toBeNull()
    expect(edge.data?.targetHandleId).toBeNull()
  })
})

describe("v1-to-v3 Chained Migration", () => {
  it("chains v1→v2→v3 migration in one import", () => {
    const yaml = dump({
      schema_version: "1.0.0",
      name: "Legacy Arch",
      nodes: [
        { id: "n1", component_id: "node-express", position: { x: 100, y: 100 } },
        { id: "n2", component_id: "postgresql", position: { x: 300, y: 100 } },
      ],
      edges: [
        { id: "e1", source_node_id: "n1", target_node_id: "n2" },
      ],
    })
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.architecture.name).toBe("Legacy Arch")
    expect(result.architecture.weightProfile).toBeDefined()
    const edge = result.architecture.edges[0]
    expect(edge.data?.sourceHandleId).toBe("db-out")
    expect(edge.data?.targetHandleId).toBe("db-in")
  })
})

describe("Schema Version", () => {
  it("CURRENT_SCHEMA_VERSION is 3.0.0", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("3.0.0")
  })
})
