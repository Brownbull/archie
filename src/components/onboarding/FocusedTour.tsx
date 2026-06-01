import { useTourStore } from "@/stores/tourStore"
import { SpotlightTour } from "@/components/onboarding/SpotlightTour"

/**
 * App-level renderer for on-demand focused tours (P89/Phase B). Reads the {@link useTourStore} and
 * renders the shared {@link SpotlightTour} when a per-panel "walk me through it" tour is active.
 * The `key={nonce}` remounts the tour fresh (step 0) each time one starts.
 */
export function FocusedTour() {
  const steps = useTourStore((s) => s.steps)
  const nonce = useTourStore((s) => s.nonce)
  const close = useTourStore((s) => s.close)

  if (!steps || steps.length === 0) return null
  return <SpotlightTour key={nonce} steps={steps} onClose={close} ariaLabel="Guide" />
}
