import { describe, it, expect } from "vitest"
import { checkCompatibility } from "@/engine/compatibilityChecker"

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
})
