import { usePreferencesStore } from "@/stores/preferencesStore"
import { SpotlightTour, type TourStep } from "@/components/onboarding/SpotlightTour"

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
    body: "Inject a Failure up here (a node down, a DB outage, a region loss…), then Run Simulation to watch traffic flow and see where it breaks. Demand itself you set on the traffic-source block.",
    selector: '[data-testid="test-conditions"]',
  },
  {
    title: "Score & challenge",
    body: "Live scores update down here as you build. Take a Challenge to hit target metrics under a budget — attempts are saved to History.",
    selector: '[data-testid="dashboard"]',
  },
]

/**
 * First-run guided tour (P6, anchored). A short, restartable, non-blocking spotlight walkthrough.
 * Auto-shows once (gated on the persisted `tourSeen` flag); "Restart tour" in Settings clears it.
 * Rendering is delegated to the shared {@link SpotlightTour}; this component owns only the
 * onboarding step content and the seen-once gate. Returning null while seen unmounts the tour, so
 * a restart remounts it fresh at step 0.
 */
export function GuidedTour() {
  const tourSeen = usePreferencesStore((s) => s.tourSeen)
  const setTourSeen = usePreferencesStore((s) => s.setTourSeen)

  if (tourSeen) return null
  return <SpotlightTour steps={STEPS} onClose={() => setTourSeen(true)} />
}
