import { useSimulationStore } from "@/stores/simulationStore"
import { ScenarioSelector } from "@/components/canvas/ScenarioSelector"
import { FailureSelector } from "@/components/canvas/FailureSelector"
import { Z_INDEX } from "@/lib/constants"

/**
 * Top-right "Test conditions" rail: the demand-scenario and failure selectors (plus their active
 * banners) stacked in a single flex column so they never overlap — replacing the previous fragile
 * absolute-offset positioning. Hidden during a simulation, where the live STATS panel owns this
 * rail (the selectors are disabled mid-run anyway).
 */
export function TestConditionsPanel() {
  const simIdle = useSimulationStore((s) => s.status === "idle")
  if (!simIdle) return null

  return (
    <div
      data-testid="test-conditions"
      className={`pointer-events-none absolute right-4 top-4 flex w-[200px] flex-col gap-1.5 ${Z_INDEX.DROPDOWN}`}
    >
      <span
        data-testid="test-conditions-label"
        title="Set the demand scenario and/or a failure to inject, then Run Simulation."
        className="text-[0.5625rem] font-semibold uppercase tracking-wide text-text-secondary/80"
      >
        Test conditions
      </span>
      <ScenarioSelector />
      <FailureSelector />
    </div>
  )
}
