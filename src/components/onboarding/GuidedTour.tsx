import { useState, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"
import { usePreferencesStore } from "@/stores/preferencesStore"

interface TourStep {
  title: string
  body: string
  /** CSS selector of the real UI region this step spotlights. Omit for a centered step. */
  selector?: string
}

// Each step (after Welcome) anchors to a DISTINCT region so the hint appears *next to* the thing
// it describes — left toolbox, the start card, the canvas, the top overlay bar, the top-right
// selectors, the bottom dashboard — instead of all landing in one modal.
const STEPS: TourStep[] = [
  {
    title: "Welcome to Archie",
    body: "A 30-second tour. Design a software architecture and watch it scored live across performance, reliability, scale, ops, and cost.",
  },
  {
    title: "Three ways to start",
    body: "Build from scratch (one block at a time), drop a ready-made Stack, load a full Blueprint, or take a Challenge. Everything starts here.",
    selector: '[data-testid="canvas-empty-state"]',
  },
  {
    title: "Build with blocks",
    body: "Each block is a type (Cache, Database, Load Balancer…). Drag one onto the canvas or hit +. You pick the exact vendor afterward.",
    selector: '[data-testid="toolbox"]',
  },
  {
    title: "Configure & connect",
    body: "Drop a block here, then click it to open the inspector (swap provider, pick a tier, set replicas). Drag from a node's side handles to wire it to others.",
    selector: '[data-testid="canvas"]',
  },
  {
    title: "Recolor & analyze",
    body: "Switch overlay modes (Alt+1–5) to recolour the canvas by Cost, Performance, Tier, and more — spot the weak spots at a glance.",
    selector: '[data-testid="overlay-selector"]',
  },
  {
    title: "Stress-test it",
    body: "Pick a demand Scenario or inject a Failure up here, then Run Simulation to watch traffic flow and see where it breaks.",
    selector: '[data-testid="scenario-selector"]',
  },
  {
    title: "Score & challenge",
    body: "Live scores update down here as you build. Take a Challenge to hit target metrics under a budget — attempts are saved to History.",
    selector: '[data-testid="dashboard"]',
  },
]

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
 * First-run guided tour (P6, anchored). A short, restartable, non-blocking spotlight walkthrough:
 * each step dims the screen except the region it's teaching and floats a hint card beside it.
 * Auto-shows once (gated on the persisted `tourSeen` flag); "Restart tour" in Settings clears it.
 * Falls back to a centered card when a target isn't on screen, so it never breaks.
 */
export function GuidedTour() {
  const tourSeen = usePreferencesStore((s) => s.tourSeen)
  const setTourSeen = usePreferencesStore((s) => s.setTourSeen)
  const [step, setStep] = useState(0)

  // Reset to the first step whenever the tour (re)opens. Adjust state during render (not an effect).
  const [prevTourSeen, setPrevTourSeen] = useState(tourSeen)
  if (tourSeen !== prevTourSeen) {
    setPrevTourSeen(tourSeen)
    if (!tourSeen) setStep(0)
  }

  const current = STEPS.at(step) ?? STEPS[0]
  const rect = useTargetRect(current.selector, step)

  if (tourSeen) return null

  const isLast = step === STEPS.length - 1
  const finish = () => setTourSeen(true)

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
        aria-label={`Tour step ${step + 1} of ${STEPS.length}`}
        className="pointer-events-auto absolute rounded-lg border border-archie-border bg-panel p-4 shadow-xl"
        style={{ width: CARD_W, ...cardStyle(rect) }}
      >
        <h2 data-testid="tour-title" className="text-sm font-semibold text-text-primary">
          {current.title}
        </h2>
        <p data-testid="tour-body" className="mt-1 text-xs leading-snug text-text-secondary">
          {current.body}
        </p>

        <div className="mt-3 flex items-center gap-1" data-testid="tour-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s.title} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-blue-500" : "bg-archie-border"}`} />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" data-testid="tour-skip" onClick={finish}>
            Skip
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" data-testid="tour-back" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" data-testid="tour-done" onClick={finish}>
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
