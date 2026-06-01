import { useMemo } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { hasTrafficSource } from "@/services/trafficSourceInjection"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"

/**
 * Stage of the guided challenge journey (P88). The coach gives the architect ONE clear next
 * action for where they are, so a beginner is never lost: build it (tackle) → run it → watch →
 * improve it (iterate) → experiment (mastered). Complements the HUD's required-checklist (an
 * overview) with a single directive step.
 */
export type CoachMode = "tackle" | "run" | "watch" | "iterate" | "mastered"

export interface CoachState {
  mode: CoachMode
  /** Short chip label for the current stage. */
  modeLabel: string
  /** Imperative one-liner — the single next action. */
  headline: string
  /** A one-line "how / why" expanding on the headline. */
  detail: string
}

function categoryLabel(cat: string): string {
  return COMPONENT_CATEGORIES[cat as ComponentCategoryId]?.label ?? cat
}

/**
 * Derives the active challenge's coaching step from attempt lifecycle + live graph/topology +
 * the last scored result. Returns null outside challenge mode. Pure/memoized — recomputes only
 * when its inputs change.
 *
 * Priority: running → scored (iterate/celebrate) → building (ordered tackle steps → run).
 */
export function useChallengeCoach(): CoachState | null {
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const attemptState = useChallengeStore((s) => s.attemptState)
  const lastResult = useChallengeStore((s) => s.lastResult)
  const lastMeasured = useChallengeStore((s) => s.lastMeasured)
  const nodes = useArchitectureStore((s) => s.nodes)
  const topologyIssues = useArchitectureStore((s) => s.topologyIssues)

  return useMemo<CoachState | null>(() => {
    if (!challenge) return null

    // 1. RUNNING — nothing to do but read the live signal.
    if (attemptState === "running") {
      return {
        mode: "watch",
        modeLabel: "Running",
        headline: "Watch the live stats",
        detail: "Traffic is ramping up — the right-side panel shows uptime, latency and served vs target RPS.",
      }
    }

    // 2. SCORED — coach the next improvement, or celebrate a perfect run.
    if (attemptState === "scored" && lastResult) {
      if (lastResult.stars >= 3) {
        return {
          mode: "mastered",
          modeLabel: "Mastered",
          headline: "Three stars — nailed it!",
          detail: "Experiment: swap a vendor on a node (the in-node dropdown) and see if you can hold the targets for less money.",
        }
      }
      if (!lastResult.passedMetrics) {
        const latencyMiss = lastMeasured ? lastMeasured.p99LatencyMs > challenge.targetMetrics.p99LatencyMs : false
        const uptimeMiss = lastMeasured ? lastMeasured.uptimePercent < challenge.targetMetrics.uptimePercent : false
        if (latencyMiss && !uptimeMiss) {
          return {
            mode: "iterate",
            modeLabel: "Iterate",
            headline: "Cut the latency",
            detail: `p99 is over ${challenge.targetMetrics.p99LatencyMs}ms — add a cache or CDN ahead of the slow hop, or pick a lower-latency tier or vendor on the node.`,
          }
        }
        return {
          mode: "iterate",
          modeLabel: "Iterate",
          headline: "It's overloaded",
          detail: "Requests are being dropped — scale up with replicas (the −/＋ on a node) or a higher tier; a cache takes load off the database.",
        }
      }
      if (!lastResult.underBudget) {
        return {
          mode: "iterate",
          modeLabel: "Iterate",
          headline: "Trim the cost",
          detail: `Targets met! Now get under $${challenge.budgetCap}/mo — drop a tier, cut replicas, or swap to a cheaper vendor on the node.`,
        }
      }
      if (!lastResult.cleanTopology) {
        return {
          mode: "iterate",
          modeLabel: "Iterate",
          headline: "Tidy the wiring",
          detail: "Targets and budget met! Clear the remaining topology warnings for the last star — e.g. put a load balancer ahead of replicated blocks.",
        }
      }
      // Defensive fall-through (passed everything but <3 stars shouldn't happen) → treat as build-ready.
    }

    // 3. BUILDING / IDLE — ordered "tackle" steps toward a runnable architecture.
    const placed = new Set(nodes.map((n) => n.data.componentCategory))
    const orphanCount = topologyIssues.filter((i) => i.issueType === "orphan").length

    if (!hasTrafficSource(nodes)) {
      return {
        mode: "tackle",
        modeLabel: "Tackle",
        headline: "Add a traffic source",
        detail: "Requests need an origin — drag a Traffic Source onto the canvas (challenges usually pre-place one).",
      }
    }

    const firstMissing = challenge.requiredComponents.find((cat) => !placed.has(cat as ComponentCategoryId))
    if (firstMissing) {
      return {
        mode: "tackle",
        modeLabel: "Tackle",
        headline: `Add a ${categoryLabel(firstMissing)} block`,
        detail: "Drag it from the Blocks panel on the left, then wire it into the request path.",
      }
    }

    if (orphanCount > 0) {
      return {
        mode: "tackle",
        modeLabel: "Tackle",
        headline: "Wire it all together",
        detail: `${orphanCount} block${orphanCount === 1 ? "" : "s"} ${orphanCount === 1 ? "isn't" : "aren't"} connected — drag from one node's handle to another so traffic flows end-to-end.`,
      }
    }

    return {
      mode: "run",
      modeLabel: "Run it",
      headline: "Run the simulation",
      detail: "Looks wired up! Hit Run Simulation to push traffic through and earn your stars.",
    }
  }, [challenge, attemptState, lastResult, lastMeasured, nodes, topologyIssues])
}
