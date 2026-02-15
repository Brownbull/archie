import { describe, it, expect } from "vitest"
import {
  evaluateTier,
  formatCategoryName,
  type TierNodeSummary,
  type TierCategoryScore,
} from "@/engine/tierEvaluator"
import { DEFAULT_TIER_DEFINITIONS } from "@/lib/tierDefinitions"
import type { TierDefinition } from "@/lib/tierDefinitions"

// --- Helpers ---

function makeNodes(
  categories: string[],
): TierNodeSummary[] {
  return categories.map((cat, i) => ({
    id: `node-${i}`,
    category: cat,
  }))
}

function makeScores(
  scores: Record<string, { score: number; hasData: boolean }>,
): TierCategoryScore[] {
  return Object.entries(scores).map(([id, { score, hasData }]) => ({
    categoryId: id,
    score,
    hasData,
  }))
}

// --- Edge Cases ---

describe("evaluateTier — edge cases", () => {
  it("returns null for empty nodes", () => {
    const result = evaluateTier([], [], DEFAULT_TIER_DEFINITIONS)
    expect(result).toBeNull()
  })

  it("returns null for empty tier definitions", () => {
    const nodes = makeNodes(["compute", "compute", "compute"])
    expect(evaluateTier(nodes, [], [])).toBeNull()
  })

  it("returns null when no tier requirements are met", () => {
    // Only 1 node, 1 category — Foundation needs 3 nodes + 2 categories
    const nodes = makeNodes(["compute"])
    const result = evaluateTier(nodes, [], DEFAULT_TIER_DEFINITIONS)
    expect(result).toBeNull()
  })

  it("returns null when nodes are provided but fewer than any tier requires", () => {
    const nodes = makeNodes(["compute", "data-storage"]) // 2 nodes, 2 categories
    const result = evaluateTier(nodes, [], DEFAULT_TIER_DEFINITIONS)
    expect(result).toBeNull()
  })
})

// --- Foundation Tier ---

describe("evaluateTier — Foundation tier", () => {
  it("qualifies with exactly 3 components from 2 categories", () => {
    const nodes = makeNodes(["compute", "compute", "data-storage"])
    const result = evaluateTier(nodes, [], DEFAULT_TIER_DEFINITIONS)

    expect(result).not.toBeNull()
    expect(result!.tierId).toBe("foundation")
    expect(result!.tierName).toBe("Foundation")
    expect(result!.tierIndex).toBe(0)
    expect(result!.totalTiers).toBe(3)
    expect(result!.tierColor).toBe("bg-amber-700")
    expect(result!.tierTextColor).toBe("text-amber-100")
    expect(result!.isMaxTier).toBe(false)
  })

  it("includes next-tier gap descriptions for Production-Ready", () => {
    const nodes = makeNodes(["compute", "compute", "data-storage"])
    const result = evaluateTier(nodes, [], DEFAULT_TIER_DEFINITIONS)

    expect(result!.nextTierGaps.length).toBeGreaterThan(0)
    // Should mention needing more components (need 5, have 3)
    const componentGap = result!.nextTierGaps.find((g) =>
      g.requirementDescription.includes("component"),
    )
    expect(componentGap).toBeDefined()
  })
})

// --- Production-Ready Tier ---

describe("evaluateTier — Production-Ready tier", () => {
  it("qualifies with 5 components, 3 categories, and performance + reliability >= 5", () => {
    const nodes = makeNodes([
      "compute",
      "compute",
      "data-storage",
      "caching",
      "messaging",
    ])
    const scores = makeScores({
      performance: { score: 5.5, hasData: true },
      reliability: { score: 5.0, hasData: true },
    })

    const result = evaluateTier(nodes, scores, DEFAULT_TIER_DEFINITIONS)

    expect(result).not.toBeNull()
    expect(result!.tierId).toBe("production-ready")
    expect(result!.tierIndex).toBe(1)
    expect(result!.isMaxTier).toBe(false)
  })

  it("falls back to Foundation when performance score too low", () => {
    const nodes = makeNodes([
      "compute",
      "compute",
      "data-storage",
      "caching",
      "messaging",
    ])
    const scores = makeScores({
      performance: { score: 3.0, hasData: true },
      reliability: { score: 5.0, hasData: true },
    })

    const result = evaluateTier(nodes, scores, DEFAULT_TIER_DEFINITIONS)

    expect(result).not.toBeNull()
    expect(result!.tierId).toBe("foundation")
  })

  it("falls back to Foundation when no metric data exists (hasData=false)", () => {
    const nodes = makeNodes([
      "compute",
      "compute",
      "data-storage",
      "caching",
      "messaging",
    ])
    const scores = makeScores({
      performance: { score: 0, hasData: false },
      reliability: { score: 0, hasData: false },
    })

    const result = evaluateTier(nodes, scores, DEFAULT_TIER_DEFINITIONS)

    expect(result).not.toBeNull()
    expect(result!.tierId).toBe("foundation")
  })
})

// --- Resilient Tier ---

