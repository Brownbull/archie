import { describe, it, expect } from "vitest"
import { getWeight } from "@/lib/weightUtils"
import { DEFAULT_WEIGHT_PROFILE, type WeightProfile } from "@/lib/constants"

describe("getWeight", () => {
  it("returns the weight for a known category", () => {
    const result = getWeight("performance", DEFAULT_WEIGHT_PROFILE)
    expect(result).toBe(1.0)
  })

  it("returns custom weight when overridden", () => {
    const weights: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE, performance: 0.5 }
    expect(getWeight("performance", weights)).toBe(0.5)
  })

  it("returns 1.0 for an unknown category not in the profile", () => {
    expect(getWeight("unknown-category", DEFAULT_WEIGHT_PROFILE)).toBe(1.0)
  })

  it("returns 0 when category weight is explicitly set to 0", () => {
    const weights: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE, performance: 0 }
    expect(getWeight("performance", weights)).toBe(0)
  })

  it("returns 1.0 for every default category", () => {
    for (const key of Object.keys(DEFAULT_WEIGHT_PROFILE) as Array<keyof WeightProfile>) {
      expect(getWeight(key, DEFAULT_WEIGHT_PROFILE)).toBe(1.0)
    }
  })

  it("returns 1.0 for any key when profile has no matching keys", () => {
    const empty = {} as WeightProfile
    expect(getWeight("performance", empty)).toBe(1.0)
  })
})
