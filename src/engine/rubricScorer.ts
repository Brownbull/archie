import type { SimulationStats } from "@/lib/simulationStats"
import type { Challenge, StarBreakdown } from "@/lib/challengeTypes"
import { evaluateRequiredTopology, allTopologyAssertionsPass, type TopologyGraphInput } from "@/engine/topologyAssertions"

/**
 * Scores a challenge attempt against its rubric (Epic 16, D28).
 * - Base pass (1★): uptime ≥ target AND p99 latency ≤ target. ISAPivot Phase 3 adds two OPTIONAL gates,
 *   folded into the same metrics star: p95 ≤ target (when authored) and cost-per-request ≤ target (when
 *   authored). Absent on the 41 built-ins ⇒ skipped ⇒ identical scoring.
 * - +1★: total cost ≤ budgetCap.
 * - +1★: zero topology issues.
 * Budget and topology stars are only awarded when the base pass is met (roadmap "pass → 1★ then +1/+1").
 * The breakdown booleans report the RAW conditions (for display), independent of the gate.
 *
 * @param costPerRequest measured cost-efficiency (monthly cost ÷ requests served), derived by the
 *   caller at score time. undefined when unmeasured — a defined cost target then fails conservatively.
 * @param topologyGraph the attempt's frozen structural graph (node-id→type + edges) for
 *   required_topology assertions (D66). undefined ⇒ a challenge WITH assertions fails conservatively;
 *   the 41 built-ins declare no assertions so they never reach that branch.
 */
export function evaluateAttempt(
  stats: SimulationStats,
  challenge: Challenge,
  topologyIssueCount: number,
  totalCost: number,
  canvasTypeIds?: ReadonlySet<string>,
  costPerRequest?: number,
  topologyGraph?: TopologyGraphInput,
): StarBreakdown {
  const tm = challenge.targetMetrics
  const passedMetrics =
    stats.uptimePercent >= tm.uptimePercent &&
    stats.p99LatencyMs <= tm.p99LatencyMs &&
    (tm.p95LatencyMs === undefined
      || (stats.p95LatencyMs !== undefined && stats.p95LatencyMs <= tm.p95LatencyMs)) &&
    (tm.costPerRequest === undefined
      || (costPerRequest !== undefined && costPerRequest <= tm.costPerRequest))
  const underBudget = totalCost <= challenge.budgetCap
  const cleanTopology = topologyIssueCount === 0

  // required_topology (ISAPivot Phase 3, D66): empty/absent ⇒ true (identity — the 41 built-ins).
  // Present but no frozen graph ⇒ conservative fail. Folded into the clean-topology star below.
  const requiredTopologyOk = !challenge.requiredTopology?.length
    ? true
    : !!topologyGraph && allTopologyAssertionsPass(evaluateRequiredTopology(topologyGraph, challenge.requiredTopology))

  // required_types: the key blocks the challenge is designed to teach MUST be on the canvas.
  // Missing a required type blocks all stars — you can't pass without the right architecture.
  const hasAllRequiredTypes = challenge.requiredTypes.length === 0
    || (canvasTypeIds ? challenge.requiredTypes.every((t) => canvasTypeIds.has(t)) : true)

  // forbidden_types (ISAPivot Phase 3): any forbidden type on the canvas is a hard 0★ gate. Absent
  // forbiddenTypes (the 41 built-ins) ⇒ hasForbidden false ⇒ forbiddenTypesOk true ⇒ basePass unchanged.
  const hasForbidden = !!challenge.forbiddenTypes?.length
    && !!canvasTypeIds
    && challenge.forbiddenTypes.some((t) => canvasTypeIds.has(t))
  const forbiddenTypesOk = !hasForbidden

  const basePass = passedMetrics && hasAllRequiredTypes && forbiddenTypesOk
  // The topology star requires BOTH zero issues AND all required_topology assertions (D66).
  // For the 41 built-ins requiredTopologyOk is always true, so this equals the prior cleanTopology gate.
  const topologyStar = cleanTopology && requiredTopologyOk
  const stars = basePass ? 1 + (underBudget ? 1 : 0) + (topologyStar ? 1 : 0) : 0

  return {
    stars: stars as StarBreakdown["stars"],
    passedMetrics,
    hasRequiredBlocks: hasAllRequiredTypes,
    underBudget,
    cleanTopology,
    forbiddenTypesOk,
    requiredTopologyOk,
  }
}
