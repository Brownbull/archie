import { getScalingRule, type ComponentCategoryId } from "@/lib/constants"

// --- Types ---

export type TopologyIssueType = "orphan" | "missing-hop" | "unreachable" | "replicas-without-lb"
export type TopologyIssueSeverity = "warning" | "error"

export interface TopologyIssue {
  nodeId: string
  issueType: TopologyIssueType
  severity: TopologyIssueSeverity
  description: string
}

interface GraphNode {
  id: string
}

interface GraphEdge {
  source: string
  target: string
}

/** Node enriched with replica/category data for scaling-topology checks (Epic 14). */
export interface ReplicaGraphNode {
  id: string
  replicaCount: number
  category: ComponentCategoryId
}

// --- Private Helpers ---

function buildAdjacencySet(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, new Set())
    if (!adj.has(edge.target)) adj.set(edge.target, new Set())
    adj.get(edge.source)!.add(edge.target)
    adj.get(edge.target)!.add(edge.source)
  }
  return adj
}

function bfsReachable(startId: string, adj: Map<string, Set<string>>): Set<string> {
  const visited = new Set<string>()
  const queue = [startId]
  let head = 0
  visited.add(startId)
  while (head < queue.length) {
    const current = queue[head++]
    const neighbors = adj.get(current)
    if (!neighbors) continue
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  return visited
}

// --- Pure Functions ---

/**
 * Detects orphan nodes — nodes with zero connections (no edges touching them).
 * Orphans are warning-level: they exist but don't participate in the architecture.
 */
export function detectOrphans(nodes: GraphNode[], edges: GraphEdge[]): TopologyIssue[] {
  if (nodes.length === 0) return []
  const connected = new Set<string>()
  for (const edge of edges) {
    connected.add(edge.source)
    connected.add(edge.target)
  }
  const issues: TopologyIssue[] = []
  for (const node of nodes) {
    if (!connected.has(node.id)) {
      issues.push({
        nodeId: node.id,
        issueType: "orphan",
        severity: "warning",
        description: "Node has no connections",
      })
    }
  }
  return issues
}

/**
 * Detects unreachable components — nodes that exist in disconnected subgraphs.
 * Uses BFS from the largest connected component's first node.
 * Nodes not reachable from the main cluster are flagged.
 * Returns empty if <= 1 node or no edges (all are equally disconnected).
 */
export function detectUnreachable(nodes: GraphNode[], edges: GraphEdge[]): TopologyIssue[] {
  if (nodes.length <= 1 || edges.length === 0) return []

  const adj = buildAdjacencySet(edges)
  const nodeIds = new Set(nodes.map((n) => n.id))

  // Find connected components to identify the largest cluster
  const visited = new Set<string>()
  const components: Set<string>[] = []

  for (const node of nodes) {
    if (visited.has(node.id)) continue
    const component = bfsReachable(node.id, adj)
    // Only include nodes that actually exist in our node set
    const filtered = new Set<string>()
    for (const id of component) {
      if (nodeIds.has(id)) {
        filtered.add(id)
        visited.add(id)
      }
    }
    if (filtered.size > 0) components.push(filtered)
  }

  if (components.length <= 1) return []

  // Find largest component
  let largestIdx = 0
  for (let i = 1; i < components.length; i++) {
    if (components[i].size > components[largestIdx].size) largestIdx = i
  }
  const mainCluster = components[largestIdx]

  const issues: TopologyIssue[] = []
  for (const node of nodes) {
    if (!mainCluster.has(node.id) && adj.has(node.id)) {
      issues.push({
        nodeId: node.id,
        issueType: "unreachable",
        severity: "warning",
        description: "Node is in a disconnected subgraph",
      })
    }
  }
  return issues
}

// Tarjan's algorithm: finds articulation points (bridge nodes) in O(V+E)
function findArticulationPoints(
  nodeIds: Set<string>,
  adj: Map<string, Set<string>>,
): Set<string> {
  const disc = new Map<string, number>()
  const low = new Map<string, number>()
  const parentMap = new Map<string, string>()
  const ap = new Set<string>()
  let time = 0

  function dfs(u: string, isRoot: boolean): void {
    disc.set(u, time)
    low.set(u, time)
    time++
    let childCount = 0
    const neighbors = adj.get(u)
    if (!neighbors) return
    for (const v of neighbors) {
      if (!nodeIds.has(v)) continue
      if (!disc.has(v)) {
        childCount++
        parentMap.set(v, u)
        dfs(v, false)
        low.set(u, Math.min(low.get(u)!, low.get(v)!))
        if (isRoot && childCount > 1) ap.add(u)
        if (!isRoot && low.get(v)! >= disc.get(u)!) ap.add(u)
      } else if (v !== parentMap.get(u)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!))
      }
    }
  }

  for (const nodeId of nodeIds) {
    if (!disc.has(nodeId)) dfs(nodeId, true)
  }
  return ap
}

