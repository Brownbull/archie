import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump } from "js-yaml"
import { importYamlString } from "@/services/yamlImporter"
import { exportArchitecture } from "@/services/yamlExporter"
import { METRIC_CATEGORIES } from "@/lib/constants"
import { makeNode } from "../../helpers"

const ALL_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id)
const defaultProfile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 1.0]))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getComponent: vi.fn((id: string) => {
      const known = ["postgresql", "redis", "node-express"]
      if (!known.includes(id)) return undefined
      return {
        id,
        name: id,
        category: id === "postgresql" || id === "redis" ? "data-storage" : "compute",
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
        ports: [],
      }
    }),
    isInitialized: () => true,
  },
}))

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn().mockReturnValue({ isCompatible: true, reason: null }),
}))

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

vi.mock("@/services/scenarioLoader", () => ({
  isKnownScenarioId: vi.fn(() => false),
  getScenarioPreset: vi.fn(),
  getAllScenarioPresets: vi.fn(() => []),
}))

vi.mock("@/services/failureLoader", () => ({
  isKnownFailurePresetId: vi.fn(() => false),
}))

function makeYaml(schemaVersion: string, nodeOverrides: Record<string, unknown> = {}): string {
  return dump({
    schema_version: schemaVersion,
    nodes: [{ id: "n1", component_id: "postgresql", position: { x: 0, y: 0 }, ...nodeOverrides }],
    edges: [],
    weight_profile: defaultProfile,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("yamlImporter — replicas hydration (Epic 14, schema v4)", () => {
  it("hydrates replicaCount from the replicas field", () => {
    const result = importYamlString(makeYaml("4.0.0", { replicas: 4 }))
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(4)
  })

  it("defaults replicaCount to 1 when replicas is absent", () => {
    const result = importYamlString(makeYaml("4.0.0"))
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(1)
  })

  it("hydrates replicaCount on a placeholder node for an unknown component", () => {
    const result = importYamlString(makeYaml("4.0.0", { component_id: "unknown-component", replicas: 5 }))
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(5)
  })

  it("rejects an out-of-range replicas value at schema validation", () => {
    const result = importYamlString(makeYaml("4.0.0", { replicas: 999 }))
    expect(result.success).toBe(false)
  })
})

describe("yamlImporter — v3 → v4 migration", () => {
  it("migrates a v3.0.0 file (no replicas) to v4 with replicaCount defaulting to 1", () => {
    const result = importYamlString(makeYaml("3.0.0"))
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(1)
  })
})

describe("yamlImporter — replicas round-trip", () => {
  it("preserves a replicaCount > 1 through export then import", () => {
    const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql", replicaCount: 6 } })]
    const yaml = exportArchitecture(nodes, [], defaultProfile, [])
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(6)
  })

  it("round-trips a default replicaCount of 1 (omitted in YAML, rehydrated to 1)", () => {
    const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql", replicaCount: 1 } })]
    const yaml = exportArchitecture(nodes, [], defaultProfile, [])
    expect(yaml).not.toContain("replicas")
    const result = importYamlString(yaml)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes[0].data.replicaCount).toBe(1)
  })
})
