import { MAX_BUILDABLE_PEAK_RPS } from "@/lib/constants"
import type { ChallengeTrafficSource } from "@/lib/challengeTypes"
import type { TrafficCurve } from "@/lib/simulationTypes"

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