describe("evaluateTier — Resilient tier", () => {
  it("qualifies with 8 components, 5 categories, high scores, and monitoring present", () => {
    const nodes = makeNodes([
      "compute",
      "compute",
      "data-storage",
      "caching",
      "messaging",
      "monitoring",
      "delivery-network",
      "real-time",
    ])
    const scores = makeScores({
      performance: { score: 7.0, hasData: true },
      reliability: { score: 7.0, hasData: true },
      scalability: { score: 6.5, hasData: true },
    })

    const result = evaluateTier(nodes, scores, DEFAULT_TIER_DEFINITIONS)

    expect(result).not.toBeNull()
    expect(result!.tierId).toBe("resilient")
    expect(result!.tierIndex).toBe(2)
    expect(result!.isMaxTier).toBe(true)
    expect(result!.nextTierGaps).toHaveLength(0)
  })

  it("falls back to Production-Ready when monitoring category missing", () => {
    const nodes = makeNodes([
      "compute",
      "compute",
      "data-storage",
      "caching",
      "messaging",
      "delivery-network",
      "real-time",
      "auth-security",
    ])
    const scores = makeScores({
      performance: { score: 7.0, hasData: true },
      reliability: { score: 7.0, hasData: true },
      scalability: { score: 6.5, hasData: true },
    })

    const result = evaluateTier(nodes, scores, DEFAULT_TIER_DEFINITIONS)

    expect(result).not.toBeNull()
    expect(result!.tierId).toBe("production-ready")
  })
})

// --- Gap Descriptions ---

describe("evaluateTier — gap descriptions", () => {
  it("generates human-readable component count gap with pluralization", () => {
    // Foundation tier, next is Production-Ready (needs 5 components)
    const nodes = makeNodes(["compute", "compute", "data-storage"])
    const result = evaluateTier(nodes, [], DEFAULT_TIER_DEFINITIONS)

    const componentGap = result!.nextTierGaps.find((g) =>
      g.requirementDescription.includes("component"),
    )
    expect(componentGap).toBeDefined()
    expect(componentGap!.requirementDescription).toContain("2 more")
    expect(componentGap!.requirementDescription).toContain("components")
  })

  it("uses singular form for 1 more component", () => {
    // 4 components from 3 categories — Foundation tier, needs 1 more for Production-Ready
    const nodes = makeNodes(["compute", "data-storage", "caching", "messaging"])
    const result = evaluateTier(nodes, [], DEFAULT_TIER_DEFINITIONS)

    const componentGap = result!.nextTierGaps.find((g) =>
      g.requirementDescription.includes("component"),
    )
    expect(componentGap).toBeDefined()
    expect(componentGap!.requirementDescription).toContain("1 more")
    expect(componentGap!.requirementDescription).toContain("component")
    expect(componentGap!.requirementDescription).not.toContain("components")
  })

  it("generates category score gap descriptions", () => {
    const nodes = makeNodes([
      "compute",
      "compute",
      "data-storage",
      "caching",
      "messaging",
    ])
    const scores = makeScores({
      performance: { score: 3.8, hasData: true },
      reliability: { score: 5.0, hasData: true },
    })

    const result = evaluateTier(nodes, scores, DEFAULT_TIER_DEFINITIONS)
    // Should be Foundation (performance too low for Production-Ready)
    expect(result!.tierId).toBe("foundation")

    const perfGap = result!.nextTierGaps.find((g) =>
      g.requirementDescription.toLowerCase().includes("performance"),
    )
    expect(perfGap).toBeDefined()
    expect(perfGap!.requirementDescription).toContain("5")
    expect(perfGap!.requirementDescription).toContain("3.8")
  })

  it("generates required categories gap descriptions", () => {
    // Enough for Production-Ready but missing monitoring for Resilient
    const nodes = makeNodes([
      "compute",
      "compute",
      "data-storage",
      "caching",
      "messaging",
      "delivery-network",
      "real-time",
      "auth-security",
    ])
    const scores = makeScores({
      performance: { score: 7.0, hasData: true },
      reliability: { score: 7.0, hasData: true },
      scalability: { score: 6.5, hasData: true },
    })

    const result = evaluateTier(nodes, scores, DEFAULT_TIER_DEFINITIONS)
    expect(result!.tierId).toBe("production-ready")

    const monitoringGap = result!.nextTierGaps.find((g) =>
      g.requirementDescription.toLowerCase().includes("monitoring"),
    )
    expect(monitoringGap).toBeDefined()
  })

  it("generates distinct categories gap description", () => {
    // 3 nodes, 2 categories — Foundation tier, next needs 3 categories
    const nodes = makeNodes(["compute", "compute", "data-storage"])
    const result = evaluateTier(nodes, [], DEFAULT_TIER_DEFINITIONS)

    const categoryGap = result!.nextTierGaps.find((g) =>
      g.requirementDescription.includes("categor"),
    )
    expect(categoryGap).toBeDefined()
  })
})

// --- Custom Definitions ---

describe("evaluateTier — custom definitions", () => {
  it("works with custom single-tier definition", () => {
    const customDefs: TierDefinition[] = [
      {
        id: "starter",
        name: "Starter",
        index: 0,
        color: "bg-blue-500",
        textColor: "text-white",
        requirements: [
          {
            type: "min_component_count",
            minCount: 1,
            description: "At least 1 component",
          },
        ],
      },
    ]

    const nodes = makeNodes(["compute"])
    const result = evaluateTier(nodes, [], customDefs)

    expect(result).not.toBeNull()
    expect(result!.tierId).toBe("starter")
    expect(result!.isMaxTier).toBe(true)
    expect(result!.totalTiers).toBe(1)
    expect(result!.nextTierGaps).toHaveLength(0)
  })
})

// --- formatCategoryName ---

describe("formatCategoryName", () => {
  it("converts kebab-case to Title Case", () => {
    expect(formatCategoryName("auth-security")).toBe("Auth Security")
  })

  it("handles single word", () => {
    expect(formatCategoryName("monitoring")).toBe("Monitoring")
  })

  it("handles multi-part kebab", () => {
    expect(formatCategoryName("delivery-network")).toBe("Delivery Network")
  })

  it("handles empty string", () => {
    expect(formatCategoryName("")).toBe("")
  })
})
