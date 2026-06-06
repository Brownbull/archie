import { describe, it, expect } from "vitest"
import { getAllChallenges } from "@/services/challengeLoader"
import { evaluateAttempt } from "@/engine/rubricScorer"
import type { SimulationStats } from "@/lib/simulationStats"
import type { ChallengeTargetMetrics, StarBreakdown } from "@/lib/challengeTypes"

/** Snapshot ONLY the legacy scoring fields — the invariant is that the 41's stars + these four
 *  booleans never change; new optional StarBreakdown booleans (Phase 3 gates) are allowed to appear. */
const legacy = (sb: StarBreakdown) => ({
  stars: sb.stars,
  passedMetrics: sb.passedMetrics,
  hasRequiredBlocks: sb.hasRequiredBlocks,
  underBudget: sb.underBudget,
  cleanTopology: sb.cleanTopology,
})

/**
 * Golden regression harness (ISAPivot Phase 3, sub-slice 3f) — the invariant proof.
 *
 * Phase 3 layers richer pass/fail criteria (p95/cost targets, required_topology, forbidden_types,
 * origin grading) onto the rubric. The non-negotiable contract: every new field is optional/defaulted
 * so the 41 built-in challenges — which declare NONE of them — score BYTE-IDENTICALLY. This snapshots
 * each built-in's StarBreakdown across a grid of fixed attempts; any Phase-3 change that alters a
 * built-in's score breaks the snapshot.
 */
function meetingStats(t: ChallengeTargetMetrics, consistencyTargetMs?: number): SimulationStats {
  return {
    uptimePercent: t.uptimePercent, // exactly meets the uptime target
    avgLatencyMs: 0,
    p99LatencyMs: t.p99LatencyMs, // exactly meets the p99 target
    // Phase 4c added optional p95 targets to some built-ins — meet them too so "all metrics met" holds.
    p95LatencyMs: t.p95LatencyMs ?? 0,
    currentRps: 0,
    servedRps: 0,
    failedRps: 0,
    totalServed: 0,
    totalFailed: 0,
    // EN4 (D74): exactly meet the consistency target (0 for the built-ins that omit it — consistencyOk is
    // then true via the absent-target branch, so this is byte-identical for them).
    maxStalenessMs: consistencyTargetMs ?? 0,
  }
}

describe("rubricScorer — golden regression across all built-in challenges (Phase 3 invariant)", () => {
  it("scores every built-in challenge identically across the attempt grid (snapshot)", () => {
    const golden = getAllChallenges()
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => {
        const stats = meetingStats(c.targetMetrics, c.consistencyTargetMs)
        const req = new Set(c.requiredTypes)
        return {
          id: c.id,
          // exactly meets metrics, at budget, clean topology, required types present → full 3★
          pass: legacy(evaluateAttempt(stats, c, 0, c.budgetCap, req)),
          // + over budget + dirty topology → base star only (probes the budget/topology gating)
          degraded: legacy(evaluateAttempt(stats, c, 4, c.budgetCap + 1, req)),
          // required types absent → 0★ when the challenge has required types, else still passes
          missingReq: legacy(evaluateAttempt(stats, c, 0, c.budgetCap, new Set<string>())),
          // metrics fail (uptime 0) → 0★ regardless of everything else
          metricsFail: legacy(evaluateAttempt({ ...stats, uptimePercent: 0 }, c, 0, c.budgetCap, req)),
        }
      })
    expect(golden).toMatchSnapshot()
  })
})
