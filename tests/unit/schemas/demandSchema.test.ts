import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import {
  DemandLevelSchema,
  DemandResponseSchema,
  DemandProfileSchema,
  ScenarioPresetSchema,
  ScenarioPresetYamlSchema,
  FailureModifiersSchema,
  FailurePresetSchema,
  FailurePresetYamlSchema,
} from "@/schemas/demandSchema"
import { DEMAND_MULTIPLIER_MIN, DEMAND_MULTIPLIER_MAX, FAILURE_MULTIPLIER_MIN, FAILURE_MULTIPLIER_MAX } from "@/lib/constants"

// --- Test Helpers ---

function validDemandResponse() {
  return {
    "traffic-volume": {
      high: { performance: 0.7, reliability: 0.8 },
      extreme: { performance: 0.4, reliability: 0.5 },
    },
  }
}

function validDemandProfile() {
  return {
    "traffic-volume": "high",
    "data-size": "medium",
    "concurrent-users": "low",
    "geographic-spread": "single-region",
    "burst-pattern": "steady",
  }
}

function validScenarioPreset() {
  return {
    id: "test-scenario",
    name: "Test Scenario",
    description: "A test scenario for validation",
    icon: "Zap",
    demandProfile: validDemandProfile(),
  }
}

// --- DemandLevelSchema ---

describe("DemandLevelSchema", () => {
  it("accepts valid general levels", () => {
    expect(DemandLevelSchema.safeParse("low").success).toBe(true)
    expect(DemandLevelSchema.safeParse("medium").success).toBe(true)
    expect(DemandLevelSchema.safeParse("high").success).toBe(true)
    expect(DemandLevelSchema.safeParse("extreme").success).toBe(true)
  })

  it("accepts valid variable-specific levels", () => {
    expect(DemandLevelSchema.safeParse("single-region").success).toBe(true)
    expect(DemandLevelSchema.safeParse("periodic-spikes").success).toBe(true)
    expect(DemandLevelSchema.safeParse("steady").success).toBe(true)
  })

  it("rejects unknown level", () => {
    expect(DemandLevelSchema.safeParse("ultra").success).toBe(false)
  })
})

// --- DemandResponseSchema (AC-2) ---

