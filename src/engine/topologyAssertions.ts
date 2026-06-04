import type { RequiredTopologyAssertion } from "@/lib/challengeTypes"

/**
 * Required-topology evaluator (ISAPivot Phase 3, D66).
 *
 * Pure + deterministic. Grades structural-wiring assertions against the UNDIRECTED adjacency of the
 * attempt's frozen graph — the canvas stores edges as source→target, but players wire read-aside
 * caches and LB fan-outs in either direction, so adjacency is treated symmetrically (D66). The
 * author specifies the endpoint TYPE ids per assertion; the intermediary node kind (cache /
 * load-balancer) is fixed by the rule name and identified by these TYPE ids.
 */

/** Component TYPE ids that count as a "cache" for CACHE_BETWEEN. */
const CACHE_TYPE_IDS: ReadonlySet<string> = new Set(["cache"])
/** Component TYPE ids that count as a "load balancer" for LB_UPSTREAM. */
const LOAD_BALANCER_TYPE_IDS: ReadonlySet<string> = new Set(["load-balancer"])
/** Default fan-out when an assertion omits minCount. */
const DEFAULT_FAN_OUT = 2

/** The frozen structural inputs scored against — node-id→TYPE-id plus the raw edge list. */
export interface TopologyGraphInput {
  typeByNodeId: ReadonlyMap<string, string>
  edges: ReadonlyArray<{ source: string; target: string }>
}

/** Verdict for one assertion, with a human-readable detail for the results modal. */
export interface TopologyAssertionResult {
  assertion: RequiredTopologyAssertion
  passed: boolean
  detail: string
}

/** nodeId → set of adjacent nodeIds (undirected: both endpoints get each other). */
function buildAdjacency(edges: TopologyGraphInput["edges"]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    let s = adj.get(a)
    if (!s) {
      s = new Set<string>()
      adj.set(a, s)
    }
    s.add(b)
  }
  for (const e of edges) {
    if (e.source === e.target) continue // self-loops never contribute to adjacency (a node can't fan out to itself)
    link(e.source, e.target)
    link(e.target, e.source)
  }
  return adj
}

/**
 * Evaluates every assertion against the graph. Returns one result per assertion (order preserved).
 * An assertion missing its required endpoint type(s) for its rule cannot pass (defensive — the
 * schema also rejects such authoring at load time).
 */
export function evaluateRequiredTopology(
  graph: TopologyGraphInput,
  assertions: ReadonlyArray<RequiredTopologyAssertion>,
): TopologyAssertionResult[] {
  const { typeByNodeId, edges } = graph
  const adj = buildAdjacency(edges)

  const nodeIdsOfType = (typeId: string): string[] =>
    [...typeByNodeId.entries()].filter(([, t]) => t === typeId).map(([id]) => id)
  const nodeIdsInSet = (set: ReadonlySet<string>): string[] =>
    [...typeByNodeId.entries()].filter(([, t]) => set.has(t)).map(([id]) => id)
  // Does node `id` have at least one adjacent node whose TYPE satisfies `match`?
  const adjacentMatches = (id: string, match: (typeId: string) => boolean): boolean => {
    const neighbors = adj.get(id)
    if (!neighbors) return false
    for (const n of neighbors) {
      const t = typeByNodeId.get(n)
      if (t !== undefined && match(t)) return true
    }
    return false
  }

  return assertions.map((assertion) => {
    switch (assertion.ruleType) {
      case "CACHE_BETWEEN": {
        const { sourceType, targetType } = assertion
        if (!sourceType || !targetType) {
          return { assertion, passed: false, detail: "CACHE_BETWEEN needs sourceType + targetType" }
        }
        // A cache node adjacent to both a sourceType node and a targetType node (undirected).
        const caches = nodeIdsInSet(CACHE_TYPE_IDS)
        const passed = caches.some(
          (c) => adjacentMatches(c, (t) => t === sourceType) && adjacentMatches(c, (t) => t === targetType),
        )
        return {
          assertion,
          passed,
          detail: passed
            ? `cache between ${sourceType} ↔ ${targetType}`
            : `no cache adjacent to both ${sourceType} and ${targetType}`,
        }
      }
      case "LB_UPSTREAM": {
        const { targetType } = assertion
        if (!targetType) {
          return { assertion, passed: false, detail: "LB_UPSTREAM needs targetType" }
        }
        // Every targetType node must be adjacent to a load balancer; at least one target required.
        const targets = nodeIdsOfType(targetType)
        const passed =
          targets.length > 0 && targets.every((id) => adjacentMatches(id, (t) => LOAD_BALANCER_TYPE_IDS.has(t)))
        return {
          assertion,
          passed,
          detail:
            targets.length === 0
              ? `no ${targetType} node present`
              : passed
                ? `all ${targetType} nodes have a load balancer upstream`
                : `a ${targetType} node has no load balancer upstream`,
        }
      }
      case "FAN_OUT_GTE": {
        const { sourceType } = assertion
        const min = assertion.minCount ?? DEFAULT_FAN_OUT
        if (!sourceType) {
          return { assertion, passed: false, detail: "FAN_OUT_GTE needs sourceType" }
        }
        // Some sourceType node has ≥min DISTINCT adjacent nodes that resolve to a known component
        // type. A dangling/unresolved neighbor (in an edge but not typeByNodeId) is not a real
        // architectural fan-out target, so it does not count (self-loops already excluded above).
        const sources = nodeIdsOfType(sourceType)
        const fanOut = (id: string): number => {
          const neighbors = adj.get(id)
          if (!neighbors) return 0
          let count = 0
          for (const n of neighbors) if (typeByNodeId.has(n)) count++
          return count
        }
        const passed = sources.some((id) => fanOut(id) >= min)
        return {
          assertion,
          passed,
          detail: passed
            ? `a ${sourceType} node fans out to ≥${min}`
            : `no ${sourceType} node fans out to ≥${min}`,
        }
      }
      default:
        return { assertion, passed: false, detail: "unknown rule" }
    }
  })
}

/** True when every assertion passed (empty list ⇒ true). */
export function allTopologyAssertionsPass(results: ReadonlyArray<TopologyAssertionResult>): boolean {
  return results.every((r) => r.passed)
}
