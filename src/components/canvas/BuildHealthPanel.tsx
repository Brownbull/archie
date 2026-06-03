import { useState } from "react"
import { Check, AlertCircle, Minus, Maximize2 } from "lucide-react"
import { useBuildGuidance } from "@/hooks/useBuildGuidance"
import { useChallengeStore } from "@/stores/challengeStore"

/**
 * Live build-health guidance (P6) — an always-on "Required"-style checklist for the solo
 * builder, outside challenge mode. Self-gating: hidden on an empty canvas (the Get-started
 * empty state guides there) and during a challenge (the challenge HUD owns guidance then).
 * Updates live as the graph changes (it reads the same topology issues the canvas surfaces).
 */
export function BuildHealthPanel() {
  const { checks, metCount, nodeCount } = useBuildGuidance()
  const attemptState = useChallengeStore((s) => s.attemptState)
  const [open, setOpen] = useState(true)

  // Empty canvas → the Get-started card guides; challenge active → the challenge HUD guides.
  if (nodeCount === 0 || attemptState !== "idle") return null

  const allMet = metCount === checks.length

  return (
    <div
      data-testid="build-health-panel"
      className="absolute left-3 top-14 z-10 w-60 rounded-md border border-archie-border bg-panel/95 p-2 shadow-md"
    >
      <button
        type="button"
        data-testid="build-health-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5"
      >
        {open ? <Minus className="h-3 w-3 text-text-secondary" /> : <Maximize2 className="h-3 w-3 text-text-secondary" />}
        {allMet
          ? <Check className="h-3.5 w-3.5 text-emerald-400" />
          : <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
        <span className="text-[0.8125rem] font-medium text-text-primary">Build health</span>
        <span data-testid="build-health-score" className="ml-auto text-[0.6875rem] text-text-secondary">
          {metCount}/{checks.length}
        </span>
      </button>

      {open && (
        <ul className="mt-1.5 space-y-1">
          {checks.map((c) => (
            <li key={c.id} data-testid={`guidance-${c.id}`} data-met={c.met || undefined} className="text-xs leading-snug">
              <div className="flex items-start gap-1.5">
                {c.met
                  ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />}
                <span className={c.met ? "text-text-secondary" : "text-text-primary"}>{c.label}</span>
              </div>
              {!c.met && <p className="ml-5 text-[0.6875rem] text-text-secondary">{c.nudge}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
