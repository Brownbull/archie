import { useMemo } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { computeHeatmapStatus } from "@/engine/heatmapCalculator"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import { PARTICLE_DENSITY_MIN, PARTICLE_DENSITY_MAX, CONNECTION_DEFAULT_HEALTH_SCORE } from "@/lib/constants"

interface ConnectionHealth {
  healthScore: number
  density: number
  status: HeatmapStatus
}

export function useConnectionHealth(sourceNodeId: string, targetNodeId: string): ConnectionHealth {
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)

  return useMemo(() => {
    const sourceMetrics = computedMetrics.get(sourceNodeId)
    const targetMetrics = computedMetrics.get(targetNodeId)

    const sourceScore = sourceMetrics?.overallScore ?? CONNECTION_DEFAULT_HEALTH_SCORE
    const targetScore = targetMetrics?.overallScore ?? CONNECTION_DEFAULT_HEALTH_SCORE

    const rawScore = (sourceScore + targetScore) / 2
    const healthScore = Math.max(1, Math.min(10, rawScore))

    const density = Math.round(
      PARTICLE_DENSITY_MIN + ((healthScore - 1) / 9) * (PARTICLE_DENSITY_MAX - PARTICLE_DENSITY_MIN),
    )

    const status = computeHeatmapStatus(healthScore)

    return { healthScore, density, status }
  }, [computedMetrics, sourceNodeId, targetNodeId])
}