describe("DemandResponseSchema Validation (AC-2)", () => {
  it("accepts valid demand response with multipliers at boundaries", () => {
    const response = {
      "traffic-volume": {
        high: { performance: DEMAND_MULTIPLIER_MIN, reliability: DEMAND_MULTIPLIER_MAX },
      },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(true)
  })

  it("accepts empty object (no responses defined)", () => {
    expect(DemandResponseSchema.safeParse({}).success).toBe(true)
  })

  it("accepts partial response (only some variables)", () => {
    expect(DemandResponseSchema.safeParse(validDemandResponse()).success).toBe(true)
  })

  it("rejects multiplier below 0.1", () => {
    const response = {
      "traffic-volume": { high: { performance: 0.05 } },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(false)
  })

  it("rejects multiplier above 1.0", () => {
    const response = {
      "traffic-volume": { high: { performance: 1.5 } },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(false)
  })

  it("rejects multiplier of 0", () => {
    const response = {
      "traffic-volume": { high: { performance: 0 } },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(false)
  })

  it("rejects negative multiplier", () => {
    const response = {
      "traffic-volume": { high: { performance: -0.5 } },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(false)
  })

  it("accepts multiplier at exactly 0.1 (boundary)", () => {
    const response = {
      "traffic-volume": { high: { performance: 0.1 } },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(true)
  })

  it("accepts multiplier at exactly 1.0 (boundary)", () => {
    const response = {
      "traffic-volume": { high: { performance: 1.0 } },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(true)
  })

  it("rejects unknown demand variable key with descriptive error", () => {
    const response = {
      "disk-speed": { high: { performance: 0.7 } },
    }
    const result = DemandResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("disk-speed")
    }
  })

  it("rejects metric key exceeding max length", () => {
    const response = {
      "traffic-volume": { high: { ["a".repeat(257)]: 0.7 } },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(false)
  })

  it("rejects more than 50 metric entries for a single level", () => {
    const metrics: Record<string, number> = {}
    for (let i = 0; i < 51; i++) {
      metrics[`metric-${i}`] = 0.7
    }
    const response = {
      "traffic-volume": { high: metrics },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(false)
  })

  it("accepts exactly 50 metric entries", () => {
    const metrics: Record<string, number> = {}
    for (let i = 0; i < 50; i++) {
      metrics[`metric-${i}`] = 0.7
    }
    const response = {
      "traffic-volume": { high: metrics },
    }
    expect(DemandResponseSchema.safeParse(response).success).toBe(true)
  })

  it("rejects invalid level for variable with descriptive error", () => {
    const response = {
      "burst-pattern": { extreme: { performance: 0.7 } },
    }
    // "extreme" is not valid for burst-pattern (only steady/periodic-spikes/unpredictable)
    const result = DemandResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("burst-pattern")
    }
  })
})

// --- DemandProfileSchema (AC-4, AC-5) ---

describe("DemandProfileSchema Validation (AC-4, AC-5)", () => {
  it("accepts complete profile with all 5 variables", () => {
    expect(DemandProfileSchema.safeParse(validDemandProfile()).success).toBe(true)
  })

  it("rejects profile missing a variable", () => {
    const { "burst-pattern": _, ...incomplete } = validDemandProfile()
    expect(DemandProfileSchema.safeParse(incomplete).success).toBe(false)
  })

  it("rejects cross-variable level mismatch with descriptive error", () => {
    const profile = { ...validDemandProfile(), "geographic-spread": "extreme" }
    const result = DemandProfileSchema.safeParse(profile)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("geographic-spread"))).toBe(true)
    }
  })

  it("rejects profile with unknown variable key", () => {
    const profile = { ...validDemandProfile(), "disk-speed": "high" }
    expect(DemandProfileSchema.safeParse(profile).success).toBe(false)
  })

  it("rejects invalid level for geographic-spread", () => {
    const profile = { ...validDemandProfile(), "geographic-spread": "extreme" }
    // "extreme" not valid for geographic-spread
    expect(DemandProfileSchema.safeParse(profile).success).toBe(false)
  })

  it("rejects invalid level for burst-pattern", () => {
    const profile = { ...validDemandProfile(), "burst-pattern": "high" }
    // "high" not valid for burst-pattern
    expect(DemandProfileSchema.safeParse(profile).success).toBe(false)
  })
})

// --- ScenarioPresetSchema (AC-3) ---

describe("ScenarioPresetSchema Validation (AC-3)", () => {
  it("accepts valid scenario preset", () => {
    expect(ScenarioPresetSchema.safeParse(validScenarioPreset()).success).toBe(true)
  })

  it("rejects missing id", () => {
    const { id: _, ...noId } = validScenarioPreset()
    expect(ScenarioPresetSchema.safeParse(noId).success).toBe(false)
  })

  it("rejects missing name", () => {
    const { name: _, ...noName } = validScenarioPreset()
    expect(ScenarioPresetSchema.safeParse(noName).success).toBe(false)
  })

  it("rejects missing description", () => {
    const { description: _, ...noDesc } = validScenarioPreset()
    expect(ScenarioPresetSchema.safeParse(noDesc).success).toBe(false)
  })

  it("rejects missing icon", () => {
    const { icon: _, ...noIcon } = validScenarioPreset()
    expect(ScenarioPresetSchema.safeParse(noIcon).success).toBe(false)
  })

  it("rejects missing demandProfile", () => {
    const { demandProfile: _, ...noProfile } = validScenarioPreset()
    expect(ScenarioPresetSchema.safeParse(noProfile).success).toBe(false)
  })

  it("rejects id with invalid characters", () => {
    expect(
      ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), id: "has spaces!" }).success,
    ).toBe(false)
  })

  it("truncates name exceeding max length via sanitizeDisplayString", () => {
    const result = ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), name: "x".repeat(200) })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name.length).toBeLessThanOrEqual(100)
    }
  })

  it("truncates description exceeding max length via sanitizeDisplayString", () => {
    const result = ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), description: "x".repeat(1000) })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description.length).toBeLessThanOrEqual(500)
    }
  })

  it("rejects preset with extra unknown fields", () => {
    expect(
      ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), extraField: "oops" }).success,
    ).toBe(false)
  })

  it("rejects empty name", () => {
    expect(
      ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), name: "" }).success,
    ).toBe(false)
  })

  it("rejects empty description", () => {
    expect(
      ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), description: "" }).success,
    ).toBe(false)
  })

  it("rejects empty icon", () => {
    expect(
      ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), icon: "" }).success,
    ).toBe(false)
  })

  it("rejects icon exceeding 50 characters", () => {
    expect(
      ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), icon: "x".repeat(51) }).success,
    ).toBe(false)
  })

  it("accepts icon at exactly 50 characters", () => {
    expect(
      ScenarioPresetSchema.safeParse({ ...validScenarioPreset(), icon: "x".repeat(50) }).success,
    ).toBe(true)
  })
})

