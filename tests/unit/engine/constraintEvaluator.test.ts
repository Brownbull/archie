import { describe, it, expect } from "vitest"
import {
  evaluateConstraints,
  evaluateNodeConstraints,
} from "@/engine/constraintEvaluator"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"
import type { CategoryScore } from "@/engine/dashboardCalculator"
import type { Constraint, MetricCategoryId, ConstraintOperator } from "@/lib/constants"

// --- Test Helpers ---

let constraintCounter = 0

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  constraintCounter++
  return {
    id: `constraint-${constraintCounter}`,
    categoryId: "performance" as MetricCategoryId,
    operator: "lte" as ConstraintOperator,
    threshold: 5,
    label: `Test Constraint ${constraintCounter}`,
    ...overrides,
  }
}

function makeCategoryScore(
  categoryId: string,
  score: number,
  hasData = true,
): CategoryScore {
  return {
    categoryId: categoryId as MetricCategoryId,
    categoryName: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    score,
    metricCount: hasData ? 5 : 0,
    hasData,
  }
}

function makeArchitectureScores(entries: Array<{ id: string; score: number; hasData?: boolean }>): CategoryScore[] {
  return entries.map((e) => makeCategoryScore(e.id, e.score, e.hasData ?? true))
}

function makePerNodeScores(nodes: Record<string, Array<{ id: string; score: number; hasData?: boolean }>>): Map<string, CategoryScore[]> {
  const map = new Map<string, CategoryScore[]>()
  for (const [nodeId, entries] of Object.entries(nodes)) {
    map.set(nodeId, entries.map((e) => makeCategoryScore(e.id, e.score, e.hasData ?? true)))
  }
  return map
}

// --- evaluateConstraints ---

