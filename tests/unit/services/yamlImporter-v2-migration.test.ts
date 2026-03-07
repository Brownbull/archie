import { describe, it, expect, vi, beforeEach } from "vitest"
import { dump } from "js-yaml"
import { importYamlString } from "@/services/yamlImporter"
import { CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import { DEFAULT_WEIGHT_PROFILE, METRIC_CATEGORIES } from "@/lib/constants"

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe("v1-to-v2 Migration (AC-2)", () => {
  it("v1 YAML imports successfully", () => {
    const result = importYamlString(makeV1Yaml())
    expect(result.success).toBe(true)
  })

  it("migrated data has default weight profile (all 7 = 1.0)", () => {
    const result = importYamlString(makeV1Yaml())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.weightProfile).toBeDefined()
      for (const id of ALL_CATEGORY_IDS) {
        expect(result.architecture.weightProfile![id as keyof typeof DEFAULT_WEIGHT_PROFILE]).toBe(1.0)
      }
    }
  })

  it("migration preserves all existing v1 fields", () => {
    const result = importYamlString(makeV1Yaml())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.name).toBe("Test Architecture")
      expect(result.architecture.nodes).toHaveLength(1)
      expect(result.architecture.nodes[0].id).toBe("node-1")
    }
  })
})

describe("v2 Direct Import", () => {
  it("v2 file with valid weight_profile imports correctly", () => {
    const customProfile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 0.7]))
    const result = importYamlString(makeV2Yaml({ weight_profile: customProfile }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.weightProfile).toBeDefined()
      expect(result.architecture.weightProfile!.performance).toBe(0.7)
    }
  })

  it("v2 file without weight_profile defaults to equal weights (AC-4)", () => {
    const result = importYamlString(makeV2Yaml({ weight_profile: undefined }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.architecture.weightProfile).toBeDefined()
      for (const id of ALL_CATEGORY_IDS) {
        expect(result.architecture.weightProfile![id as keyof typeof DEFAULT_WEIGHT_PROFILE]).toBe(1.0)
      }
    }
  })
})

describe("v2 Import Validation Edge Cases (AC-3)", () => {
  it("rejects partial weight profile (missing categories)", () => {
    const partial = { performance: 0.5, reliability: 0.5 }
    const result = importYamlString(makeV2Yaml({ weight_profile: partial }))
    expect(result.success).toBe(false)
  })

  it("rejects negative weight values", () => {
    const profile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 0.5]))
    profile.performance = -0.1
    const result = importYamlString(makeV2Yaml({ weight_profile: profile }))
    expect(result.success).toBe(false)
  })

  it("rejects weight values > 1", () => {
    const profile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 0.5]))
    profile.performance = 1.5
    const result = importYamlString(makeV2Yaml({ weight_profile: profile }))
    expect(result.success).toBe(false)
  })

  it("rejects empty weight profile object", () => {
    const result = importYamlString(makeV2Yaml({ weight_profile: {} }))
    expect(result.success).toBe(false)
  })

  it("rejects extra unknown categories", () => {
    const profile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 0.5]))
    const withExtra = { ...profile, "unknown-category": 0.5 }
    const result = importYamlString(makeV2Yaml({ weight_profile: withExtra }))
    expect(result.success).toBe(false)
  })
})

describe("Schema Version in Exports", () => {
  it("CURRENT_SCHEMA_VERSION is 2.0.0 (AC-1)", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("2.0.0")
  })
})