// --- ScenarioPresetYamlSchema (snake_case transform) ---

describe("ScenarioPresetYamlSchema (snake_case transform)", () => {
  it("accepts YAML-format preset with demand_profile key", () => {
    const yamlPreset = {
      id: "test-scenario",
      name: "Test Scenario",
      description: "A test scenario",
      icon: "Zap",
      demand_profile: validDemandProfile(),
    }
    const result = ScenarioPresetYamlSchema.safeParse(yamlPreset)
    expect(result.success).toBe(true)
  })

  it("transforms demand_profile to demandProfile in output", () => {
    const yamlPreset = {
      id: "test-scenario",
      name: "Test Scenario",
      description: "A test scenario",
      icon: "Zap",
      demand_profile: validDemandProfile(),
    }
    const result = ScenarioPresetYamlSchema.safeParse(yamlPreset)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.demandProfile).toBeDefined()
      expect((result.data as Record<string, unknown>)["demand_profile"]).toBeUndefined()
    }
  })
})

// --- FailureModifiersSchema (Story 9-7) ---

describe("FailureModifiersSchema Validation (Story 9-7)", () => {
  it("accepts valid failure modifiers at boundaries", () => {
    const modifiers = { "read-latency": FAILURE_MULTIPLIER_MIN, "data-durability": FAILURE_MULTIPLIER_MAX }
    expect(FailureModifiersSchema.safeParse(modifiers).success).toBe(true)
  })

  it("accepts empty object (no modifiers)", () => {
    expect(FailureModifiersSchema.safeParse({}).success).toBe(true)
  })

  it("rejects multiplier below 0.1", () => {
    expect(FailureModifiersSchema.safeParse({ "read-latency": 0.05 }).success).toBe(false)
  })

  it("rejects multiplier above 1.0", () => {
    expect(FailureModifiersSchema.safeParse({ "read-latency": 1.5 }).success).toBe(false)
  })

  it("rejects multiplier of 0", () => {
    expect(FailureModifiersSchema.safeParse({ "read-latency": 0 }).success).toBe(false)
  })

  it("rejects more than 50 entries", () => {
    const modifiers: Record<string, number> = {}
    for (let i = 0; i < 51; i++) modifiers[`metric-${i}`] = 0.5
    expect(FailureModifiersSchema.safeParse(modifiers).success).toBe(false)
  })

  it("accepts exactly 50 entries", () => {
    const modifiers: Record<string, number> = {}
    for (let i = 0; i < 50; i++) modifiers[`metric-${i}`] = 0.5
    expect(FailureModifiersSchema.safeParse(modifiers).success).toBe(true)
  })
})

// --- FailurePresetSchema (Story 9-7 AC-1) ---

function validFailurePreset() {
  return {
    id: "failure-single-node",
    name: "Single Node Failure",
    description: "Tests architecture resilience when a single node goes down",
    icon: "AlertTriangle",
    failureModifiers: { "operational-complexity": 0.7, "data-durability": 0.6 },
  }
}

describe("FailurePresetSchema Validation (Story 9-7 AC-1)", () => {
  it("accepts valid failure preset", () => {
    expect(FailurePresetSchema.safeParse(validFailurePreset()).success).toBe(true)
  })

  it("rejects missing failureModifiers", () => {
    const { failureModifiers: _, ...noMods } = validFailurePreset()
    expect(FailurePresetSchema.safeParse(noMods).success).toBe(false)
  })

  it("rejects missing id", () => {
    const { id: _, ...noId } = validFailurePreset()
    expect(FailurePresetSchema.safeParse(noId).success).toBe(false)
  })

  it("rejects id with invalid characters", () => {
    expect(
      FailurePresetSchema.safeParse({ ...validFailurePreset(), id: "has spaces!" }).success,
    ).toBe(false)
  })

  it("rejects extra unknown fields", () => {
    expect(
      FailurePresetSchema.safeParse({ ...validFailurePreset(), extraField: "oops" }).success,
    ).toBe(false)
  })

  it("truncates name exceeding max length", () => {
    const result = FailurePresetSchema.safeParse({ ...validFailurePreset(), name: "x".repeat(200) })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name.length).toBeLessThanOrEqual(100)
    }
  })
})

// --- FailurePresetYamlSchema (snake_case transform) ---