describe("evaluateConstraints", () => {
  it("returns empty array when no constraints provided (5.1)", () => {
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "performance", score: 8 }],
    })
    const archScores = makeArchitectureScores([{ id: "performance", score: 8 }])

    const result = evaluateConstraints([], archScores, perNodeScores)

    expect(result).toEqual([])
  })

  it("detects lte violation when score exceeds threshold (5.2)", () => {
    const constraint = makeConstraint({
      categoryId: "cost-efficiency",
      operator: "lte",
      threshold: 4,
    })
    const archScores = makeArchitectureScores([{ id: "cost-efficiency", score: 7.5 }])
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "cost-efficiency", score: 7.5 }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      constraintId: constraint.id,
      nodeId: "node-1",
      categoryId: "cost-efficiency",
      actualScore: 7.5,
      threshold: 4,
      operator: "lte",
    })
  })

  it("passes lte when score equals threshold (5.3 — boundary)", () => {
    const constraint = makeConstraint({
      categoryId: "performance",
      operator: "lte",
      threshold: 4,
    })
    const archScores = makeArchitectureScores([{ id: "performance", score: 4 }])
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "performance", score: 4 }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(0)
  })

  it("passes lte when score is below threshold (5.3)", () => {
    const constraint = makeConstraint({
      categoryId: "performance",
      operator: "lte",
      threshold: 4,
    })
    const archScores = makeArchitectureScores([{ id: "performance", score: 3.5 }])
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "performance", score: 3.5 }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(0)
  })

  it("detects gte violation when score is below threshold (5.4)", () => {
    const constraint = makeConstraint({
      categoryId: "reliability",
      operator: "gte",
      threshold: 6,
    })
    const archScores = makeArchitectureScores([{ id: "reliability", score: 3 }])
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "reliability", score: 3 }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      categoryId: "reliability",
      actualScore: 3,
      threshold: 6,
      operator: "gte",
    })
  })

  it("passes gte when score equals threshold (boundary)", () => {
    const constraint = makeConstraint({
      categoryId: "reliability",
      operator: "gte",
      threshold: 6,
    })
    const archScores = makeArchitectureScores([{ id: "reliability", score: 6 }])
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "reliability", score: 6 }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(0)
  })

  it("handles multiple constraints with mixed violations (5.5)", () => {
    const constraints = [
      makeConstraint({ categoryId: "performance", operator: "lte", threshold: 5 }),
      makeConstraint({ categoryId: "reliability", operator: "gte", threshold: 7 }),
      makeConstraint({ categoryId: "security", operator: "lte", threshold: 8 }),
    ]
    const archScores = makeArchitectureScores([
      { id: "performance", score: 6 },  // violated (lte 5, actual 6)
      { id: "reliability", score: 5 },  // violated (gte 7, actual 5)
      { id: "security", score: 7 },     // passes (lte 8, actual 7)
    ])
    const perNodeScores = makePerNodeScores({
      "node-1": [
        { id: "performance", score: 6 },
        { id: "reliability", score: 5 },
        { id: "security", score: 7 },
      ],
    })

    const result = evaluateConstraints(constraints, archScores, perNodeScores)

    expect(result).toHaveLength(2)
    const violatedCategories = result.map((v) => v.categoryId).sort()
    expect(violatedCategories).toEqual(["performance", "reliability"])
  })

  it("attributes per-node violations to correct nodeIds (5.6)", () => {
    const constraint = makeConstraint({
      categoryId: "performance",
      operator: "lte",
      threshold: 5,
    })
    const archScores = makeArchitectureScores([{ id: "performance", score: 6 }])
    const perNodeScores = makePerNodeScores({
      "node-a": [{ id: "performance", score: 7 }],  // violated
      "node-b": [{ id: "performance", score: 4 }],  // passes
      "node-c": [{ id: "performance", score: 6 }],  // violated
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(2)
    const violatedNodes = result.map((v) => v.nodeId).sort()
    expect(violatedNodes).toEqual(["node-a", "node-c"])
  })

  it("returns no violations for empty architecture (5.10)", () => {
    const constraint = makeConstraint({
      categoryId: "performance",
      operator: "lte",
      threshold: 5,
    })
    const archScores: CategoryScore[] = []
    const perNodeScores = new Map<string, CategoryScore[]>()

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(0)
  })

  it("skips constraints for categories with no data (Task 1.7)", () => {
    const constraint = makeConstraint({
      categoryId: "security",
      operator: "gte",
      threshold: 5,
    })
    // Architecture-wide says security has no data
    const archScores = makeArchitectureScores([
      { id: "security", score: 0, hasData: false },
    ])
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "security", score: 0, hasData: false }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(0)
  })

  it("skips node scores with no data even if architecture-wide has data", () => {
    const constraint = makeConstraint({
      categoryId: "performance",
      operator: "lte",
      threshold: 5,
    })
    const archScores = makeArchitectureScores([{ id: "performance", score: 8 }])
    const perNodeScores = makePerNodeScores({
      "node-1": [{ id: "performance", score: 8 }],
      "node-2": [{ id: "performance", score: 0, hasData: false }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    // Only node-1 is checked (node-2 has no data for performance)
    expect(result).toHaveLength(1)
    expect(result[0].nodeId).toBe("node-1")
  })

  it("produces correct ConstraintViolation shape", () => {
    const constraint = makeConstraint({
      id: "c-shape-test",
      categoryId: "scalability",
      operator: "gte",
      threshold: 7,
      label: "Min Scalability",
    })
    const archScores = makeArchitectureScores([{ id: "scalability", score: 4 }])
    const perNodeScores = makePerNodeScores({
      "node-x": [{ id: "scalability", score: 4 }],
    })

    const result = evaluateConstraints([constraint], archScores, perNodeScores)

    expect(result).toHaveLength(1)
    const violation: ConstraintViolation = result[0]
    expect(violation).toEqual({
      constraintId: "c-shape-test",
      nodeId: "node-x",
      categoryId: "scalability",
      actualScore: 4,
      threshold: 7,
      operator: "gte",
    })
  })

  it("handles multiple nodes with multiple constraints", () => {
    const constraints = [
      makeConstraint({ categoryId: "performance", operator: "lte", threshold: 6 }),
      makeConstraint({ categoryId: "reliability", operator: "gte", threshold: 5 }),
    ]
    const archScores = makeArchitectureScores([
      { id: "performance", score: 7 },
      { id: "reliability", score: 4 },
    ])
    const perNodeScores = makePerNodeScores({
      "node-1": [
        { id: "performance", score: 8 },  // violated lte 6
        { id: "reliability", score: 6 },  // passes gte 5
      ],
      "node-2": [
        { id: "performance", score: 5 },  // passes lte 6
        { id: "reliability", score: 3 },  // violated gte 5
      ],
    })

    const result = evaluateConstraints(constraints, archScores, perNodeScores)

    expect(result).toHaveLength(2)
    const violations = result.map((v) => ({ nodeId: v.nodeId, categoryId: v.categoryId }))
    expect(violations).toContainEqual({ nodeId: "node-1", categoryId: "performance" })
    expect(violations).toContainEqual({ nodeId: "node-2", categoryId: "reliability" })
  })
})

// --- evaluateNodeConstraints ---

describe("evaluateNodeConstraints", () => {
  it("returns empty array when no constraints", () => {
    const scores = [makeCategoryScore("performance", 8)]

    const result = evaluateNodeConstraints("node-1", scores, [])

    expect(result).toEqual([])
  })

  it("returns violations for single node only", () => {
    const constraint = makeConstraint({
      categoryId: "performance",
      operator: "lte",
      threshold: 5,
    })
    const scores = [makeCategoryScore("performance", 7)]

    const result = evaluateNodeConstraints("node-42", scores, [constraint])

    expect(result).toHaveLength(1)
    expect(result[0].nodeId).toBe("node-42")
    expect(result[0].actualScore).toBe(7)
  })

  it("skips constraints for categories not in node scores", () => {
    const constraint = makeConstraint({
      categoryId: "security",
      operator: "gte",
      threshold: 5,
    })
    const scores = [makeCategoryScore("performance", 8)]

    const result = evaluateNodeConstraints("node-1", scores, [constraint])

    expect(result).toHaveLength(0)
  })

  it("skips categories with no data", () => {
    const constraint = makeConstraint({
      categoryId: "performance",
      operator: "lte",
      threshold: 5,
    })
    const scores = [makeCategoryScore("performance", 0, false)]

    const result = evaluateNodeConstraints("node-1", scores, [constraint])

    expect(result).toHaveLength(0)
  })

  it("handles multiple constraints against single node", () => {
    const constraints = [
      makeConstraint({ categoryId: "performance", operator: "lte", threshold: 5 }),
      makeConstraint({ categoryId: "reliability", operator: "gte", threshold: 7 }),
      makeConstraint({ categoryId: "security", operator: "lte", threshold: 9 }),
    ]
    const scores = [
      makeCategoryScore("performance", 6),  // violated
      makeCategoryScore("reliability", 4),  // violated
      makeCategoryScore("security", 8),     // passes
    ]

    const result = evaluateNodeConstraints("node-1", scores, constraints)

    expect(result).toHaveLength(2)
    const violatedCategories = result.map((v) => v.categoryId).sort()
    expect(violatedCategories).toEqual(["performance", "reliability"])
  })
})
