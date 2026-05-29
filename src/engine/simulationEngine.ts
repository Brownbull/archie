import { SIM_TICKS, SIM_DEFAULT_DURATION_S, LATENCY_LOAD_K } from "@/lib/constants"
import type {
  SimGraph,
  SimNode,
  TrafficCurve,
  TickState,
  NodeTelemetry,
  SimulationResult,
} from "@/lib/simulationTypes"

/**
 * Linear interpolation of a traffic curve at time `t` (seconds).
 * Clamps to the first/last point outside the curve's range. Empty curve → 0.
 */
export function interpolateRps(curve: TrafficCurve, t: number): number {
  if (curve.length === 0) return 0
  const sorted = [...curve].sort((a, b) => a.t - b.t)
  if (t <= sorted[0].t) return Math.max(0, sorted[0].rps)
  const last = sorted[sorted.length - 1]
  if (t >= last.t) return Math.max(0, last.rps)
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      if (span <= 0) return Math.max(0, b.rps)
      const frac = (t - a.t) / span
      return Math.max(0, a.rps + (b.rps - a.rps) * frac)
    }
  }
  return Math.max(0, last.rps)
}

/** Entry nodes = nodes with no incoming edge (in-degree 0). Traffic is injected here. */
export function findEntryNodes(graph: SimGraph): string[] {
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  const hasIncoming = new Set<string>()
  for (const e of graph.edges) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) hasIncoming.add(e.target)
  }
  return graph.nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id)
}

function latencyUnderLoad(baseLatencyMs: number, capacityPercent: number): number {
  const overload = Math.max(0, capacityPercent - 1)
  return baseLatencyMs * (1 + overload * LATENCY_LOAD_K)
}

/**
 * Routes `targetRps` through the graph for a single tick.
 * Directional flow (source → target), even split at fan-out, per-node shed on overload.
 * Processes nodes in topological order (Kahn); nodes in a cycle are processed once without
 * forwarding (v1 limitation — flagged for the engine's cycle handling).
 */
export function simulateTick(graph: SimGraph, tick: number, targetRps: number): TickState {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const outAdj = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  for (const n of graph.nodes) {
    outAdj.set(n.id, [])
    indeg.set(n.id, 0)
  }
  for (const e of graph.edges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue
    outAdj.get(e.source)!.push(e.target)
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
  }

  const entries = graph.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id)
  const inflow = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]))
  if (entries.length > 0) {
    const perEntry = targetRps / entries.length
    for (const id of entries) inflow.set(id, perEntry)
  }

  // Kahn topological order.
  const workIndeg = new Map(indeg)
  const queue = entries.slice()
  const order: string[] = []
  const seen = new Set<string>()
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
    for (const target of outAdj.get(id) ?? []) {
      workIndeg.set(target, (workIndeg.get(target) ?? 0) - 1)
      // Canonical Kahn: enqueue only when in-degree hits exactly 0 (avoids premature/duplicate
      // enqueue under duplicate edges; the `seen` guard at processing is a second safety net).
      if ((workIndeg.get(target) ?? 0) === 0 && !seen.has(target)) queue.push(target)
    }
  }
  // Nodes left in a cycle: processed once without forwarding (v1 limitation). For pure DAGs
  // (the normal case) flow conserves: targetRps = totalServed + totalFailed. When a DAG node
  // forwards into a cycle member, that member's served traffic neither forwards nor reaches a
  // sink, so totalServedRps is approximate for cyclic topologies (tracked: D7).
  const cyclic = graph.nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)

  const telemetry = new Map<string, NodeTelemetry>()
  const process = (id: string, forward: boolean) => {
    const node = nodeById.get(id) as SimNode
    const incoming = inflow.get(id) ?? 0
    const capped = node.effectiveMaxRps > 0
    const served = capped ? Math.min(incoming, node.effectiveMaxRps) : incoming
    const failed = Math.max(0, incoming - served)
    const capacityPercent = capped ? incoming / node.effectiveMaxRps : 0
    telemetry.set(id, {
      nodeId: id,
      incomingRps: incoming,
      servedRps: served,
      failedRps: failed,
      latencyMs: latencyUnderLoad(node.baseLatencyMs, capacityPercent),
      capacityPercent,
      overloaded: capped && incoming > node.effectiveMaxRps,
    })
    if (forward) {
      const outs = outAdj.get(id) ?? []
      if (outs.length > 0) {
        const perOut = served / outs.length
        for (const target of outs) inflow.set(target, (inflow.get(target) ?? 0) + perOut)
      }
    }
  }
  for (const id of order) process(id, true)
  for (const id of cyclic) process(id, false)

  const nodes = graph.nodes.map((n) => telemetry.get(n.id)!)
  const totalFailedRps = nodes.reduce((sum, t) => sum + t.failedRps, 0)
  const totalServedRps = Math.max(0, targetRps - totalFailedRps)
  return { tick, targetRps, nodes, totalServedRps, totalFailedRps }
}

/**
 * Runs a full simulation: `ticks` evenly-spaced samples of the traffic curve over `durationS`,
 * each routed through the graph. Pure + synchronous — returns all tick frames for playback.
 */
export function runSimulation(
  graph: SimGraph,
  curve: TrafficCurve,
  ticks: number = SIM_TICKS,
  durationS: number = SIM_DEFAULT_DURATION_S,
): SimulationResult {
  const safeTicks = Math.max(1, Math.floor(ticks))
  const frames: TickState[] = []
  for (let i = 0; i < safeTicks; i++) {
    const t = safeTicks === 1 ? 0 : (i / (safeTicks - 1)) * durationS
    const targetRps = interpolateRps(curve, t)
    frames.push(simulateTick(graph, i, targetRps))
  }
  return { ticks: frames, entryNodeIds: findEntryNodes(graph) }
}
