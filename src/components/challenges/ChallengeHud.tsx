import { useState } from "react"
import { Check, X as XIcon, Lightbulb } from "lucide-react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"

/**
 * Build-time challenge HUD (Epic 16): brief, budget bar (cost vs cap), required-components
 * checklist, and collapsible hints. Self-gating — renders nothing outside challenge mode.
 */
export function ChallengeHud() {
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const reset = useChallengeStore((s) => s.reset)
  const nodes = useArchitectureStore((s) => s.nodes)
  const [showHints, setShowHints] = useState(false)

  if (!challenge) return null

  const placed = new Set(nodes.map((n) => n.data.componentCategory))
  const totalCost = computeTotalArchitectureCost(nodes)
  const pct = challenge.budgetCap > 0 ? Math.min(100, (totalCost / challenge.budgetCap) * 100) : 0
  const overBudget = totalCost > challenge.budgetCap
  const budgetTier = overBudget ? "over" : pct >= 80 ? "warn" : "ok"
  const budgetColor = budgetTier === "over" ? "bg-red-500" : budgetTier === "warn" ? "bg-yellow-500" : "bg-green-500"

  return (
    <div data-testid="challenge-hud" className="absolute left-3 top-3 z-10 w-64 rounded-md border border-archie-border bg-panel/95 p-3 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">{challenge.title}</span>
        <button
          type="button"
          data-testid="challenge-exit"
          aria-label="Exit challenge"
          onClick={() => reset()}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-0.5 text-[10px] leading-snug text-text-secondary">{challenge.brief}</p>

      <div className="mt-2">
        <div className="flex justify-between text-[10px]">
          <span className="text-text-secondary">Budget</span>
          <span data-testid="challenge-budget-label" className={overBudget ? "font-semibold text-red-400" : "text-text-secondary"}>
            ${totalCost}/${challenge.budgetCap}/mo
          </span>
        </div>
        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-archie-border">
          <div data-testid="challenge-budget-bar" data-tier={budgetTier} data-over={overBudget || undefined} className={`h-full transition-all ${budgetColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-2" data-testid="challenge-checklist">
        <span className="text-[9px] uppercase tracking-wide text-text-secondary">Required</span>
        {challenge.requiredComponents.map((cat) => {
          const present = placed.has(cat as ComponentCategoryId)
          const label = COMPONENT_CATEGORIES[cat as ComponentCategoryId]?.label ?? cat
          return (
            <div key={cat} data-testid={`req-${cat}`} data-present={present || undefined} className="flex items-center gap-1 text-[11px]">
              {present ? <Check className="h-3 w-3 text-emerald-400" /> : <XIcon className="h-3 w-3 text-text-secondary" />}
              <span className={present ? "text-text-primary" : "text-text-secondary"}>{label}</span>
            </div>
          )
        })}
      </div>

      {challenge.hints.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            data-testid="challenge-hints-toggle"
            onClick={() => setShowHints((v) => !v)}
            aria-expanded={showHints}
            aria-controls="challenge-hints-list"
            className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-text-primary"
          >
            <Lightbulb className="h-3 w-3" /> Hints ({challenge.hints.length})
          </button>
          {showHints && (
            <ul id="challenge-hints-list" data-testid="challenge-hints" className="mt-1 list-disc pl-4 text-[10px] text-text-secondary">
              {challenge.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
