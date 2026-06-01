import { GraduationCap } from "lucide-react"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { ExperienceLevel } from "@/lib/componentTypes"

/**
 * Global experience-level control in the top bar (P89). One source of truth for how much detail
 * the whole app reveals — block palette, inspector, optimize panel. Mirrored in the Settings menu.
 */
const LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
]

export function ExperienceLevelControl() {
  const level = usePreferencesStore((s) => s.experienceLevel)
  const setLevel = usePreferencesStore((s) => s.setExperienceLevel)

  return (
    <div
      data-testid="experience-level-control"
      role="radiogroup"
      aria-label="Experience level"
      title="Experience level — controls how much detail the app shows. Raise it to reveal more blocks, metrics and tools."
      className="flex items-center gap-0.5 rounded-md border border-archie-border bg-surface/60 p-0.5"
    >
      <GraduationCap className="ml-1 mr-0.5 h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
      {LEVELS.map((l) => {
        const active = level === l.id
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`experience-level-${l.id}`}
            onClick={() => setLevel(l.id)}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              active
                ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40"
                : "text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
