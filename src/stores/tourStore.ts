import { create } from "zustand"
import type { TourStep } from "@/components/onboarding/SpotlightTour"

/**
 * Drives on-demand "walk me through it" focused tours (P89/Phase B) — the per-panel ⓘ explainers
 * call `start(steps)` to launch a short anchored spotlight tour for that panel. Separate from the
 * first-run onboarding tour (which is gated by the persisted `tourSeen` flag). `nonce` increments
 * on each start so the renderer can remount the SpotlightTour fresh at step 0.
 */
interface TourState {
  steps: TourStep[] | null
  nonce: number
  start: (steps: TourStep[]) => void
  close: () => void
}

export const useTourStore = create<TourState>((set, get) => ({
  steps: null,
  nonce: 0,
  start: (steps) => set({ steps, nonce: get().nonce + 1 }),
  close: () => set({ steps: null }),
}))
