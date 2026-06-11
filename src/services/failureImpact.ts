import { recalculationService } from "@/services/recalculationService"
import { getAllFailurePresets } from "@/services/failureLoader"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"

/**
 * Break-it loop, failure axis (P4-S4, D94): which Test-conditions presets would BREAK the current
 * build? For each failure preset, re-run the deterministic metric recalculation off the live graph
 * (the same pipeline the heatmap uses — synchronous, no tick sim) and compare node statuses against
 * the no-failure baseline. A preset "breaks" the build when it pushes at least one node to
 * `bottleneck` that wasn't a bottleneck already — pre-existing reds don't count, otherwise every
 * preset would glow on an already-broken canvas and the signal would be noise.
 */

interface ImpactNode {
  id: string
  data: {
    archieComponentId: string
    activeConfigVariantId: string
    componentName: string
    componentCategory: string
  }
}
interface ImpactEdge {
  id: string
  source: string
  target: string
}

/** Seed for the recalculation BFS: the traffic source (the served path is what a quest grades). */
function seedNodeId(nodes: readonly ImpactNode[]): string | null {
  const traffic = nodes.find((n) => n.data.componentCategory === "traffic")
  return traffic?.id ?? nodes[0]?.id ?? null
}

function bottlenecks(heatmap: ReadonlyMap<string, HeatmapStatus>): Set<string> {
  const out = new Set<string>()
  for (const [nodeId, status] of heatmap) if (status === "bottleneck") out.add(nodeId)
  return out
}

/**
 * The ids of the failure presets that would fell the current build (≥1 NEW bottleneck vs the
 * no-failure baseline). Empty set on an empty canvas. Synchronous — 1 baseline + N preset
 * recalculations, each O(nodes × metrics); cheap enough to memo per canvas edit.
 */
export function computeBreakingFailures(
  nodes: readonly ImpactNode[],
  edges: readonly ImpactEdge[],
): Set<string> {
  const breaking = new Set<string>()
  const seed = seedNodeId(nodes)
  if (!seed) return breaking

  const mutableNodes = nodes as ImpactNode[]
  const mutableEdges = edges as ImpactEdge[]
  const baseline = bottlenecks(
    recalculationService.run(mutableNodes, mutableEdges, seed, null, null, null).nodeHeatmap,
  )

  for (const preset of getAllFailurePresets()) {
    const heatmap = recalculationService.run(
      mutableNodes, mutableEdges, seed, null, preset.failureModifiers, preset.id,
    ).nodeHeatmap
    for (const [nodeId, status] of heatmap) {
      if (status === "bottleneck" && !baseline.has(nodeId)) {
        breaking.add(preset.id)
        break
      }
    }
  }
  return breaking
}
