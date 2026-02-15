import {
  HEATMAP_THRESHOLD_WARNING,
  HEATMAP_THRESHOLD_BOTTLENECK,
} from "@/lib/constants"

// --- Types ---

export type HeatmapStatus = "healthy" | "warning" | "bottleneck"

// Severity ordering for worst-case comparison
const SEVERITY: Record<HeatmapStatus, number> = {
  healthy: 2,
  warning: 1,
  bottleneck: 0,
}

// --- Pure Functions ---

/**
 * Maps a node's overallScore (1-10 average) to a HeatmapStatus.
 * healthy >= 6, warning >= 4, bottleneck < 4.
 */
export function computeHeatmapStatus(overallScore: number): HeatmapStatus {
  if (overallScore >= HEATMAP_THRESHOLD_WARNING) return "healthy"
  if (overallScore >= HEATMAP_THRESHOLD_BOTTLENECK) return "warning"
  return "bottleneck"
}

/**
 * Computes heatmap status for all nodes from their computed metrics.
 * Input: Map<nodeId, { overallScore: number }>
 * Output: Map<nodeId, HeatmapStatus>
 */
export function computeArchitectureHeatmap(
  metrics: ReadonlyMap<string, { overallScore: number }>,
): Map<string, HeatmapStatus> {
  const result = new Map<string, HeatmapStatus>()
  for (const [nodeId, data] of metrics) {
    result.set(nodeId, computeHeatmapStatus(data.overallScore))
  }
  return result
}

/**
 * Computes edge heatmap status as worst-case of two endpoints.
 * bottleneck > warning > healthy (lower severity number = worse).
 * Undefined endpoints default to "healthy".
 */
export function computeEdgeHeatmapStatus(
  sourceStatus: HeatmapStatus | undefined,
  targetStatus: HeatmapStatus | undefined,
): HeatmapStatus {
  const source = sourceStatus ?? "healthy"
  const target = targetStatus ?? "healthy"
  return SEVERITY[source] <= SEVERITY[target] ? source : target
}
