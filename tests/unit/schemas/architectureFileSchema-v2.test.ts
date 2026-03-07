import { describe, it, expect } from "vitest"
import {
  ArchitectureFileSchema,
  ArchitectureFileYamlSchema,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  WeightProfileSchema,
  checkSchemaVersion,
} from "@/schemas/architectureFileSchema"
import {
  DEFAULT_WEIGHT_PROFILE,
  WEIGHT_MIN,
  WEIGHT_MAX,
  METRIC_CATEGORIES,
  type MetricCategoryId,
  type WeightProfile,
} from "@/lib/constants"

// All 7 category IDs for reference
const ALL_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id)

// Valid weight profile: all categories at 0.5
const validWeightProfile: Record<string, number> = Object.fromEntries(
  ALL_CATEGORY_IDS.map((id) => [id, 0.5]),
)

const validNode = {
  id: "node-1",
  componentId: "postgresql",
  configVariantId: "single-node",
  position: { x: 100, y: 200 },
}

const validEdge = {
  id: "edge-1",
  sourceNodeId: "node-1",
  targetNodeId: "node-2",
}

describe("Schema v2: Version and Migration Registration", () => {
  it("CURRENT_SCHEMA_VERSION is 2.0.0 (AC-1)", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("2.0.0")
  })

  it("MIGRATIONS has key '1' registered (AC-2)", () => {
    expect(MIGRATIONS).toHaveProperty("1")
    expect(typeof MIGRATIONS["1"]).toBe("function")
  })

  it("checkSchemaVersion('1.0.0', '2.0.0') returns migrate with key 1", () => {
    expect(checkSchemaVersion("1.0.0", "2.0.0")).toEqual({
      status: "migrate",
      migrationKey: 1,
    })
  })
})

describe("Schema v2: Weight Profile Constants", () => {
  it("DEFAULT_WEIGHT_PROFILE has all 7 category IDs", () => {
    for (const id of ALL_CATEGORY_IDS) {
      expect(DEFAULT_WEIGHT_PROFILE).toHaveProperty(id)
    }
    expect(Object.keys(DEFAULT_WEIGHT_PROFILE)).toHaveLength(7)
  })

  it("DEFAULT_WEIGHT_PROFILE has all values = 1.0 (identity)", () => {
    for (const id of ALL_CATEGORY_IDS) {
      expect(DEFAULT_WEIGHT_PROFILE[id as MetricCategoryId]).toBe(1.0)
    }
  })

  it("WEIGHT_MIN is 0", () => {
    expect(WEIGHT_MIN).toBe(0)
  })

  it("WEIGHT_MAX is 1", () => {
    expect(WEIGHT_MAX).toBe(1)
  })

  it("WeightProfile type matches Record<MetricCategoryId, number>", () => {
    const profile: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE }
    expect(Object.keys(profile)).toHaveLength(7)
  })
})

describe("Schema v2: WeightProfileSchema Validation (AC-3)", () => {
  it("accepts valid weight profile (all 7 categories, values 0-1)", () => {
    const result = WeightProfileSchema.safeParse(validWeightProfile)
    expect(result.success).toBe(true)
  })

  it("accepts boundary value 0.0 (WEIGHT_MIN)", () => {
    const profile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 0.0]))
    const result = WeightProfileSchema.safeParse(profile)
    expect(result.success).toBe(true)
  })

  it("accepts boundary value 1.0 (WEIGHT_MAX)", () => {
    const profile = Object.fromEntries(ALL_CATEGORY_IDS.map((id) => [id, 1.0]))
    const result = WeightProfileSchema.safeParse(profile)
    expect(result.success).toBe(true)
  })

  it("rejects partial weight profile (missing categories)", () => {
    const partial = { performance: 0.5, reliability: 0.5 }
    const result = WeightProfileSchema.safeParse(partial)
    expect(result.success).toBe(false)
  })

  it("rejects empty object {}", () => {
    const result = WeightProfileSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects extra unknown categories (.strict())", () => {
    const withExtra = { ...validWeightProfile, "unknown-category": 0.5 }
    const result = WeightProfileSchema.safeParse(withExtra)
    expect(result.success).toBe(false)
  })

  it("rejects negative weight values", () => {
    const profile = { ...validWeightProfile, performance: -0.1 }
    const result = WeightProfileSchema.safeParse(profile)
    expect(result.success).toBe(false)
  })

  it("rejects values > 1", () => {
    const profile = { ...validWeightProfile, performance: 1.1 }
    const result = WeightProfileSchema.safeParse(profile)
    expect(result.success).toBe(false)
  })

  it("rejects NaN", () => {
    const profile = { ...validWeightProfile, performance: NaN }
    const result = WeightProfileSchema.safeParse(profile)
    expect(result.success).toBe(false)
  })

  it("rejects Infinity", () => {
    const profile = { ...validWeightProfile, performance: Infinity }
    const result = WeightProfileSchema.safeParse(profile)
    expect(result.success).toBe(false)
  })

  it("rejects string values", () => {
    const profile = { ...validWeightProfile, performance: "high" }
    const result = WeightProfileSchema.safeParse(profile)
    expect(result.success).toBe(false)
  })
})

describe("Schema v2: ArchitectureFileSchema with weightProfile", () => {
  const validV2File = {
    schemaVersion: "2.0.0",
    nodes: [validNode],
    edges: [validEdge],
    weightProfile: validWeightProfile,
  }

  it("accepts v2 file with weightProfile (AC-5)", () => {
    const result = ArchitectureFileSchema.safeParse(validV2File)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.weightProfile).toBeDefined()
    }
  })

  it("accepts v2 file without weightProfile (optional, AC-ARCH-PATTERN-5)", () => {
    const { weightProfile: _wp, ...withoutProfile } = validV2File
    const result = ArchitectureFileSchema.safeParse(withoutProfile)
    expect(result.success).toBe(true)
  })

  it("rejects unknown keys (.strict() preserved, AC-ARCH-NO-4)", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validV2File,
      unknownField: "nope",
    })
    expect(result.success).toBe(false)
  })
})

describe("Schema v2: YAML Variant Transform (AC-ARCH-PATTERN-4)", () => {
  const yamlInput = {
    schema_version: "2.0.0",
    nodes: [
      {
        id: "node-1",
        component_id: "postgresql",
        config_variant_id: "single-node",
        position: { x: 100, y: 200 },
      },
    ],
    edges: [
      {
        id: "edge-1",
        source_node_id: "node-1",
        target_node_id: "node-2",
      },
    ],
    weight_profile: validWeightProfile,
  }

  it("transforms weight_profile to weightProfile", () => {
    const result = ArchitectureFileYamlSchema.safeParse(yamlInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.weightProfile).toEqual(validWeightProfile)
    }
  })

  it("accepts YAML without weight_profile (optional)", () => {
    const { weight_profile: _wp, ...withoutProfile } = yamlInput
    const result = ArchitectureFileYamlSchema.safeParse(withoutProfile)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.weightProfile).toBeUndefined()
    }
  })

  it("rejects unknown keys in YAML input (.strict())", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlInput,
      unknown_field: "nope",
    })
    expect(result.success).toBe(false)
  })

  it("round-trip: YAML output matches ArchitectureFileSchema shape", () => {
    const yamlResult = ArchitectureFileYamlSchema.safeParse(yamlInput)
    expect(yamlResult.success).toBe(true)
    if (yamlResult.success) {
      const baseResult = ArchitectureFileSchema.safeParse(yamlResult.data)
      expect(baseResult.success).toBe(true)
    }
  })
})
