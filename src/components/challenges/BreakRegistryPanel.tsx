import { useMemo } from "react"
import { X as XIcon, Wrench, BookOpen, Check, Minus } from "lucide-react"
import { useUiStore } from "@/stores/uiStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { breakMethodLabel } from "@/engine/breakDetection"
import { breakMethodApplicability } from "@/services/breakProbe"
import { getAllChallenges } from "@/services/challengeLoader"
import { componentLibrary } from "@/services/componentLibrary"

/**
 * D102 — the break-knowledge registry (right panel). Every WAY you've ever broken a system:
 * where it was first earned, how many systems it's confirmed against, and — probed live against
 * the CURRENT build each time the panel opens — whether it would fell this quest too. Opened from
 * the Expert chip while in break mode (post-3★).
 */
export function BreakRegistryPanel() {
  const open = useUiStore((s) => s.breakRegistryOpen)
  const setOpen = useUiStore((s) => s.setBreakRegistryOpen)
  const methods = useUserProgressStore((s) => s.breakMethods)
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)

  const titleById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of getAllChallenges()) m.set(c.id, c.title)
    return m
  }, [])

  // Live applicability — recomputed on every open against the build as it stands (owner spec).
  const applicability = useMemo(() => {
    if (!open || !challenge) return null
    return breakMethodApplicability(nodes, edges, challenge)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed to open: the probe runs per
    // panel OPEN, not per canvas keystroke (≤9 sims each open).
  }, [open, challenge])

  if (!open) return null

  const entries = Object.entries(methods).sort((a, b) => a[1].earnedAt - b[1].earnedAt)

  const appliesHere = (methodId: string): boolean | null => {
    if (!challenge) return null
    if (methodId.startsWith("resilience-")) {
      const cond = methodId.slice("resilience-".length)
      return (challenge.resilienceConditions ?? []).includes(cond)
    }
    if (methodId === "pool-exhaustion") {
      // applies when the current build carries concurrency-capped tiers (the mechanic exists here)
      return nodes.some((n) => {
        const comp = componentLibrary.getComponent(n.data.archieComponentId)
        const v = comp?.configVariants.find((cv) => cv.id === n.data.activeConfigVariantId)
        return (v?.concurrencyLimit ?? 0) > 0
      })
    }
    return applicability ? (applicability[methodId] ?? null) : null
  }

  return (
    <div
      data-testid="break-registry-panel"
      className="absolute right-55 top-4 z-20 flex max-h-[70vh] w-80 flex-col rounded-lg border border-orange-500/30 bg-[#0a0e14]/95 shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-archie-border/60 px-3 py-2.5">
        <BookOpen className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-bold text-orange-200">Break registry</span>
        <span className="text-[0.625rem] text-text-secondary">{entries.length} way{entries.length === 1 ? "" : "s"} known</span>
        <button
          type="button"
          data-testid="break-registry-close"
          aria-label="Close the break registry"
          onClick={() => setOpen(false)}
          className="ml-auto rounded p-0.5 text-text-secondary hover:text-text-primary"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="px-3 py-4 text-xs text-text-secondary">
          No ways earned yet. Break a 3★ build — find the load boundary, prove a dial is causal, or
          survive a Test condition — and the way is yours, once, forever.
        </p>
      ) : (
        <div className="overflow-y-auto">
          {entries.map(([methodId, entry]) => {
            const applies = appliesHere(methodId)
            return (
              <div key={methodId} data-testid={`registry-method-${methodId}`} className="border-b border-archie-border/40 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-3 w-3 text-orange-400" />
                  <span className="text-xs font-semibold text-text-primary">{breakMethodLabel(methodId)}</span>
                  {applies !== null && (
                    <span
                      data-testid={`registry-applies-${methodId}`}
                      data-applies={applies || undefined}
                      className={`ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-semibold ${
                        applies ? "bg-orange-500/15 text-orange-300" : "bg-surface text-text-secondary"
                      }`}
                    >
                      {applies ? <><Check className="h-2.5 w-2.5" /> would fell this build</> : <><Minus className="h-2.5 w-2.5" /> this build shrugs it off</>}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[0.625rem] text-text-secondary">
                  Earned on {titleById.get(entry.challengeId) ?? entry.challengeId} ·{" "}
                  {new Date(entry.earnedAt).toLocaleDateString()} · confirmed on {Object.keys(entry.confirmedOn).length} system{Object.keys(entry.confirmedOn).length === 1 ? "" : "s"}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
