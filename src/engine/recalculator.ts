import type { MetricValue } from "@/schemas/metricSchema"

// --- Types ---

export interface RecalculatedMetrics {
  nodeId: string
  metrics: MetricValue[]
  overallScore: number // average of all numericValues
}

export type ArchitectureMetrics = Map<string, RecalculatedMetrics>

export interface MetricAdjustment {
  metricId: string
  adjustment: number // -2 to +2
}

export interface ConnectedNodeInfo {
  nodeId: string
  category: string
  metrics: MetricValue[]
}

// --- Interaction Rules ---
// Category-pair rules: when these two categories are connected,
// adjustments apply to the node being recalculated.
// Key format: "influencerCategory→affectedCategory"
// Both directions are checked during recalculation.

export const INTERACTION_RULES: Record<string, MetricAdjustment[]> = {
  "caching→data-storage": [
    { metricId: "read-latency", adjustment: -2 },
    { metricId: "operational-complexity", adjustment: 1 },
  ],
  "caching→compute": [
    { metricId: "request-latency", adjustment: -2 },
  ],
  "messaging→compute": [
    { metricId: "horizontal-scalability", adjustment: 2 },
    { metricId: "operational-complexity", adjustment: 1 },
  ],
  "delivery-network→compute": [
    { metricId: "request-latency", adjustment: -2 },
    { metricId: "concurrent-connections", adjustment: 1 },
  ],
  "data-storage→compute": [
    { metricId: "data-durability", adjustment: 1 },
    { metricId: "operational-complexity", adjustment: 1 },
  ],
  "monitoring→compute": [
    { metricId: "operational-complexity", adjustment: -2 },
  ],
  "real-time→compute": [
    { metricId: "concurrent-connections", adjustment: -1 },
    { metricId: "operational-complexity", adjustment: 1 },
  ],
}

// --- Pure Functions ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function deriveValueEnum(numericValue: number): "low" | "medium" | "high" {
  if (numericValue <= 3) return "low"
  if (numericValue <= 7) return "medium"
  return "high"
}

/**
 * Recalculates metrics for a single node based on its effective metrics
 * and interaction rules with connected nodes.
 *
 * Pure function — no side effects, no imports from react/zustand/firebase.
 */
export function recalculateNode(
  nodeId: string,
  nodeCategory: string,
  effectiveMetrics: MetricValue[],
  connectedNodes: ConnectedNodeInfo[],
  _edges: { source: string; target: string }[],
): RecalculatedMetrics {
  if (effectiveMetrics.length === 0) {
    return { nodeId, metrics: [], overallScore: 0 }
  }

  // Build adjustment accumulator: metricId → total adjustment
  const adjustments = new Map<string, number>()

  // Cache rule lookups by category pair to avoid redundant lookups
  // when multiple connected nodes share the same category
  const ruleCache = new Map<string, MetricAdjustment[] | undefined>()
  const getCachedRules = (key: string): MetricAdjustment[] | undefined => {
    if (ruleCache.has(key)) return ruleCache.get(key)
    const rules = INTERACTION_RULES[key]
    ruleCache.set(key, rules)
    return rules
  }

  for (const connected of connectedNodes) {
    // Check both directions of the category pair
    const key1 = `${connected.category}→${nodeCategory}`
    const key2 = `${nodeCategory}→${connected.category}`

    const rules1 = getCachedRules(key1)
    const rules2 = getCachedRules(key2)

    if (rules1) {
      for (const adj of rules1) {
        adjustments.set(
          adj.metricId,
          (adjustments.get(adj.metricId) ?? 0) + adj.adjustment,
        )
      }
    }
    if (rules2) {
      for (const adj of rules2) {
        adjustments.set(
          adj.metricId,
          (adjustments.get(adj.metricId) ?? 0) + adj.adjustment,
        )
      }
    }
  }

  // Apply adjustments to effective metrics (immutably)
  const computedMetrics: MetricValue[] = effectiveMetrics.map((metric) => {
    const adj = adjustments.get(metric.id)
    if (adj === undefined || adj === 0) {
      // Return new object even if unchanged (immutability contract)
      return { ...metric }
    }
    const newNumericValue = clamp(metric.numericValue + adj, 1, 10)
    return {
      ...metric,
      numericValue: newNumericValue,
      value: deriveValueEnum(newNumericValue),
    }
  })

  const overallScore =
    computedMetrics.length > 0
      ? Math.round(
          computedMetrics.reduce((sum, m) => sum + m.numericValue, 0) /
            computedMetrics.length,
        )
      : 0

  return { nodeId, metrics: computedMetrics, overallScore }
}

/**
 * Recalculates metrics for all nodes in the architecture.
 * Uses a provided lookup function to get effective metrics per node.
 *
 * Pure function — no side effects.
 */
export function recalculateArchitecture(
  nodes: { id: string; category: string }[],
  edges: { source: string; target: string }[],
  getEffectiveMetrics: (nodeId: string) => MetricValue[],
): ArchitectureMetrics {
  const result: ArchitectureMetrics = new Map()

  // Build node category lookup
  const nodeCategoryMap = new Map<string, string>()
  for (const node of nodes) {
    nodeCategoryMap.set(node.id, node.category)
  }

  for (const node of nodes) {
    // Find connected node IDs (both directions)
    const connectedNodeIds = new Set<string>()
    for (const edge of edges) {
      if (edge.source === node.id) connectedNodeIds.add(edge.target)
      if (edge.target === node.id) connectedNodeIds.add(edge.source)
    }

    // Build connected node info
    const connectedNodes: ConnectedNodeInfo[] = []
    for (const connectedId of connectedNodeIds) {
      const category = nodeCategoryMap.get(connectedId)
      if (category) {
        connectedNodes.push({
          nodeId: connectedId,
          category,
          metrics: getEffectiveMetrics(connectedId),
        })
      }
    }

    const nodeMetrics = getEffectiveMetrics(node.id)
    const recalculated = recalculateNode(
      node.id,
      node.category,
      nodeMetrics,
      connectedNodes,
      edges,
    )
    result.set(node.id, recalculated)
  }

  return result
}
