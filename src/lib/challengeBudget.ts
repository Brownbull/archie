import { MAX_BUILDABLE_PEAK_RPS } from "@/lib/constants"
import type { ChallengeTrafficSource, ChallengeUsageRates } from "@/lib/challengeTypes"
import type { TrafficCurve, TickState } from "@/lib/simulationTypes"

/**
 * Buildability budget (D71). A challenge's load is only legitimate if a player can actually BUILD a
 * passing architecture within the canvas budget (≤50 nodes, ≤20 replicas/node). The front tier ingests
 * the full peak, so the summed traffic-source peak is gated at MAX_BUILDABLE_PEAK_RPS. The challenge
 * creator uses these to disable Save/Export when over budget; the solvability harness backs it up by
 * scoring every reference solution capped at MAX_REPLICAS.
 */

/**
 * Conservative combined peak = sum of per-source peak RPS. Sources with different shapes peak at
 * different times, so the true combined peak is ≤ this sum; using the sum as the gate errs safe.
 * Empty/undefined ⇒ 0 (the challenge supplies load via the legacy traffic_curve instead).
 */
export function combinedSourcePeak(sources: ChallengeTrafficSource[] | undefined): number {
  return (sources ?? []).reduce((sum, s) => sum + s.rps, 0)
}

/** True when the summed source peak exceeds what a player can build within the canvas budget. */
export function exceedsBuildablePeak(sources: ChallengeTrafficSource[] | undefined): boolean {
  return combinedSourcePeak(sources) > MAX_BUILDABLE_PEAK_RPS
}

/** Seconds in a 30-day month — the denominator that turns a monthly cost into a per-request figure. */
export const SECONDS_PER_MONTH = 2_592_000

/** Peak demand (rps) of a traffic curve — the busiest moment the architecture must serve. */
export function peakCurveRps(curve: TrafficCurve): number {
  return curve.reduce((max, p) => Math.max(max, p.rps), 0)
}

/**
 * Cost-efficiency as $ per MILLION requests (ED7, D74): the architecture's monthly cost spread over a
 * month of traffic at the challenge's peak demand. A real, transferable unit a learner can reason
 * about — unlike the old "monthly $ ÷ ~90 seconds of served traffic", which mixed timescales and meant
 * nothing. undefined when there is no demand (peakRps ≤ 0).
 */
export function costPerMillionRequests(monthlyCost: number, peakRps: number): number | undefined {
  if (peakRps <= 0) return undefined
  return (monthlyCost * 1_000_000) / (peakRps * SECONDS_PER_MONTH)
}

/**
 * Peak ORIGIN-bound rps (EN5, D74): the served traffic a CDN does NOT absorb at the edge — totalServed
 * minus CDN hits (served × hitRatio at cdn nodes) — at the busiest tick. A higher-hit CDN absorbs more,
 * so fewer requests reach the origin and the usage bill drops. The SAME helper feeds the live scorer and
 * the solvability harness (so they bill the identical quantity). `cdnHitByNodeId` maps each CDN node id
 * to its hit ratio; non-CDN nodes are absent.
 */
export function peakOriginBoundRps(ticks: readonly TickState[], cdnHitByNodeId: ReadonlyMap<string, number>): number {
  let peak = 0
  for (const tk of ticks) {
    let absorbed = 0
    for (const nt of tk.nodes) {
      const hit = cdnHitByNodeId.get(nt.nodeId)
      if (hit !== undefined) absorbed += nt.servedRps * hit
    }
    peak = Math.max(peak, Math.max(0, tk.totalServedRps - absorbed))
  }
  return peak
}

/**
 * Monthly usage cost (EN5, D74): a per-million-requests cloud fee on the ORIGIN-bound load, added to the
 * flat capacity cost. 0 when the challenge declares no usage rates (the 57 built-ins) — so the capacity-
 * only model is byte-identical. peak-anchored (like cost_per_request), so the worst-case bill is graded.
 */
export function usageCostPerMonth(usageRates: ChallengeUsageRates | undefined, originBoundRps: number): number {
  if (!usageRates || originBoundRps <= 0) return 0
  const monthlyRequests = originBoundRps * SECONDS_PER_MONTH
  return usageRates.perMillionRequests * (monthlyRequests / 1_000_000)
}