/**
 * Detects missing hops — nodes reachable only through a single bridge node
 * (single point of failure). Uses Tarjan's O(V+E) articulation point algorithm
 * to identify bridge nodes, then partitions to flag the smaller side.
 */
export function detectMissingHops(nodes: GraphNode[], edges: GraphEdge[]): TopologyIssue[] {
  if (nodes.length <= 2 || edges.length <= 1) return []

  const adj = buildAdjacencySet(edges)
  const nodeIds = new Set(nodes.map((n) => n.id))

  const articulationPoints = findArticulationPoints(nodeIds, adj)
  if (articulationPoints.size === 0) return []

  const issues: TopologyIssue[] = []
  const flaggedNodes = new Set<string>()

  for (const candidateId of articulationPoints) {
    const neighbors = adj.get(candidateId)
    if (!neighbors) continue

    const reducedAdj = new Map<string, Set<string>>()
    for (const edge of edges) {
      if (edge.source === candidateId || edge.target === candidateId) continue
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
      if (!reducedAdj.has(edge.source)) reducedAdj.set(edge.source, new Set())
      if (!reducedAdj.has(edge.target)) reducedAdj.set(edge.target, new Set())
      reducedAdj.get(edge.source)!.add(edge.target)
      reducedAdj.get(edge.target)!.add(edge.source)
    }

    const neighborArr = [...neighbors].filter((n) => nodeIds.has(n))
    if (neighborArr.length < 2) continue

    const reachableFromFirst = bfsReachable(neighborArr[0], reducedAdj)
    const allConnected = neighborArr.every((n) => reachableFromFirst.has(n))

    if (!allConnected) {
      const partitions: Set<string>[] = []
      const partVisited = new Set<string>()
      for (const neighbor of neighborArr) {
        if (partVisited.has(neighbor)) continue
        const part = bfsReachable(neighbor, reducedAdj)
        partitions.push(part)
        for (const id of part) partVisited.add(id)
      }

      if (partitions.length <= 1) continue

      let largestPartIdx = 0
      for (let i = 1; i < partitions.length; i++) {
        if (partitions[i].size > partitions[largestPartIdx].size) largestPartIdx = i
      }

      for (let i = 0; i < partitions.length; i++) {
        if (i === largestPartIdx) continue
        for (const nodeId of partitions[i]) {
          if (nodeIds.has(nodeId) && !flaggedNodes.has(nodeId)) {
            flaggedNodes.add(nodeId)
            issues.push({
              nodeId,
              issueType: "missing-hop",
              severity: "warning",
              description: `Reachable only through ${candidateId} (single point of failure)`,
            })
          }
        }
      }
    }
  }

  return issues
}

/**
 * Detects replicated nodes that lack a required upstream load balancer (Epic 14).
 * A node warns when: replicaCount > 1 AND its category requires an upstream LB AND
 * no incoming (upstream) edge originates from a load-balancer-capable category.
 * Edge direction matters: source feeds target (output port → input port), so the LB
 * must be the `source` of an edge whose `target` is the replicated node.
 */
export function detectReplicasWithoutLB(
  nodes: ReplicaGraphNode[],
  edges: GraphEdge[],
): TopologyIssue[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const issues: TopologyIssue[] = []
  for (const node of nodes) {
    if (node.replicaCount <= 1) continue
    if (!getScalingRule(node.category).requiresUpstreamLB) continue
    const hasUpstreamLB = edges.some((e) => {
      if (e.target !== node.id) return false
      const source = nodeById.get(e.source)
      return source ? getScalingRule(source.category).actsAsLoadBalancer : false
    })
    if (!hasUpstreamLB) {
      issues.push({
        nodeId: node.id,
        issueType: "replicas-without-lb",
        severity: "warning",
        description: `${node.replicaCount} replicas need an upstream load balancer`,
      })
    }
  }
  return issues
}

/** Runs all topology checks and returns the combined list of issues. */
export function detectTopologyIssues(nodes: GraphNode[], edges: GraphEdge[]): TopologyIssue[] {
  const orphans = detectOrphans(nodes, edges)
  const unreachable = detectUnreachable(nodes, edges)
  const missingHops = detectMissingHops(nodes, edges)
  return [...orphans, ...unreachable, ...missingHops]
}
