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

  // Structural signature (review #3): the probe's inputs are component/variant/replica identity and
  // wiring — NOT positions. Node drags replace the nodes array every frame; memoizing on array
  // identity would re-run 7 recalculations per drag tick. Key on what the heatmap actually reads.
  const signature = useMemo(
    () =>
      nodes.map((n) => `${n.id}:${n.data.archieComponentId}:${n.data.activeConfigVariantId}:${n.data.replicaCount ?? 1}`).join("|") +
      "//" +
      edges.map((e) => `${e.source}>${e.target}`).join("|"),
    [nodes, edges],
  )

  return useMemo(() => {
    if (!unlocked || nodes.length === 0) return null
    return computeBreakingFailures(nodes, edges)
    // signature IS nodes+edges structurally: a render where the arrays changed but the signature
    // didn't (a drag) must NOT re-probe — that's the whole point of the structural key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, signature])
}
