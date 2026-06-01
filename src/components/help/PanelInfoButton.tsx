import { useState } from "react"
import { Info, Compass } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useTourStore } from "@/stores/tourStore"
import { getPanelGuide, visiblePoints } from "@/lib/panelGuides"

/**
 * Per-panel ⓘ explainer (P89/Phase B). A small info button that opens a popover describing the
 * panel — "what it is, how to use it" — with depth scaled to the user's experience level. When the
 * guide defines a tour, a "Walk me through it" button launches a focused anchored spotlight tour.
 */
export function PanelInfoButton({
  guideId,
  side = "bottom",
  className,
}: {
  guideId: string
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}) {
  const guide = getPanelGuide(guideId)
  const level = usePreferencesStore((s) => s.experienceLevel)
  const startTour = useTourStore((s) => s.start)
  const [open, setOpen] = useState(false)

  if (!guide) return null
  const points = visiblePoints(guide, level)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={`panel-info-${guideId}`}
          aria-label={`About ${guide.title}`}
          title={`About ${guide.title}`}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary ${className ?? ""}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-72" data-testid={`panel-info-content-${guideId}`}>
        <h4 className="text-sm font-semibold text-text-primary">{guide.title}</h4>
        <p className="mt-1 text-[0.6875rem] leading-snug text-text-secondary">{guide.summary}</p>
        <ul className="mt-2 space-y-1.5">
          {points.map((p, i) => (
            <li key={i} className="flex gap-1.5 text-[0.6875rem] leading-snug text-text-secondary">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
        {guide.tour && guide.tour.length > 0 && (
          <button
            type="button"
            data-testid={`panel-info-tour-${guideId}`}
            onClick={() => {
              setOpen(false)
              // Only walk through steps whose target is actually on screen (sections hidden by
              // the current experience level are skipped, so the tour adapts to what's visible).
              // If nothing resolves (e.g. the panel isn't mounted), fall back to the full list.
              const all = guide.tour ?? []
              const present = all.filter((s) => !s.selector || document.querySelector(s.selector) != null)
              startTour(present.length > 0 ? present : all)
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-[0.6875rem] font-medium text-blue-300 hover:bg-blue-500/20"
          >
            <Compass className="h-3.5 w-3.5" />
            Walk me through it
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
