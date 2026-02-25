import { describe, it, expect } from "vitest"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { MAX_INCOMPATIBILITY_REASON_LENGTH } from "@/lib/constants"

describe("checkCompatibility", () => {
  it("returns compatible when source is undefined", () => {
    const result = checkCompatibility(undefined, { category: "caching" })
    expect(result).toEqual({ isCompatible: true, reason: "" })
  })

  it("returns compatible when target is undefined", () => {
    const result = checkCompatibility(
      { category: "data-storage" },
      undefined,
    )
    expect(result).toEqual({ isCompatible: true, reason: "" })
  })

  it("returns compatible when both are undefined", () => {
    const result = checkCompatibility(undefined, undefined)
    expect(result).toEqual({ isCompatible: true, reason: "" })
  })

  it("returns compatible when source has no compatibility field", () => {
    const result = checkCompatibility(
      { category: "data-storage" },
      { category: "caching" },
    )
    expect(result).toEqual({ isCompatible: true, reason: "" })
  })

  it("returns compatible when source has empty compatibility record", () => {
    const result = checkCompatibility(
      { category: "data-storage", compatibility: {} },
      { category: "caching" },
    )
    expect(result).toEqual({ isCompatible: true, reason: "" })
  })

  it("returns compatible when target category is not in source compatibility", () => {
    const result = checkCompatibility(
      {
        category: "data-storage",
        compatibility: { compute: "Direct DB access from compute is discouraged" },
      },
      { category: "caching" },
    )
    expect(result).toEqual({ isCompatible: true, reason: "" })
  })

  it("returns incompatible when target category is in source compatibility", () => {
    const result = checkCompatibility(
      {
        category: "data-storage",
        compatibility: { caching: "Caching layer may cause stale reads" },
      },
      { category: "caching" },
    )
    expect(result).toEqual({
      isCompatible: false,
      reason: "Caching layer may cause stale reads",
    })
  })

  it("returns incompatible with correct reason from compatibility record", () => {
    const result = checkCompatibility(
      {
        category: "delivery-network",
        compatibility: {
          "data-storage": "Direct DB connection from CDN is unusual",
          compute: "Typically proxies, not direct compute",
        },
      },
      { category: "data-storage" },
    )
    expect(result).toEqual({
      isCompatible: false,
      reason: "Direct DB connection from CDN is unusual",
    })
  })

  describe("bidirectional checks", () => {
    it("detects incompatibility from target direction when source has no warnings", () => {
      const result = checkCompatibility(
        { category: "data-storage" }, // no compatibility field
        {
          category: "caching",
          compatibility: { "data-storage": "Cache may serve stale data to DB" },
        },
      )
      expect(result).toEqual({
        isCompatible: false,
        reason: "Cache may serve stale data to DB",
      })
    })

    it("prefers source-direction reason when both directions have warnings", () => {
      const result = checkCompatibility(
        {
          category: "data-storage",
          compatibility: { caching: "Source-side warning" },
        },
        {
          category: "caching",
          compatibility: { "data-storage": "Target-side warning" },
        },
      )
      expect(result).toEqual({
        isCompatible: false,
        reason: "Source-side warning",
      })
    })

    it("returns compatible when neither direction has warnings", () => {
      const result = checkCompatibility(
        { category: "data-storage", compatibility: {} },
        { category: "caching", compatibility: {} },
      )
      expect(result).toEqual({ isCompatible: true, reason: "" })
    })

    it("checks target.compatibility[source.category] correctly", () => {
      const result = checkCompatibility(
        { category: "compute" },
        {
          category: "delivery-network",
          compatibility: { compute: "CDN should not directly call compute" },
        },
      )
      expect(result).toEqual({
        isCompatible: false,
        reason: "CDN should not directly call compute",
      })
    })

    it("returns compatible when target has compatibility but not for source category", () => {
      const result = checkCompatibility(
        { category: "compute" },
        {
          category: "delivery-network",
          compatibility: { messaging: "Some other warning" },
        },
      )
      expect(result).toEqual({ isCompatible: true, reason: "" })
    })

    it("handles target with empty compatibility record (no reverse warning)", () => {
      const result = checkCompatibility(
        { category: "compute", compatibility: {} },
        { category: "caching", compatibility: {} },
      )
      expect(result).toEqual({ isCompatible: true, reason: "" })
    })
  })

  describe("incompatibilityReason clamping (TD-4-3b AC-2)", () => {
    it("returns reason unchanged when under the max-length limit", () => {
      const shortReason = "Short reason"
      const result = checkCompatibility(
        { category: "data-storage", compatibility: { caching: shortReason } },
        { category: "caching" },
      )
      expect(result.reason).toBe(shortReason)
    })

    it("truncates reason with ellipsis when over limit (source direction)", () => {
      const longReason = "x".repeat(MAX_INCOMPATIBILITY_REASON_LENGTH + 100)
      const result = checkCompatibility(
        { category: "data-storage", compatibility: { caching: longReason } },
        { category: "caching" },
      )
      expect(result.reason).toBe(longReason.slice(0, MAX_INCOMPATIBILITY_REASON_LENGTH) + "…")
    })

    it("truncates reason with ellipsis when over limit (target direction)", () => {
      const longReason = "y".repeat(MAX_INCOMPATIBILITY_REASON_LENGTH + 50)
      const result = checkCompatibility(
        { category: "compute" },
        { category: "caching", compatibility: { compute: longReason } },
      )
      expect(result.reason).toBe(longReason.slice(0, MAX_INCOMPATIBILITY_REASON_LENGTH) + "…")
    })

    it("does not truncate reason at exact MAX_INCOMPATIBILITY_REASON_LENGTH boundary", () => {
      const exactReason = "z".repeat(MAX_INCOMPATIBILITY_REASON_LENGTH)
      const result = checkCompatibility(
        { category: "data-storage", compatibility: { caching: exactReason } },
        { category: "caching" },
      )
      expect(result.reason).toHaveLength(MAX_INCOMPATIBILITY_REASON_LENGTH)
      expect(result.reason).toBe(exactReason)
    })

    it("returns incompatible with empty reason when compatibility value is empty string", () => {
      const result = checkCompatibility(
        { category: "data-storage", compatibility: { caching: "" } },
        { category: "caching" },
      )
      expect(result).toEqual({ isCompatible: false, reason: "" })
    })
  })
})
