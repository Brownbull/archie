import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

export interface TourStep {
  title: string
  body: string
  /**
   * One or more CSS selectors of UI regions this step spotlights. When multiple selectors are
   * given, each gets its own cutout and glow ring so disjoint areas both shine through the dimmed
   * backdrop. Omit for a centered (no-target) step.
   */
  selector?: string | string[]
  /**
   * When present, the Next button is disabled until this returns true. The tour polls this
   * function reactively and auto-advances once satisfied. Steps without a gate use manual Next.
   */
  gate?: () => boolean
}

const CARD_W = 340
const CARD_H_EST = 230
const PAD = 8
const GAP = 12
const GATE_POLL_MS = 400
const RING_R = 8

function normalizeSelectors(sel: string | string[] | undefined): string[] {
  if (!sel) return []
  return Array.isArray(sel) ? sel : [sel]
}

/** Live bounding rects of one or more selectors (recomputed on step change + resize). */
function useTargetRects(selectors: string[], step: number): DOMRect[] {
  const [rects, setRects] = useState<DOMRect[]>([])
  useLayoutEffect(() => {
    const measure = () => {
      if (selectors.length === 0) {
        setRects([])
        return
      }
      const result: DOMRect[] = []
      for (const sel of selectors) {
        const el = document.querySelector(sel)
        const r = el?.getBoundingClientRect()
        if (r && r.width > 0) result.push(r)
      }
      setRects(result)
    }
    const raf = window.requestAnimationFrame(measure)
    window.addEventListener("resize", measure)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("resize", measure)
    }
  }, [selectors.join(","), step])
  return rects
}

function useGateSatisfied(gate: (() => boolean) | undefined, onSatisfied: () => void): boolean {
  const [satisfied, setSatisfied] = useState(() => gate ? gate() : true)
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    if (!gate) {
      setSatisfied(true)
      return
    }
    if (gate()) {
      setSatisfied(true)
      return
    }
    setSatisfied(false)
    const id = window.setInterval(() => {
      if (gate()) {
        setSatisfied(true)
        window.clearInterval(id)
        if (!firedRef.current) {
          firedRef.current = true
          onSatisfied()
        }
      }
    }, GATE_POLL_MS)
    return () => window.clearInterval(id)
  }, [gate, onSatisfied])

  return satisfied
}

function unionRect(rects: DOMRect[]): DOMRect | null {
  if (rects.length === 0) return null
  let top = Infinity, left = Infinity, bottom = -Infinity, right = -Infinity
  for (const r of rects) {
    if (r.top < top) top = r.top
    if (r.left < left) left = r.left
    if (r.bottom > bottom) bottom = r.bottom
    if (r.right > right) right = r.right
  }
  return new DOMRect(left, top, right - left, bottom - top)
}

function cardStyle(rect: DOMRect | null): React.CSSProperties {
  if (typeof window === "undefined" || !rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const fitsBelow = rect.bottom + GAP + CARD_H_EST <= vh
  const fitsAbove = rect.top - GAP - CARD_H_EST >= PAD
  const top = fitsAbove && !fitsBelow
    ? rect.top - GAP - CARD_H_EST
    : fitsBelow
      ? rect.bottom + GAP
      : Math.max(PAD, vh - CARD_H_EST - PAD)
  const left = Math.min(Math.max(PAD, rect.left), vw - CARD_W - PAD)
  return { top, left }
}

/**
 * SVG backdrop with evenodd cutouts: a full-viewport dim with rectangular holes punched for each
 * spotlighted region. This avoids the multi-box-shadow layering problem when more than one
 * element needs a cutout.
 */
function SpotlightBackdrop({ rects }: { rects: DOMRect[] }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080
  // Outer rect (CW) + inner cutout rects (CCW for evenodd hole-punching)
  const outer = `M0,0 H${vw} V${vh} H0 Z`
  const holes = rects.map((r) => {
    const x = r.left - PAD
    const y = r.top - PAD
    const w = r.width + PAD * 2
    const h = r.height + PAD * 2
    return `M${x + RING_R},${y} H${x + w - RING_R} Q${x + w},${y} ${x + w},${y + RING_R} V${y + h - RING_R} Q${x + w},${y + h} ${x + w - RING_R},${y + h} H${x + RING_R} Q${x},${y + h} ${x},${y + h - RING_R} V${y + RING_R} Q${x},${y} ${x + RING_R},${y} Z`
  })
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" data-testid="tour-spotlight">
      <path d={[outer, ...holes].join(" ")} fillRule="evenodd" fill="rgba(0,0,0,0.55)" />
    </svg>
  )
}

/**
 * Reusable anchored spotlight tour. Dims the screen except the regions each step teaches and floats
 * a hint card beside them. Multiple selectors get independent cutouts and glow rings.
 *
 * Steps with a `gate` function are action-gated: Next is disabled and the tour auto-advances once
 * the gate returns true. Steps without a gate use manual Next.
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
  const selectors = normalizeSelectors(current?.selector)
  const rects = useTargetRects(selectors, safeStep)
  const union = unionRect(rects)

  const advance = useRef(() => setStep((s) => Math.min(s + 1, steps.length - 1)))
  const gateSatisfied = useGateSatisfied(current?.gate, advance.current)

  if (!current) return null

  const isLast = safeStep === steps.length - 1
  const gated = !!current.gate && !gateSatisfied

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 9998 }} aria-hidden={false}>
      {/* Dimmed backdrop with cutouts for spotlighted regions */}
      {rects.length > 0 ? (
        <>
          <SpotlightBackdrop rects={rects} />
          {/* Glow rings around each cutout */}
          {rects.map((r, i) => (
            <div
              key={i}
              className="pointer-events-none absolute rounded-lg transition-all duration-300"
              style={{
                top: r.top - PAD,
                left: r.left - PAD,
                width: r.width + PAD * 2,
                height: r.height + PAD * 2,
                boxShadow: "0 0 0 3px var(--color-cat-compute, #3b82f6)",
              }}
            />
          ))}
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
      )}

      {/* Hint card */}
      <div
        data-testid="guided-tour"
        role="dialog"
        aria-label={`${ariaLabel} step ${safeStep + 1} of ${steps.length}`}
        className="pointer-events-auto absolute rounded-lg border border-archie-border bg-panel p-4 shadow-xl"
        style={{ width: CARD_W, ...cardStyle(union) }}
      >
        <h2 data-testid="tour-title" className="text-sm font-semibold text-text-primary">
          {current.title}
        </h2>
        <p data-testid="tour-body" className="mt-1 text-xs leading-snug text-text-secondary">
          {current.body}
        </p>

        {gated && (
          <p data-testid="tour-gate-hint" className="mt-2 text-[0.6875rem] font-medium text-blue-400">
            ↑ Do it now — the tour advances when you complete this step
          </p>
        )}

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
              <Button size="sm" data-testid="tour-next" disabled={gated} onClick={() => setStep((s) => s + 1)}>
                {gated ? "Do it first" : "Next"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
