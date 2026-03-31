import { describe, it, expect } from "vitest"
import {
  DEMAND_VARIABLE_VALUES,
  DEMAND_LEVEL_VALUES,
  DEMAND_MULTIPLIER_MIN,
  DEMAND_MULTIPLIER_MAX,
  type DemandVariable,
} from "@/lib/constants"
import {
  DEMAND_VARIABLES,
  DEMAND_LEVEL_METADATA,
  getValidLevelsForVariable,
  type DemandResponse,
  type DemandProfile,
  type ScenarioPreset,
} from "@/lib/demandTypes"

// --- Constants ---

describe("Demand Variable Constants", () => {
  it("defines exactly 5 demand variables", () => {
    expect(DEMAND_VARIABLE_VALUES).toHaveLength(5)
  })

  it("contains the expected variable IDs", () => {
    expect(DEMAND_VARIABLE_VALUES).toContain("traffic-volume")
    expect(DEMAND_VARIABLE_VALUES).toContain("data-size")
    expect(DEMAND_VARIABLE_VALUES).toContain("concurrent-users")
    expect(DEMAND_VARIABLE_VALUES).toContain("geographic-spread")
    expect(DEMAND_VARIABLE_VALUES).toContain("burst-pattern")
  })

  it("defines demand levels covering all possible values", () => {
    expect(DEMAND_LEVEL_VALUES.length).toBeGreaterThanOrEqual(10)
    // General levels
    expect(DEMAND_LEVEL_VALUES).toContain("low")
    expect(DEMAND_LEVEL_VALUES).toContain("medium")
    expect(DEMAND_LEVEL_VALUES).toContain("high")
    expect(DEMAND_LEVEL_VALUES).toContain("extreme")
    // Geographic-specific levels
    expect(DEMAND_LEVEL_VALUES).toContain("single-region")
    expect(DEMAND_LEVEL_VALUES).toContain("multi-region")
    expect(DEMAND_LEVEL_VALUES).toContain("global")
    // Burst-specific levels
    expect(DEMAND_LEVEL_VALUES).toContain("steady")
    expect(DEMAND_LEVEL_VALUES).toContain("periodic-spikes")
    expect(DEMAND_LEVEL_VALUES).toContain("unpredictable")
  })

  it("sets multiplier floor at 0.1", () => {
    expect(DEMAND_MULTIPLIER_MIN).toBe(0.1)
  })

  it("sets multiplier ceiling at 1.0", () => {
    expect(DEMAND_MULTIPLIER_MAX).toBe(1.0)
  })
})

// --- Metadata ---

