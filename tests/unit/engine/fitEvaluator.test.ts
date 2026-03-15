import { describe, it, expect } from "vitest"
import { evaluateFit, evaluateFitBatch } from "@/engine/fitEvaluator"
import type { DataContextItem } from "@/lib/constants"

// --- Test Helpers ---

function makeItem(overrides?: Partial<DataContextItem>): DataContextItem {
  return {
    id: "test-item-1",
    name: "User Sessions",
    accessPattern: "read-heavy",
    averageSize: "medium",
    structureType: "simple-kv",
    ...overrides,
  }
}

// --- Tests ---

describe("evaluateFit", () => {
  describe("fallback behavior (no data)", () => {
    it("returns trade-off when dataFitProfile is undefined", () => {
      const result = evaluateFit(makeItem(), undefined)
      expect(result.level).toBe("trade-off")
      expect(result.explanation).toContain("No compatibility data")
      expect(result.factors).toHaveLength(0)
    })

    it("returns trade-off when dataFitProfile is empty object", () => {
      const result = evaluateFit(makeItem(), {})
      expect(result.level).toBe("trade-off")
      expect(result.factors).toHaveLength(0)
    })
  })

  describe("great-fit (all positive)", () => {
    it("returns great-fit when all 3 dimensions are positive", () => {
      const profile = {
        "read-heavy": "great",
        medium: "good",
        "simple-kv": "great",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("great-fit")
      expect(result.factors).toHaveLength(3)
      expect(result.factors.every((f) => f.compatibility === "positive")).toBe(true)
    })
  })

  describe("good-fit (positive + neutral, no negative)", () => {
    it("returns good-fit with 2 positive + 1 neutral", () => {
      const profile = {
        "read-heavy": "great",
        medium: "neutral",
        "simple-kv": "good",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("good-fit")
    })

    it("returns good-fit with 1 positive + 2 neutral", () => {
      const profile = {
        "read-heavy": "good",
        medium: "neutral",
        "simple-kv": "neutral",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("good-fit")
    })
  })

  describe("trade-off (mixed positive + negative)", () => {
    it("returns trade-off with 1 positive + 1 neutral + 1 negative", () => {
      const profile = {
        "read-heavy": "great",
        medium: "neutral",
        "simple-kv": "poor",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("trade-off")
    })

    it("returns trade-off with 2 positive + 1 negative", () => {
      const profile = {
        "read-heavy": "great",
        medium: "good",
        "simple-kv": "incompatible",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("trade-off")
    })

    it("returns trade-off when all dimensions are neutral", () => {
      const profile = {
        "read-heavy": "neutral",
        medium: "neutral",
        "simple-kv": "neutral",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("trade-off")
    })
  })

  describe("poor-fit (negative, no positive)", () => {
    it("returns poor-fit with 2 negative + 1 neutral", () => {
      const profile = {
        "read-heavy": "poor",
        medium: "neutral",
        "simple-kv": "incompatible",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("poor-fit")
    })

    it("returns poor-fit with 1 negative + 2 neutral (missing keys)", () => {
      const profile = {
        "read-heavy": "poor",
        // medium and simple-kv not in profile → neutral
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("poor-fit")
    })
  })

  describe("risky (all negative)", () => {
    it("returns risky when all 3 dimensions are negative", () => {
      const profile = {
        "read-heavy": "poor",
        medium: "incompatible",
        "simple-kv": "poor",
      }
      const result = evaluateFit(makeItem(), profile)
      expect(result.level).toBe("risky")
      expect(result.factors).toHaveLength(3)
      expect(result.factors.every((f) => f.compatibility === "negative")).toBe(true)
    })
  })

  describe("FitResult shape", () => {
    it("includes level, explanation, and factors array", () => {
      const profile = { "read-heavy": "great", medium: "good", "simple-kv": "great" }
      const result = evaluateFit(makeItem(), profile)
      expect(result).toHaveProperty("level")
      expect(result).toHaveProperty("explanation")
      expect(result).toHaveProperty("factors")
      expect(typeof result.explanation).toBe("string")
      expect(result.explanation.length).toBeGreaterThan(0)
    })

    it("factors contain dimension, compatibility, and detail", () => {
      const profile = { "read-heavy": "great", medium: "poor", "simple-kv": "neutral" }
      const result = evaluateFit(makeItem(), profile)
      for (const factor of result.factors) {
        expect(factor).toHaveProperty("dimension")
        expect(factor).toHaveProperty("compatibility")
        expect(factor).toHaveProperty("detail")
        expect(["positive", "neutral", "negative"]).toContain(factor.compatibility)
      }
    })

    it("maps dimension names to human-readable labels", () => {
      const profile = { "read-heavy": "great", medium: "good", "simple-kv": "great" }
      const result = evaluateFit(makeItem(), profile)
      const dimensionNames = result.factors.map((f) => f.dimension)
      expect(dimensionNames).toContain("Access Pattern")
      expect(dimensionNames).toContain("Data Size")
      expect(dimensionNames).toContain("Structure Type")
    })
  })

  describe("unknown/missing values", () => {
    it("treats unknown compatibility string as neutral", () => {
      const profile = {
        "read-heavy": "unknown-value",
        medium: "great",
        "simple-kv": "great",
      }
      const result = evaluateFit(makeItem(), profile)
      const accessFactor = result.factors.find((f) => f.dimension === "Access Pattern")
      expect(accessFactor?.compatibility).toBe("neutral")
    })

    it("treats missing dimension key as neutral with detail message", () => {
      const profile = {
        "read-heavy": "great",
        // medium not present
        "simple-kv": "great",
      }
      const result = evaluateFit(makeItem(), profile)
      const sizeFactor = result.factors.find((f) => f.dimension === "Data Size")
      expect(sizeFactor?.compatibility).toBe("neutral")
      expect(sizeFactor?.detail).toBe("No data available")
    })
  })

  describe("different variants produce different results", () => {
    it("same item against two profiles yields different FitLevels", () => {
      const item = makeItem()
      const goodProfile = { "read-heavy": "great", medium: "great", "simple-kv": "great" }
      const badProfile = { "read-heavy": "poor", medium: "incompatible", "simple-kv": "poor" }

      const goodResult = evaluateFit(item, goodProfile)
      const badResult = evaluateFit(item, badProfile)

      expect(goodResult.level).toBe("great-fit")
      expect(badResult.level).toBe("risky")
      expect(goodResult.level).not.toBe(badResult.level)
    })
  })

  describe("performance (NFR13)", () => {
    it("evaluates 10 items within 200ms", () => {
      const profile = { "read-heavy": "great", medium: "good", "simple-kv": "great" }
      const items = Array.from({ length: 10 }, (_, i) =>
        makeItem({ id: `item-${i}`, name: `Item ${i}` }),
      )

      const start = performance.now()
      for (const item of items) {
        evaluateFit(item, profile)
      }
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(200)
    })
  })
})

describe("evaluateFitBatch", () => {
  it("returns results for all items", () => {
    const profile = { "read-heavy": "great", medium: "good", "simple-kv": "great" }
    const items = [
      makeItem({ id: "1", name: "A" }),
      makeItem({ id: "2", name: "B", accessPattern: "write-heavy" }),
    ]
    const results = evaluateFitBatch(items, profile)
    expect(results).toHaveLength(2)
  })

  it("returns empty array for empty items", () => {
    const results = evaluateFitBatch([], { "read-heavy": "great" })
    expect(results).toHaveLength(0)
  })
})
