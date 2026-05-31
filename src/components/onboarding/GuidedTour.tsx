import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { usePreferencesStore } from "@/stores/preferencesStore"

interface TourStep {
  title: string
  body: string
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to Archie",
    body: "Design a software architecture and watch it scored live across performance, reliability, scale, ops, and cost.",
  },
  {
    title: "1 · Three ways to start",
    body: "Start however you like: drag a Component (one building block), drop a Stack (a small ready-made pattern), or Load a Blueprint (a full example — it replaces the canvas). The empty-canvas card links all three, plus Challenges.",
  },
  {
    title: "2 · Type → provider → tier",
    body: "Every component is a type (Cache, Database…), grouped in the toolbox. Select a node to open the inspector, swap the Provider (e.g. Redis vs Memcached), and pick a Configuration tier — each carries its own $ · throughput · latency.",
  },
  {
    title: "3 · Wire it up",
    body: "Drag between component handles to connect them. Select a node or connector for its Duplicate / Remove toolbar. The Build-health panel flags anything not yet connected to traffic.",
  },
  {
    title: "4 · Analyze & stress-test",
    body: "Use the overlay modes up top (Alt+1–5) to recolour the canvas by Cost, Performance, Tier, and more. Then pick a demand Scenario or inject a Failure (top-right) and Run Simulation to stress-test the design.",
  },
  {
    title: "5 · Score & challenge",
    body: "Watch the live scores, or take a Challenge to hit target metrics under a budget. Attempts are saved to History so you can beat your past runs.",
  },
]

/**
 * First-run guided tour (P6) — a short, restartable walkthrough that replaces static hint
 * bullets with an interactive intro. Auto-shows once (gated on the persisted `tourSeen` flag);
 * "Restart tour" in the Settings menu clears the flag to show it again.
 */
export function GuidedTour() {
  const tourSeen = usePreferencesStore((s) => s.tourSeen)
  const setTourSeen = usePreferencesStore((s) => s.setTourSeen)
  const [step, setStep] = useState(0)

  // Reset to the first step whenever the tour (re)opens (e.g. via Restart tour). Adjust state
  // during render rather than in an effect (avoids react-hooks/set-state-in-effect).
  const [prevTourSeen, setPrevTourSeen] = useState(tourSeen)
  if (tourSeen !== prevTourSeen) {
    setPrevTourSeen(tourSeen)
    if (!tourSeen) setStep(0)
  }

  if (tourSeen) return null

  const isLast = step === STEPS.length - 1
  const current = STEPS.at(step) ?? STEPS[0]
  const finish = () => setTourSeen(true)

  return (
    <Dialog open onOpenChange={(o) => { if (!o) finish() }}>
      <DialogContent data-testid="guided-tour" className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="tour-title">{current.title}</DialogTitle>
          <DialogDescription data-testid="tour-body">{current.body}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1" data-testid="tour-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s.title} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-blue-500" : "bg-archie-border"}`} />
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
