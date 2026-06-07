import { useState } from "react"
import { Minus, Maximize2 } from "lucide-react"
import { useSimulationStore } from "@/stores/simulationStore"
import { FailureSelector } from "@/components/canvas/FailureSelector"
import { Z_INDEX } from "@/lib/constants"

/**
 * Top-right "Test conditions" rail: the failure-injection selector (plus its active banner).
 * Fluidity P3b (D83): the demand-scenario selector was retired — the traffic-source tier + pattern +
 * workload + origin controls already cover demand, so only failure injection adds unique value here.
 * Hidden during a simulation, where the live STATS panel owns this rail.
 */
export function TestConditionsPanel() {
  const simIdle = useSimulationStore((s) => s.status === "idle")
  const [collapsed, setCollapsed] = useState(false)
  if (!simIdle) return null

  return (
    <div
      data-testid="test-conditions"
      className={`pointer-events-none absolute right-4 top-4 flex w-[200px] flex-col gap-1.5 ${Z_INDEX.DROPDOWN}`}
    >
      <div className="flex items-center justify-between">
        <span
          data-testid="test-conditions-label"
          title="Optionally inject a failure to stress-test resilience, then Run Simulation. (Demand is set on the traffic-source block.)"
          className="text-[0.5625rem] font-semibold uppercase tracking-wide text-text-secondary/80"
        >
          Test conditions
        </span>
        <button
          data-testid="test-conditions-collapse-toggle"
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="pointer-events-auto rounded p-0.5 text-text-secondary hover:text-text-primary"
          aria-label={collapsed ? "Expand test conditions" : "Collapse test conditions"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        </button>
      </div>
      {!collapsed && <FailureSelector />}
    </div>
  )
}
