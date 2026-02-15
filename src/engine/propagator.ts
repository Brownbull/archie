import { RIPPLE_DELAY_MS } from "@/lib/constants"

// --- Types ---

export interface PropagationHop {
  nodeId: string
  hopIndex: number // 0 = changed node, 1 = direct neighbors, etc.
  delayMs: number // hopIndex * RIPPLE_DELAY_MS
}

// --- Pure Functions ---

/**
 * Returns an ordered list of nodeIds that need recalculation,
 * starting from the changed node and BFS-traversing outward through edges.
 *
 * Edges are traversed bidirectionally (both source→target and target→source).
 * Visited set prevents cycles from causing infinite loops.
 *
 * Pure function — no side effects.
 */
export function getAffectedNodes(
  changedNodeId: string,
  _nodes: { id: string }[],
  edges: { source: string; target: string }[],
): string[] {
  const visited = new Set<string>()
  const queue: string[] = [changedNodeId]
  const result: string[] = []

  visited.add(changedNodeId)

  while (queue.length > 0) {
    const current = queue.shift()!
    result.push(current)

    // Find all neighbors (bidirectional traversal)
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target)
        queue.push(edge.target)
      }
      if (edge.target === current && !visited.has(edge.source)) {
        visited.add(edge.source)
        queue.push(edge.source)
      }
    }
  }

  return result
}

/**
 * Returns propagation hops with BFS depth and delay timing for visual ripple.
 * Each hop has: nodeId, hopIndex (BFS depth from changed node), delayMs.
 *
 * Pure function — no side effects.
 */
export function getPropagationHops(
  changedNodeId: string,
  _nodes: { id: string }[],
  edges: { source: string; target: string }[],
): PropagationHop[] {
  const visited = new Set<string>()
  // Queue entries: [nodeId, hopIndex]
  const queue: [string, number][] = [[changedNodeId, 0]]
  const result: PropagationHop[] = []

  visited.add(changedNodeId)

  while (queue.length > 0) {
    const [current, hopIndex] = queue.shift()!
    result.push({
      nodeId: current,
      hopIndex,
      delayMs: hopIndex * RIPPLE_DELAY_MS,
    })

    // Find all neighbors (bidirectional traversal)
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target)
        queue.push([edge.target, hopIndex + 1])
      }
      if (edge.target === current && !visited.has(edge.source)) {
        visited.add(edge.source)
        queue.push([edge.source, hopIndex + 1])
      }
    }
  }

  return result
}
