import { useMemo } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { computeBreakingFailures } from "@/services/failureImpact"

/**
 * Break-it loop, failure axis (P4-S4, D94): the set of Test-conditions preset ids that would BREAK
 * the current build — or null when the probe shouldn't run. Scope: quest mode, post-3★ (the same
 * D20 session unlock that frees the traffic dials). Pre-3★ the selector is locked anyway, and in
 * free play the stress-test is open-ended experimentation, not a curated hunt — no glow either way,
 * so don't burn 7 recalculations per canvas edit outside the loop.
 */
export function useFailureImpacts(): ReadonlySet<string> | null {
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const unlocked = useChallengeStore(
    (s) => isChallengeMode(s) && (s.bestStars[s.activeChallenge?.id ?? ""] ?? 0) >= 3,
  )

  return useMemo(() => {
    if (!unlocked || nodes.length === 0) return null
    return computeBreakingFailures(nodes, edges)
  }, [unlocked, nodes, edges])
}
