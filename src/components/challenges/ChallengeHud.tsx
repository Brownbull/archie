import { useState } from "react"
import { Check, X as XIcon, Minus, Maximize2 } from "lucide-react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"
import { ChallengeCoach } from "@/components/challenges/ChallengeCoach"
import { HintPanel } from "@/components/challenges/HintPanel"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function ChallengeHud() {
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const reset = useChallengeStore((s) => s.reset)
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const [minimized, setMinimized] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)

  if (!challenge) return null

  const placed = new Set(nodes.map((n) => n.data.componentCategory))
  // D74: on-path cost — the HUD budget readout excludes disconnected blocks, matching the scored cost.
  const totalCost = computeTotalArchitectureCost(nodes, edges)
  const pct = challenge.budgetCap > 0 ? Math.min(100, (totalCost / challenge.budgetCap) * 100) : 0
  const overBudget = totalCost > challenge.budgetCap
  const budgetTier = overBudget ? "over" : pct >= 80 ? "warn" : "ok"
  const budgetColor = budgetTier === "over" ? "bg-red-500" : budgetTier === "warn" ? "bg-yellow-500" : "bg-green-500"

  return (
    <>
      <div data-testid="challenge-hud" className="absolute left-3 top-3 z-10 w-72 rounded-lg border border-archie-border bg-panel/95 shadow-lg">
        {/* Header — always visible */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-base font-bold text-text-primary">{challenge.title}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMinimized((v) => !v)}
              className="flex h-5 w-5 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
              title={minimized ? "Expand" : "Minimize"}
            >
              {minimized ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </button>
            <button
              type="button"
              data-testid="challenge-exit"
              onClick={() => setConfirmExit(true)}
              className="flex h-5 w-5 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-red-400"
              title="Exit quest"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Collapsible content */}
        {!minimized && (
          <div className="border-t border-archie-border px-3 pb-3 pt-2">
            <p className="text-[0.8125rem] leading-relaxed text-text-secondary">{challenge.brief}</p>

            <ChallengeCoach />

            <div className="mt-3">
              <div className="flex justify-between text-[0.75rem]">
                <span className="text-text-secondary">Budget</span>
                <span data-testid="challenge-budget-label" className={overBudget ? "font-semibold text-red-400" : "text-text-secondary"}>
                  ${totalCost} of ${challenge.budgetCap}/mo
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-archie-border">
                <div data-testid="challenge-budget-bar" data-tier={budgetTier} data-over={overBudget || undefined}
                  className={`h-full transition-all ${budgetColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="mt-3" data-testid="challenge-checklist">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-secondary">Required</span>
              {challenge.requiredComponents.map((cat) => {
                const present = placed.has(cat as ComponentCategoryId)
                const label = COMPONENT_CATEGORIES[cat as ComponentCategoryId]?.label ?? cat
                return (
                  <div key={cat} data-testid={`req-${cat}`} data-present={present || undefined} className="flex items-center gap-1.5 text-[0.8125rem]">
                    {present ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <XIcon className="h-3.5 w-3.5 text-text-secondary" />}
                    <span className={present ? "text-text-primary" : "text-text-secondary"}>{label}</span>
                  </div>
                )
              })}
            </div>

            <HintPanel />
          </div>
        )}
      </div>

      {/* Confirm exit dialog */}
      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exit Quest?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave "{challenge.title}"? Your canvas will be kept, but the quest progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmExit(false)}>
              Go Back
            </Button>
            <Button variant="destructive" size="sm" onClick={() => { setConfirmExit(false); reset() }}>
              Exit Quest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
