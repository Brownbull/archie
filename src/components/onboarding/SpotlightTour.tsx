import { useState, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"

export interface TourStep {
  title: string
  body: string
  /** CSS selector of the real UI region this step spotlights. Omit for a centered step. */
  selector?: string
}

const CARD_W = 340
const CARD_H_EST = 190
const PAD = 8
const GAP = 12

/** Live bounding rect of the current step's target (recomputed on step change + resize). */
function useTargetRect(selector: string | undefined, step: number): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    // All setState happens inside `measure` (run via rAF/resize), never synchronously in the
    // effect body — the react-compiler lint flags synchronous in-effect setState as cascading.
    const measure = () => {
      if (!selector) {
        setRect(null)
        return
      }
      const el = document.querySelector(selector)
      const r = el?.getBoundingClientRect()
      setRect(r && r.width > 0 ? r : null)
    }
    const raf = window.requestAnimationFrame(measure)
    window.addEventListener("resize", measure)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("resize", measure)
    }
  }, [selector, step])
  return rect
}

/** Positions the hint card near the target (below if room, else above), clamped to the viewport. */
function cardStyle(rect: DOMRect | null): React.CSSProperties {
  if (typeof window === "undefined" || !rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const below = rect.bottom + GAP + CARD_H_EST <= vh
  const top = below ? rect.bottom + GAP : Math.max(PAD, rect.top - GAP - CARD_H_EST)
  const left = Math.min(Math.max(PAD, rect.left), vw - CARD_W - PAD)
  return { top, left }
}

/**
 * Reusable anchored spotlight tour (P89/Phase B). Dims the screen except the region each step
 * teaches and floats a hint card beside it; falls back to a centered card when a target isn't on
 * screen. Manages its own step index — remount (or change `key`) to restart at step 0. Both the
 * first-run onboarding tour (GuidedTour) and per-panel "walk me through it" tours render this.
 */
export function SpotlightTour({
  steps,
  onClose,
  ariaLabel = "Tour",
}: {
  steps: TourStep[]
  onClose: () => void
  ariaLabel?: string
}) {
  const [step, setStep] = useState(0)
  const safeStep = Math.min(step, steps.length - 1)
  const current = steps.at(safeStep)
  const rect = useTargetRect(current?.selector, safeStep)

  if (!current) return null

  const isLast = safeStep === steps.length - 1

  return (
    <div className="fixed inset-0" style={{ zIndex: 9998 }} aria-hidden={false}>
      {/* Spotlight: a transparent ring at the target whose huge box-shadow dims the rest of the
          screen. pointer-events:none so the highlighted UI stays usable; no rect → full dim. */}
      {rect ? (
        <div
          data-testid="tour-spotlight"
          className="pointer-events-none absolute rounded-lg transition-all duration-300"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 3px var(--color-cat-compute, #3b82f6), 0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
      )}

      {/* Hint card */}
      <div
        data-testid="guided-tour"
        role="dialog"
        aria-label={`${ariaLabel} step ${safeStep + 1} of ${steps.length}`}
        className="pointer-events-auto absolute rounded-lg border border-archie-border bg-panel p-4 shadow-xl"
        style={{ width: CARD_W, ...cardStyle(rect) }}
      >
        <h2 data-testid="tour-title" className="text-sm font-semibold text-text-primary">
          {current.title}
        </h2>
        <p data-testid="tour-body" className="mt-1 text-xs leading-snug text-text-secondary">
          {current.body}
        </p>

        <div className="mt-3 flex items-center gap-1" data-testid="tour-progress" aria-label={`Step ${safeStep + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <span key={s.title} className={`h-1.5 flex-1 rounded-full ${i <= safeStep ? "bg-blue-500" : "bg-archie-border"}`} />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" data-testid="tour-skip" onClick={onClose}>
            Skip
          </Button>
          <div className="flex gap-2">
            {safeStep > 0 && (
              <Button variant="ghost" size="sm" data-testid="tour-back" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" data-testid="tour-done" onClick={onClose}>
                Done
              </Button>
            ) : (
              <Button size="sm" data-testid="tour-next" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
