import type { SimulationStats } from "@/lib/simulationStats"
import type { Challenge, StarBreakdown } from "@/lib/challengeTypes"

/**
 * Scores a challenge attempt against its rubric (Epic 16, D28).
 * - Base pass (1★): uptime ≥ target AND p99 latency ≤ target.
 * - +1★: total cost ≤ budgetCap.
 * - +1★: zero topology issues.
 * Budget and topology stars are only awarded when the base pass is met (roadmap "pass → 1★ then +1/+1").
 * The breakdown booleans report the RAW conditions (for display), independent of the gate.
 */
export function evaluateAttempt(
  stats: SimulationStats,
  challenge: Challenge,
  topologyIssueCount: number,
  totalCost: number,
): StarBreakdown {
  const passedMetrics =
    stats.uptimePercent >= challenge.targetMetrics.uptimePercent &&
    stats.p99LatencyMs <= challenge.targetMetrics.p99LatencyMs
  const underBudget = totalCost <= challenge.budgetCap
  const cleanTopology = topologyIssueCount === 0

  const stars = passedMetrics ? 1 + (underBudget ? 1 : 0) + (cleanTopology ? 1 : 0) : 0

  return {
    stars: stars as StarBreakdown["stars"],
    passedMetrics,
    underBudget,
    cleanTopology,
  }
}
