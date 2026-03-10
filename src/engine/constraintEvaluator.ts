import type { Constraint, ConstraintOperator, MetricCategoryId } from "@/lib/constants"
import type { CategoryScore } from "@/engine/dashboardCalculator"

// --- Types ---

export interface ConstraintViolation {
  constraintId: string
  nodeId: string
  categoryId: MetricCategoryId
  actualScore: number
  threshold: number
  operator: ConstraintOperator
}

// --- Private Helpers ---

/**
 * Returns true when the actual score violates the constraint threshold.
 * - lte: "must be ≤ threshold" → violated when actualScore > threshold
 * - gte: "must be ≥ threshold" → violated when actualScore < threshold
 * Score AT threshold is NOT a violation for either operator.
 */
function isViolated(operator: ConstraintOperator, actualScore: number, threshold: number): boolean {
  if (operator === "lte") return actualScore > threshold
  if (operator === "gte") return actualScore < threshold
  // Exception: DEV-only diagnostic logging (TD-6-2a AC-2)
  if (import.meta.env.DEV) {
    console.warn(`[constraintEvaluator] Unknown operator "${operator}" — returning false (not violated)`)
  }
  return false
}

// --- Pure Functions ---

/**
 * Evaluates all constraints against per-node weighted category scores.
 * Returns an array of violations attributed to specific nodes (AC-3).
 *
 * Two-tier hasData filtering: skips categories with no architecture-wide data
 * (categoryDataMap), then skips per-node scores with no data. This differs from
 * evaluateNodeConstraints which only checks per-node hasData — single-node
 * evaluation should not rely on an aggregate signal.
 *
 * Pure function — no React, Zustand, or side effects (AC-ARCH-NO-1).
 *
 * @param constraints - Active constraint definitions
 * @param weightedCategoryScores - Architecture-wide weighted scores (used to skip categories with no data)
 * @param perNodeScores - Per-node weighted category scores
 * @returns Array of ConstraintViolation for each node/constraint combination that violates
 */
export function evaluateConstraints(
  constraints: Constraint[],
  weightedCategoryScores: CategoryScore[],
  perNodeScores: Map<string, CategoryScore[]>,
): ConstraintViolation[] {
  if (constraints.length === 0) return []

  // Build lookup for categories that have data (architecture-wide)
  const categoryDataMap = new Map<string, boolean>()
  for (const cs of weightedCategoryScores) {
    categoryDataMap.set(cs.categoryId, cs.hasData)
  }

  const violations: ConstraintViolation[] = []

  for (const [nodeId, nodeScores] of perNodeScores) {
    const scoreMap = new Map<string, CategoryScore>()
    for (const ns of nodeScores) {
      scoreMap.set(ns.categoryId, ns)
    }

    for (const constraint of constraints) {
      // Skip constraints for categories with no data at architecture level (Task 1.7)
      if (categoryDataMap.get(constraint.categoryId) === false) continue

      const nodeScore = scoreMap.get(constraint.categoryId)
      if (!nodeScore || !nodeScore.hasData) continue

      if (isViolated(constraint.operator, nodeScore.score, constraint.threshold)) {
        violations.push({
          constraintId: constraint.id,
          nodeId,
          categoryId: constraint.categoryId,
          actualScore: nodeScore.score,
          threshold: constraint.threshold,
          operator: constraint.operator,
        })
      }
    }
  }

  return violations
}

/**
 * Evaluates constraints for a single node's category scores.
 * Used by canvas/heatmap layer to check individual nodes (Task 2).
 *
 * Pure function — no React, Zustand, or side effects.
 */
export function evaluateNodeConstraints(
  nodeId: string,
  nodeScores: CategoryScore[],
  constraints: Constraint[],
): ConstraintViolation[] {
  if (constraints.length === 0) return []

  const scoreMap = new Map<string, CategoryScore>()
  for (const ns of nodeScores) {
    scoreMap.set(ns.categoryId, ns)
  }

  const violations: ConstraintViolation[] = []

  for (const constraint of constraints) {
    const score = scoreMap.get(constraint.categoryId)
    if (!score || !score.hasData) continue

    if (isViolated(constraint.operator, score.score, constraint.threshold)) {
      violations.push({
        constraintId: constraint.id,
        nodeId,
        categoryId: constraint.categoryId,
        actualScore: score.score,
        threshold: constraint.threshold,
        operator: constraint.operator,
      })
    }
  }

  return violations
}