describe("DEMAND_VARIABLES metadata", () => {
  it("has exactly 5 entries matching DEMAND_VARIABLE_VALUES", () => {
    expect(DEMAND_VARIABLES).toHaveLength(5)
    const ids = DEMAND_VARIABLES.map((v) => v.id)
    for (const varId of DEMAND_VARIABLE_VALUES) {
      expect(ids).toContain(varId)
    }
  })

  it("each variable has required metadata fields", () => {
    for (const variable of DEMAND_VARIABLES) {
      expect(variable.id).toBeTruthy()
      expect(variable.name).toBeTruthy()
      expect(variable.description).toBeTruthy()
      expect(variable.iconName).toBeTruthy()
      expect(variable.levels.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("traffic-volume uses general levels (low/medium/high/extreme)", () => {
    const tv = DEMAND_VARIABLES.find((v) => v.id === "traffic-volume")!
    expect(tv.levels).toEqual(["low", "medium", "high", "extreme"])
  })

  it("geographic-spread uses variable-specific levels", () => {
    const gs = DEMAND_VARIABLES.find((v) => v.id === "geographic-spread")!
    expect(gs.levels).toEqual(["single-region", "multi-region", "global"])
  })

  it("burst-pattern uses variable-specific levels", () => {
    const bp = DEMAND_VARIABLES.find((v) => v.id === "burst-pattern")!
    expect(bp.levels).toEqual(["steady", "periodic-spikes", "unpredictable"])
  })
})

describe("DEMAND_LEVEL_METADATA", () => {
  it("covers every level in DEMAND_LEVEL_VALUES", () => {
    for (const level of DEMAND_LEVEL_VALUES) {
      expect(DEMAND_LEVEL_METADATA[level]).toBeDefined()
      expect(DEMAND_LEVEL_METADATA[level].label).toBeTruthy()
      expect(typeof DEMAND_LEVEL_METADATA[level].numericOrder).toBe("number")
    }
  })

  it("general levels have ascending numeric order", () => {
    expect(DEMAND_LEVEL_METADATA["low"].numericOrder).toBeLessThan(DEMAND_LEVEL_METADATA["medium"].numericOrder)
    expect(DEMAND_LEVEL_METADATA["medium"].numericOrder).toBeLessThan(DEMAND_LEVEL_METADATA["high"].numericOrder)
    expect(DEMAND_LEVEL_METADATA["high"].numericOrder).toBeLessThan(DEMAND_LEVEL_METADATA["extreme"].numericOrder)
  })

  it("geographic levels have ascending numeric order", () => {
    expect(DEMAND_LEVEL_METADATA["single-region"].numericOrder).toBeLessThan(DEMAND_LEVEL_METADATA["multi-region"].numericOrder)
    expect(DEMAND_LEVEL_METADATA["multi-region"].numericOrder).toBeLessThan(DEMAND_LEVEL_METADATA["global"].numericOrder)
  })

  it("burst levels have ascending numeric order", () => {
    expect(DEMAND_LEVEL_METADATA["steady"].numericOrder).toBeLessThan(DEMAND_LEVEL_METADATA["periodic-spikes"].numericOrder)
    expect(DEMAND_LEVEL_METADATA["periodic-spikes"].numericOrder).toBeLessThan(DEMAND_LEVEL_METADATA["unpredictable"].numericOrder)
  })
})

// --- Helper Functions ---

describe("getValidLevelsForVariable", () => {
  it("returns 4 levels for traffic-volume", () => {
    expect(getValidLevelsForVariable("traffic-volume")).toEqual(["low", "medium", "high", "extreme"])
  })

  it("returns 3 levels for geographic-spread", () => {
    expect(getValidLevelsForVariable("geographic-spread")).toEqual(["single-region", "multi-region", "global"])
  })

  it("returns 3 levels for burst-pattern", () => {
    expect(getValidLevelsForVariable("burst-pattern")).toEqual(["steady", "periodic-spikes", "unpredictable"])
  })

  it("returns empty array for unknown variable", () => {
    expect(getValidLevelsForVariable("unknown" as DemandVariable)).toEqual([])
  })
})

// --- Type Smoke Tests ---

describe("Demand type shapes", () => {
  it("DemandResponse allows partial nested records", () => {
    const response: DemandResponse = {
      "traffic-volume": {
        high: { performance: 0.7, reliability: 0.8 },
      },
    }
    expect(response["traffic-volume"]?.high?.performance).toBe(0.7)
  })

  it("DemandProfile requires all 5 variables", () => {
    const profile: DemandProfile = {
      "traffic-volume": "high",
      "data-size": "medium",
      "concurrent-users": "low",
      "geographic-spread": "single-region",
      "burst-pattern": "steady",
    }
    expect(Object.keys(profile)).toHaveLength(5)
  })

  it("ScenarioPreset has expected shape", () => {
    const preset: ScenarioPreset = {
      id: "test",
      name: "Test",
      description: "A test preset",
      icon: "Zap",
      demandProfile: {
        "traffic-volume": "high",
        "data-size": "medium",
        "concurrent-users": "low",
        "geographic-spread": "single-region",
        "burst-pattern": "steady",
      },
    }
    expect(preset.id).toBe("test")
    expect(preset.demandProfile["traffic-volume"]).toBe("high")
  })
})
