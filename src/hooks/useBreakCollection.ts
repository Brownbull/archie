import { useEffect, useRef, useState } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import {
  breakMethodId,
  detectSingleAttributeBreak,
  diffTrafficAttributes,
  isNewBreak,
  remainingBreakAttributes,
  type BreakAttribute,
} from "@/engine/breakDetection"
import { minBreakingRps, isCategoricalCausal, rawTrafficRps } from "@/services/breakProbe"
import { questBreakDials } from "@/lib/challengeBreakDials"
import type { StarBreakdown } from "@/lib/challengeTypes"

/** What the just-scored run broke (or failed to credit), for the results modal. */
export interface BreakOutcome {
  /** D101/D102: collected pays (registry-new method); known = the way already lives in your
   *  registry — no pay, the quest is confirmed onto the method; overshoot = rps break past 2×
   *  the boundary; not-causal = the categorical dial didn't make the difference. */
  verdict: "collected" | "known" | "overshoot" | "not-causal"
  attribute: BreakAttribute
  /** True when THIS run newly collected the attribute (paid 1 expert unit); false on a repeat. */
  fresh: boolean
  /** Attributes still uncollected for this challenge after this run, in display order. */
  remaining: BreakAttribute[]
  /** For a collected rps break: the discovered failure boundary (earned knowledge). */
  boundary?: number
  /** For a known-way break (D102): where the method was first earned. */
  earnedOnChallengeId?: string
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
      // Dials unlock at the session 3★ (D20) — below that it's not a break context. Origin gate
      // (review #2): only BUILTIN quests mint expert currency — a self-authored quest with a
      // trivially-breakable spec would otherwise be a currency printer. Mirrors awardXp.
      if (activeChallenge && activeChallenge.origin === "builtin" && (bestStars[activeChallenge.id] ?? 0) >= 3) {
        const { nodes, edges } = useArchitectureStore.getState()
        const authored = activeChallenge.trafficSources ?? []
        // D101 (owner fork 2026-06-11): single-source quests get the v2 economy — precision-gated
        // rps breaks + causal (combination-allowed) categorical breaks. Multi-source quests keep
        // the legacy exactly-one-attribute rule (positional restore is ambiguous across sources).
        if (authored.length === 1 && !lastResult.passedMetrics) {
          const diff = diffTrafficAttributes(nodes, authored)
          const cats = (["kind", "workload", "origin"] as const).filter((a) => diff.has(a))
          let verdict: BreakOutcome["verdict"] | null = null
          let attribute: BreakAttribute | null = null
          let boundary: number | undefined
          if (diff.size === 1 && diff.has("rps")) {
            attribute = "rps"
            const b = minBreakingRps(nodes, edges, activeChallenge)
            // null = probe couldn't bracket (drift) — collect, never punish on drift.
            if (b === null || rawTrafficRps(nodes) <= 2 * b) {
              verdict = "collected"
              boundary = b ?? undefined
            } else {
              verdict = "overshoot"
            }
          } else if (cats.length === 1 && (diff.size === 1 || (diff.size === 2 && diff.has("rps")))) {
            attribute = cats[0]
            verdict = isCategoricalCausal(nodes, edges, activeChallenge, cats[0]) ? "collected" : "not-causal"
          }
          // Quest-level economy (2026-06-11): a dial outside the quest's collectible set never
          // pays nor reports — the ledger's slot count IS the quest's expert ceiling.
          if (attribute && !questBreakDials(activeChallenge.id).includes(attribute)) {
            verdict = null
            attribute = null
          }
          if (verdict && attribute) {
            const progress = useUserProgressStore.getState()
            const record = progress.breaksByChallenge[activeChallenge.id]
            if (verdict === "collected") {
              // D102: money is METHOD-scoped, once game-wide. A registry-new way pays (+1) and is
              // recorded with provenance; a KNOWN way pays nothing but confirms this quest onto the
              // method ("as you already know"). Per-quest dial COVERAGE records either way.
              const methodId = breakMethodId(attribute, nodes)
              const knownEntry = progress.breakMethods[methodId]
              if (userId && isNewBreak(record, attribute)) void progress.collectBreak(userId, activeChallenge.id, attribute)
              if (!knownEntry) {
                const fresh = !!userId
                if (fresh) void progress.collectBreakMethod(userId, methodId, activeChallenge.id)
                next = { verdict: "collected", attribute, fresh, boundary, remaining: remainingBreakAttributes({ ...record, [attribute]: true }, questBreakDials(activeChallenge.id)) }
              } else {
                if (userId) void progress.confirmBreakMethod(userId, methodId, activeChallenge.id)
                next = { verdict: "known", attribute, fresh: false, boundary, earnedOnChallengeId: knownEntry.challengeId, remaining: remainingBreakAttributes({ ...record, [attribute]: true }, questBreakDials(activeChallenge.id)) }
              }
            } else {
              next = { verdict, attribute, fresh: false, remaining: remainingBreakAttributes(record, questBreakDials(activeChallenge.id)) }
            }
          }
        } else {
          const attribute = detectSingleAttributeBreak(nodes, activeChallenge, lastResult)
          if (attribute) {
            const progress = useUserProgressStore.getState()
            const record = progress.breaksByChallenge[activeChallenge.id]
            const methodId = breakMethodId(attribute, nodes)
            const knownEntry = progress.breakMethods[methodId]
            if (userId && isNewBreak(record, attribute)) void progress.collectBreak(userId, activeChallenge.id, attribute)
            if (!knownEntry) {
              const fresh = !!userId
              if (fresh) void progress.collectBreakMethod(userId, methodId, activeChallenge.id)
              next = { verdict: "collected", attribute, fresh, remaining: remainingBreakAttributes({ ...record, [attribute]: true }, questBreakDials(activeChallenge.id)) }
            } else {
              if (userId) void progress.confirmBreakMethod(userId, methodId, activeChallenge.id)
              next = { verdict: "known", attribute, fresh: false, earnedOnChallengeId: knownEntry.challengeId, remaining: remainingBreakAttributes({ ...record, [attribute]: true }, questBreakDials(activeChallenge.id)) }
            }
          }
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
