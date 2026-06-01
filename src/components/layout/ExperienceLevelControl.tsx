import { GraduationCap, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { ExperienceLevel } from "@/lib/componentTypes"

/**
 * Global experience-level control in the top bar (P89 → compact dropdown in P95). One source of
 * truth for how much detail the whole app reveals — block palette, inspector, optimize panel.
 * Mirrored in the Settings menu.
 */
const LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
]

export function ExperienceLevelControl() {
  const level = usePreferencesStore((s) => s.experienceLevel)
  const setLevel = usePreferencesStore((s) => s.setExperienceLevel)
  const current = LEVELS.find((l) => l.id === level) ?? LEVELS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="experience-level-control"
          aria-label={`Experience level: ${current.label}`}
          title="Experience level — controls how much detail the app shows. Raise it to reveal more blocks, metrics and tools."
          className="flex items-center gap-1 rounded-md border border-archie-border bg-surface/60 px-2 py-1 text-[0.6875rem] font-medium text-text-secondary hover:text-text-primary"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span className="text-text-primary">{current.label}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="experience-level-menu">
        <DropdownMenuLabel>Experience level</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={level} onValueChange={(v) => setLevel(v as ExperienceLevel)}>
          {LEVELS.map((l) => (
            <DropdownMenuRadioItem key={l.id} value={l.id} data-testid={`experience-level-${l.id}`}>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
