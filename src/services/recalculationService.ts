import { componentLibrary } from "@/services/componentLibrary"
import {
  recalculateNode,
  type ArchitectureMetrics,
  type ConnectedNodeInfo,
} from "@/engine/recalculator"
import {
  getAffectedNodes,
  getPropagationHops,
  type PropagationHop,
} from "@/engine/propagator"
import {
  computeArchitectureHeatmap,
  computeEdgeHeatmapStatus,
  type HeatmapStatus,
} from "@/engine/heatmapCalculator"
import type { MetricValue } from "@/schemas/metricSchema"
import type { DemandProfile, DemandResponse, FailureModifiers } from "@/lib/demandTypes"
import { applyDemandModifiers, applyFailureModifiers } from "@/engine/demandEngine"

// --- Types ---

export interface RecalculationResult {
  metrics: ArchitectureMetrics
  propagationHops: PropagationHop[]
  nodeHeatmap: Map<string, HeatmapStatus>
  edgeHeatmap: Map<string, HeatmapStatus>
}

// Node shape expected by the service (matches architectureStore node.data)
interface ServiceNodeData {
  archieComponentId: string
  activeConfigVariantId: string
  componentName: string
  componentCategory: string
}

interface ServiceNode {
  id: string
  data: ServiceNodeData
}

// --- Metric Merge ---

/**
 * Merges base metrics with variant overlay.
 * Variant values override base values for matching metric IDs.
 * Base values fill in the rest.
 */
function mergeMetrics(
  baseMetrics: MetricValue[],
  variantMetrics: MetricValue[],
): MetricValue[] {
  const merged = new Map<string, MetricValue>(
    baseMetrics.map((m) => [m.id, m]),
  )
  for (const vm of variantMetrics) {
    merged.set(vm.id, vm) // variant overrides base for matching IDs
  }
  return Array.from(merged.values())
}

/**
 * Gets effective metrics for a node by merging base + active variant.
 */
function getEffectiveMetrics(node: ServiceNode): MetricValue[] {
  let component
  try {
    component = componentLibrary.getComponent(node.data.archieComponentId)
  } catch (error) {
    console.warn(
      `recalculationService: getComponent threw for "${node.data.archieComponentId}" (node "${node.id}"):`,
      error,
    )
    return []
  }

  if (!component) {
    console.warn(
      `recalculationService: component "${node.data.archieComponentId}" not found for node "${node.id}"`,
    )
    return []
  }

  const activeVariant = component.configVariants.find(
    (v) => v.id === node.data.activeConfigVariantId,
  )

  // If variant not found, use base metrics only
  const variantMetrics = activeVariant?.metrics ?? []
  return mergeMetrics(component.baseMetrics, variantMetrics)
}

// --- Service ---

export const recalculationService = {
  /**
   * Orchestrates the full recalculation pipeline:
   * 1. Determines affected nodes via propagator (BFS from changedNodeId)
   * 2. For each affected node, merges base + variant metrics
   * 3. Calls recalculator for each node with connected node info
   * 4. Applies demand modifiers if demandProfile is active (Story 9-4)
   * 5. Returns computed metrics + propagation timing
   *
   * Synchronous — componentLibrary.getComponent() is O(1) from Map cache.
   */
  run(
    nodes: ServiceNode[],
    edges: { id: string; source: string; target: string }[],
    changedNodeId: string,
    demandProfile?: DemandProfile | null,
    failureModifiers?: FailureModifiers | null,
    activeFailurePresetId?: string | null,
  ): RecalculationResult {
    // Build lookup maps
    const nodeMap = new Map<string, ServiceNode>(nodes.map((n) => [n.id, n]))

    // Get propagation order (BFS from changed node)
    const simpleNodes = nodes.map((n) => ({ id: n.id }))
    const affectedNodeIds = getAffectedNodes(changedNodeId, simpleNodes, edges)
    const propagationHops = getPropagationHops(
      changedNodeId,
      simpleNodes,
      edges,
    )

    // Compute effective metrics for all affected nodes
    const effectiveMetricsCache = new Map<string, MetricValue[]>()
    for (const nodeId of affectedNodeIds) {
      const node = nodeMap.get(nodeId)
      if (node) {
        effectiveMetricsCache.set(nodeId, getEffectiveMetrics(node))
      } else {
        effectiveMetricsCache.set(nodeId, [])
      }
    }

    // Recalculate each affected node
    const metrics: ArchitectureMetrics = new Map()

    for (const nodeId of affectedNodeIds) {
      const node = nodeMap.get(nodeId)
      const nodeCategory = node?.data.componentCategory ?? "compute"
      const nodeEffectiveMetrics = effectiveMetricsCache.get(nodeId) ?? []

      // Find connected nodes (bidirectional)
      const connectedNodeIds = new Set<string>()
      for (const edge of edges) {
        if (edge.source === nodeId) connectedNodeIds.add(edge.target)
        if (edge.target === nodeId) connectedNodeIds.add(edge.source)
      }

      const connectedNodes: ConnectedNodeInfo[] = []
      for (const connId of connectedNodeIds) {
        const connNode = nodeMap.get(connId)
        if (connNode) {
          connectedNodes.push({
            nodeId: connId,
            category: connNode.data.componentCategory,
            metrics: effectiveMetricsCache.get(connId) ?? [],
          })
        }
      }

      const recalculated = recalculateNode(
        nodeId,
        nodeCategory,
        nodeEffectiveMetrics,
        connectedNodes,
        edges,
      )

      // Lookup component once for demand + failure modifier application
      const component = (demandProfile || failureModifiers)
        ? componentLibrary.getComponent(node?.data.archieComponentId ?? "")
        : undefined

      // Story 9-4: Apply demand modifiers after variant resolution + interaction rules (Level 3)
      if (demandProfile) {
        const demandResponses: DemandResponse | undefined = component?.demandResponses
        const adjustedMetrics = applyDemandModifiers(recalculated.metrics, demandResponses, demandProfile)
        recalculated.metrics = adjustedMetrics
        if (adjustedMetrics.length > 0) {
          recalculated.overallScore = adjustedMetrics.reduce((sum, m) => sum + m.numericValue, 0) / adjustedMetrics.length
        }
      }

      // Story 9-7 + 11-4: Apply failure modifiers after demand (Level 4)
      // Per-component failure responses override global preset when available
      if (failureModifiers) {
        const componentFailure = activeFailurePresetId ? component?.failureResponses?.[activeFailurePresetId] : undefined
        const effectiveModifiers = componentFailure ?? failureModifiers
        const failureAdjusted = applyFailureModifiers(recalculated.metrics, effectiveModifiers)
        recalculated.metrics = failureAdjusted
        if (failureAdjusted.length > 0) {
          recalculated.overallScore = failureAdjusted.reduce((sum, m) => sum + m.numericValue, 0) / failureAdjusted.length
        }
      }

      metrics.set(nodeId, recalculated)
    }

    // Compute node heatmap from metrics (synchronous — NFR3)
    const nodeHeatmap = computeArchitectureHeatmap(metrics)

    // Compute edge heatmap (worst-case of endpoints)
    const edgeHeatmap = new Map<string, HeatmapStatus>()
    for (const edge of edges) {
      const sourceStatus = nodeHeatmap.get(edge.source)
      const targetStatus = nodeHeatmap.get(edge.target)
      edgeHeatmap.set(
        edge.id,
        computeEdgeHeatmapStatus(sourceStatus, targetStatus),
      )
    }

    return { metrics, propagationHops, nodeHeatmap, edgeHeatmap }
  },
}
