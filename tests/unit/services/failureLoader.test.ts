import { describe, it, expect } from "vitest"
import { getFailurePreset, getAllFailurePresets, isKnownFailurePresetId } from "@/services/failureLoader"
import { FAILURE_PRESET_IDS } from "@/lib/constants"

describe("failureLoader", () => {
  // AC-1: 6 failure presets loaded
  it("loads exactly 6 failure presets", () => {
    expect(getAllFailurePresets()).toHaveLength(6)
  })

  it("each preset has non-empty failureModifiers", () => {
    for (const preset of getAllFailurePresets()) {
      expect(Object.keys(preset.failureModifiers).length).toBeGreaterThan(0)
    }
  })

  it("preset IDs match FAILURE_PRESET_IDS constant", () => {
    const loadedIds = getAllFailurePresets().map((p) => p.id).sort()
    const expectedIds = [...FAILURE_PRESET_IDS].sort()
    expect(loadedIds).toEqual(expectedIds)
  })

  it("all multipliers are within 0.1-1.0 range", () => {
    for (const preset of getAllFailurePresets()) {
      for (const [, value] of Object.entries(preset.failureModifiers)) {
        expect(value).toBeGreaterThanOrEqual(0.1)
        expect(value).toBeLessThanOrEqual(1.0)
      }
    }
  })

  it("each preset has required fields (name, description, icon)", () => {
    for (const preset of getAllFailurePresets()) {
      expect(preset.name).toBeTruthy()
      expect(preset.description).toBeTruthy()
      expect(preset.icon).toBeTruthy()
    }
  })

  it("getFailurePreset returns preset for known ID", () => {
    const preset = getFailurePreset("failure-database")
    expect(preset).toBeDefined()
    expect(preset!.name).toBe("Database Failure")
    expect(preset!.failureModifiers["data-durability"]).toBe(0.3)
  })

  it("getFailurePreset returns undefined for unknown ID", () => {
    expect(getFailurePreset("failure-nonexistent")).toBeUndefined()
  })

  // AC-7: Enum-constrained validation
  it("isKnownFailurePresetId returns true for all known IDs", () => {
    for (const id of FAILURE_PRESET_IDS) {
      expect(isKnownFailurePresetId(id)).toBe(true)
    }
  })

  it("isKnownFailurePresetId returns false for unknown IDs", () => {
    expect(isKnownFailurePresetId("failure-unknown")).toBe(false)
    expect(isKnownFailurePresetId("")).toBe(false)
    expect(isKnownFailurePresetId("single-node")).toBe(false)
  })

  it("presets are sorted alphabetically by name", () => {
    const presets = getAllFailurePresets()
    const names = presets.map((p) => p.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })
})