describe("FailurePresetYamlSchema (snake_case transform)", () => {
  it("accepts YAML-format preset with failure_modifiers key", () => {
    const yamlPreset = {
      id: "failure-single-node",
      name: "Single Node Failure",
      description: "Tests single node failure",
      icon: "AlertTriangle",
      failure_modifiers: { "operational-complexity": 0.7 },
    }
    const result = FailurePresetYamlSchema.safeParse(yamlPreset)
    expect(result.success).toBe(true)
  })

  it("transforms failure_modifiers to failureModifiers in output", () => {
    const yamlPreset = {
      id: "failure-single-node",
      name: "Single Node Failure",
      description: "Tests single node failure",
      icon: "AlertTriangle",
      failure_modifiers: { "operational-complexity": 0.7 },
    }
    const result = FailurePresetYamlSchema.safeParse(yamlPreset)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.failureModifiers).toBeDefined()
      expect((result.data as Record<string, unknown>)["failure_modifiers"]).toBeUndefined()
    }
  })

  it("rejects camelCase failureModifiers key (must be snake_case)", () => {
    const yamlPreset = {
      id: "failure-single-node",
      name: "Single Node Failure",
      description: "Tests single node failure",
      icon: "AlertTriangle",
      failureModifiers: { "operational-complexity": 0.7 },
    }
    expect(FailurePresetYamlSchema.safeParse(yamlPreset).success).toBe(false)
  })
})

// --- Scenario YAML Files Validation ---

describe("Scenario YAML files validation", () => {
  const scenarioDir = join(__dirname, "../../../src/data/scenarios")
  const expectedFiles = [
    "traffic-peak.yaml",
    "cost-optimized.yaml",
    "security-first.yaml",
    "startup-mvp.yaml",
    "enterprise-production.yaml",
    "high-availability.yaml",
  ]

  for (const filename of expectedFiles) {
    it(`${filename} passes schema validation`, () => {
      const content = readFileSync(join(scenarioDir, filename), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      const result = ScenarioPresetYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
    })
  }

  it("all 6 presets have unique IDs", () => {
    const ids = expectedFiles.map((f) => {
      const content = readFileSync(join(scenarioDir, f), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      return parsed.id as string
    })
    expect(new Set(ids).size).toBe(6)
  })

  it("each preset has all 5 demand variables in profile", () => {
    for (const filename of expectedFiles) {
      const content = readFileSync(join(scenarioDir, filename), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      const result = ScenarioPresetYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(Object.keys(result.data.demandProfile)).toHaveLength(5)
      }
    }
  })

  it("each preset id matches its filename", () => {
    for (const filename of expectedFiles) {
      const content = readFileSync(join(scenarioDir, filename), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      const expectedId = filename.replace(".yaml", "")
      expect(parsed.id).toBe(expectedId)
    }
  })
})

// --- Failure YAML Files Validation (Story 9-7 AC-1) ---

describe("Failure YAML files validation (AC-1)", () => {
  const scenarioDir = join(__dirname, "../../../src/data/scenarios")
  const expectedFailureFiles = [
    "failure-single-node.yaml",
    "failure-network-partition.yaml",
    "failure-database.yaml",
    "failure-traffic-spike.yaml",
    "failure-region-outage.yaml",
    "failure-data-corruption.yaml",
  ]

  for (const filename of expectedFailureFiles) {
    it(`${filename} passes FailurePresetYamlSchema validation`, () => {
      const content = readFileSync(join(scenarioDir, filename), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      const result = FailurePresetYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
    })
  }

  it("all 6 failure presets have unique IDs", () => {
    const ids = expectedFailureFiles.map((f) => {
      const content = readFileSync(join(scenarioDir, f), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      return parsed.id as string
    })
    expect(new Set(ids).size).toBe(6)
  })

  it("each failure preset id matches its filename", () => {
    for (const filename of expectedFailureFiles) {
      const content = readFileSync(join(scenarioDir, filename), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      const expectedId = filename.replace(".yaml", "")
      expect(parsed.id).toBe(expectedId)
    }
  })

  it("each failure preset has at least one modifier", () => {
    for (const filename of expectedFailureFiles) {
      const content = readFileSync(join(scenarioDir, filename), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      const result = FailurePresetYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(Object.keys(result.data.failureModifiers).length).toBeGreaterThan(0)
      }
    }
  })

  it("failure YAML files do NOT pass ScenarioPresetYamlSchema (different shape)", () => {
    for (const filename of expectedFailureFiles) {
      const content = readFileSync(join(scenarioDir, filename), "utf-8")
      const parsed = load(content) as Record<string, unknown>
      const result = ScenarioPresetYamlSchema.safeParse(parsed)
      expect(result.success).toBe(false)
    }
  })
})
