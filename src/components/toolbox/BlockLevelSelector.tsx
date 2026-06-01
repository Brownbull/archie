import { GraduationCap } from "lucide-react"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { BlockLevel } from "@/lib/componentTypes"

/**
 * Experience-level control for the block palette (P86 progressive disclosure). New users start at
 * `beginner` — the toolbox shows ~7 essential block types and tucks everything else into a
 * collapsed "More advanced blocks" drawer. Raising the level reveals more. Starting a challenge
 * sets the level to that challenge's difficulty; the user can still override it here.
 */
const LEVELS: { id: BlockLevel; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "Just the essentials — enough to build a basic web app (~7 blocks)" },
  { id: "intermediate", label: "Intermediate", hint: "Adds queues, search, auth, observability, serverless and more" },
  { id: "advanced", label: "Advanced", hint: "Every block, including specialized & large-scale infrastructure" },
]

export function BlockLevelSelector() {
  const level = usePreferencesStore((s) => s.blockLevel)
  const setLevel = usePreferencesStore((s) => s.setBlockLevel)
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)

  return (
    <div
      data-testid="block-level-selector"
      className="rounded-md border border-archie-border bg-surface/60 p-2"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <GraduationCap className="h-3 w-3 text-text-secondary" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          Experience level
        </span>
      </div>
      <div role="radiogroup" aria-label="Block experience level" className="grid grid-cols-3 gap-1">
        {LEVELS.map((l) => {
          const active = level === l.id
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`block-level-${l.id}`}
              title={l.hint}
              onClick={() => setLevel(l.id)}
              className={`rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                active
                  ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              {l.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-text-secondary/80">
        {activeChallenge
          ? "Set to match this challenge — raise it to unlock more blocks."
          : "Raise the level to reveal more building blocks."}
      </p>
    </div>
  )
}
