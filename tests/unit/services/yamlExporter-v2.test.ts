import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { DEFAULT_WEIGHT_PROFILE, type WeightProfile } from "@/lib/constants"
import { isDefaultWeightProfile } from "@/lib/constants"
import { makeNode, makeEdge } from "../../helpers"

describe("yamlExporter v2 — weight profile export", () => {
  const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql" } })]
  const edges = [makeEdge({ id: "e1", source: "n1", target: "n1" })]

  describe("AC-1: Export with non-default weights", () => {
    it("includes weight_profile section when any weight differs from default", () => {
      const customProfile: WeightProfile = {
        ...DEFAULT_WEIGHT_PROFILE,
        performance: 0.8,
      }

      const result = exportArchitecture(nodes, edges, customProfile)
      const parsed = load(result) as Record<string, unknown>

      expect(parsed).toHaveProperty("weight_profile")
      const wp = parsed.weight_profile as Record<string, number>
      expect(wp.performance).toBe(0.8)
    })

    it("includes all 7 category weights in weight_profile", () => {
      const customProfile: WeightProfile = {
        ...DEFAULT_WEIGHT_PROFILE,
        scalability: 0.5,
      }

      const result = exportArchitecture(nodes, edges, customProfile)
      const parsed = load(result) as { weight_profile: Record<string, number> }

      expect(Object.keys(parsed.weight_profile)).toHaveLength(7)
    })
  })

  describe("AC-2: Export omits default weights", () => {
    it("omits weight_profile when all weights are default (1.0)", () => {
      const result = exportArchitecture(nodes, edges, { ...DEFAULT_WEIGHT_PROFILE })
      const parsed = load(result) as Record<string, unknown>

      expect(parsed).not.toHaveProperty("weight_profile")
    })

    it("omits weight_profile when no weightProfile argument is passed", () => {
      const result = exportArchitecture(nodes, edges)
      const parsed = load(result) as Record<string, unknown>

      expect(parsed).not.toHaveProperty("weight_profile")
    })
  })

  describe("isDefaultWeightProfile helper (AC-ARCH-PATTERN-1)", () => {
    it("returns true for exact default profile", () => {
      expect(isDefaultWeightProfile({ ...DEFAULT_WEIGHT_PROFILE })).toBe(true)
    })

    it("returns false when any weight differs", () => {
      const modified = { ...DEFAULT_WEIGHT_PROFILE, performance: 0.5 }
      expect(isDefaultWeightProfile(modified)).toBe(false)
    })

    it("handles floating-point near-default within epsilon", () => {
      // 1.0 + tiny floating-point drift should still be considered default
      const nearDefault: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE }
      ;(nearDefault as Record<string, number>).performance = 1.0000001
      expect(isDefaultWeightProfile(nearDefault)).toBe(true)
    })

    it("returns false when weight is 0.0", () => {
      const zeroed = { ...DEFAULT_WEIGHT_PROFILE, performance: 0 }
      expect(isDefaultWeightProfile(zeroed)).toBe(false)
    })
  })
})
