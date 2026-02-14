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
import type { MetricValue } from "@/schemas/metricSchema"

// --- Types ---

export interface RecalculationResult {
  metrics: ArchitectureMetrics
  propagationHops: PropagationHop[]
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
  const component = componentLibrary.getComponent(node.data.archieComponentId)
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
   * 4. Returns computed metrics + propagation timing
   *
   * Synchronous — componentLibrary.getComponent() is O(1) from Map cache.
   */
  run(
    nodes: ServiceNode[],
    edges: { source: string; target: string }[],
    changedNodeId: string,
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
      metrics.set(nodeId, recalculated)
    }

    return { metrics, propagationHops }
  },
}
