import { MAX_BUILDABLE_PEAK_RPS } from "@/lib/constants"
import type { ChallengeTrafficSource } from "@/lib/challengeTypes"

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
