import { useSimulationStore } from "@/stores/simulationStore"
import type { NodeTelemetry } from "@/lib/simulationTypes"

/**
 * Live per-node simulation telemetry for the current playback tick (Epic 15).
 * Returns null when no simulation is active (status idle / no ticks).
 * Reference-stable per tick — ticks are precomputed, so the returned object identity
 * only changes when currentTick advances.
 */
export function useNodeSimTelemetry(nodeId: string): NodeTelemetry | null {
  return useSimulationStore((s) => {
    if (s.status === "idle" || s.ticks.length === 0) return null
    return s.ticks[s.currentTick]?.nodes.find((n) => n.nodeId === nodeId) ?? null
  })
}

/** Capacity-bar color band: green <70% → yellow <100% → red ≥100%. */
export function simCapacityColorClass(capacityPercent: number): string {
  if (capacityPercent >= 1) return "bg-red-500"
  if (capacityPercent >= 0.7) return "bg-yellow-500"
  return "bg-green-500"
}
