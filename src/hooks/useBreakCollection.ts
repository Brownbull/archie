import { useEffect, useRef, useState } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import {
  detectSingleAttributeBreak,
  isNewBreak,
  remainingBreakAttributes,
  type BreakAttribute,
} from "@/engine/breakDetection"
import type { StarBreakdown } from "@/lib/challengeTypes"

/** What the just-scored run broke, for the results modal to celebrate. */
export interface BreakOutcome {
  attribute: BreakAttribute
  /** True when THIS run newly collected the attribute (paid 1 expert unit); false on a repeat. */
  fresh: boolean
  /** Attributes still uncollected for this challenge after this run, in display order. */
  remaining: BreakAttribute[]
}

/**
 * The break-it loop's collector (P4-S3, D94). Once a quest is 3★'d IN-SESSION — the D20 unlock that
 * frees the traffic dials AND routes the canvas demand into re-runs (simulationLaunch) — a failed
 * re-run with exactly ONE traffic attribute deviating from the authored spec is a BREAK: collect it
 * (+1 expert currency via userProgressStore, once per attribute per challenge) and report the
 * outcome. The session-3★ gate matters: pre-3★ the sim runs the AUTHORED demand regardless of the
 * canvas (an imported deviation would be graded on demand it never produced), so a "break" there
 * would be fiction. Detection reads the already-scored breakdown — scoring itself never changes (D66).
 */
export function useBreakCollection(): BreakOutcome | null {
  const attemptState = useChallengeStore((s) => s.attemptState)
  const lastResult = useChallengeStore((s) => s.lastResult)
  const userId = useCurrentUserId()
  const handledRef = useRef<StarBreakdown | null>(null)
  const [outcome, setOutcome] = useState<BreakOutcome | null>(null)

  useEffect(() => {
    // All state updates ride a microtask continuation: the effect body only reads stores and kicks
    // off the (already-async) payout, so no synchronous setState can cascade renders.
    let next: BreakOutcome | null = null

    if (attemptState === "scored" && lastResult && handledRef.current !== lastResult) {
      handledRef.current = lastResult // one collection per scored result
      const { activeChallenge, bestStars } = useChallengeStore.getState()
      // Dials unlock at the session 3★ (D20) — below that it's not a break context.
      if (activeChallenge && (bestStars[activeChallenge.id] ?? 0) >= 3) {
        const nodes = useArchitectureStore.getState().nodes
        const attribute = detectSingleAttributeBreak(nodes, activeChallenge, lastResult)
        if (attribute) {
          const progress = useUserProgressStore.getState()
          const record = progress.breaksByChallenge[activeChallenge.id]
          const fresh = isNewBreak(record, attribute) && !!userId
          if (fresh) void progress.collectBreak(userId, activeChallenge.id, attribute)
          next = { attribute, fresh, remaining: remainingBreakAttributes({ ...record, [attribute]: true }) }
        }
      }
    } else if (attemptState === "scored") {
      return // same result already handled (or nothing scored yet) — keep the displayed outcome
    }

    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) setOutcome(next)
    })
    return () => {
      cancelled = true
    }
  }, [attemptState, lastResult, userId])

  return outcome
}
