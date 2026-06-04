import { SIM_TICKS, SIM_DEFAULT_DURATION_S, LATENCY_LOAD_K, DEFAULT_SIM_TARGET_RPS } from "@/lib/constants"
import type {
  SimGraph,
  SimNode,
  TrafficCurve,
  TickState,
  NodeTelemetry,
  SimulationResult,
  ScheduledEvent,
  TickOverrides,
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

/**
 * Default traffic curve when a scenario defines none (Epic 15): a linear ramp 0 → targetRps
 * over the duration, so bottlenecks emerge progressively as load climbs.
 */
export function defaultTrafficCurve(
  durationS: number = SIM_DEFAULT_DURATION_S,
  targetRps: number = DEFAULT_SIM_TARGET_RPS,
): TrafficCurve {
  return [
    { t: 0, rps: 0 },
    { t: durationS, rps: targetRps },
  ]
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
 * Resolves the scheduled events active at `timeS` into per-tick overrides (Epic 16).
 * - component_failure: target node offline (sheds all traffic).
 * - az_outage: every node whose category === target goes offline.
 * - latency_spike: target node's latency is multiplied (default ×3).
 * Active window is half-open `[t, t + durationS)`; omitting durationS means "until the end".
 * Concurrent latency_spike events on the same node multiply together (×3 × ×2 = ×6).
 */
export function computeOverrides(nodes: SimNode[], events: ScheduledEvent[], timeS: number, edges?: Array<{ source: string; target: string }>): TickOverrides {
  // E8: build a set of nodes monitored by a monitoring-category neighbor.
  const monitoredNodes = new Set<string>()
  if (edges) {
    const monitorIds = new Set(nodes.filter((n) => n.category === "monitoring").map((n) => n.id))
    for (const e of edges) {
      if (monitorIds.has(e.target)) monitoredNodes.add(e.source)
      if (monitorIds.has(e.source)) monitoredNodes.add(e.target)
    }
  }
  const MONITORING_RECOVERY_FACTOR = 0.67

  const offlineNodeIds = new Set<string>()
  const latencyMultipliers = new Map<string, number>()
  for (const e of events) {
    // E8: if the target node is monitored, failure recovers 33% faster.
    const effectiveDuration = e.durationS != null && monitoredNodes.has(e.target)
      ? e.durationS * MONITORING_RECOVERY_FACTOR
      : e.durationS
    const active = timeS >= e.t && (effectiveDuration == null || timeS < e.t + effectiveDuration)
    if (!active) continue
    if (e.type === "component_failure") {
      offlineNodeIds.add(e.target)
    } else if (e.type === "az_outage") {
      for (const n of nodes) if (n.category === e.target) offlineNodeIds.add(n.id)
    } else if (e.type === "latency_spike") {
      latencyMultipliers.set(e.target, (latencyMultipliers.get(e.target) ?? 1) * (e.multiplier ?? 3))
    }
  }
  return { offlineNodeIds, latencyMultipliers }
}

/**
 * Routes `targetRps` through the graph for a single tick.
 * Directional flow (source → target): per-source-weighted entry seeding, even split at fan-out,
 * per-node shed on overload.
 * Processes nodes in topological order (Kahn); nodes in a cycle are processed once without
 * forwarding (v1 limitation — flagged for the engine's cycle handling).
 */
export function simulateTick(graph: SimGraph, tick: number, targetRps: number, overrides?: TickOverrides): TickState {
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
    // Per-source inflow seeding (ISAPivot Phase 2): when traffic-source nodes are entries, split
    // targetRps across them PROPORTIONAL to each source's rate (effectiveMaxRps = its peak rps), so a
    // 60k source pulls 20× the load of a 3k one — replacing the old flat even-split. With no traffic
    // entries (generic graphs) it stays an exact even-split across all entries — zero behavior change.
    const trafficEntries = entries.filter((id) => nodeById.get(id)?.category === "traffic")
    if (trafficEntries.length > 0) {
      const weights = trafficEntries.map((id) => Math.max(0, nodeById.get(id)?.effectiveMaxRps ?? 0))
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      if (totalWeight > 0) {
        trafficEntries.forEach((id, i) => inflow.set(id, targetRps * (weights[i] / totalWeight)))
      } else {
        const per = targetRps / trafficEntries.length
        for (const id of trafficEntries) inflow.set(id, per)
      }
    } else {
      const perEntry = targetRps / entries.length
      for (const id of entries) inflow.set(id, perEntry)
    }
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
    const offline = overrides?.offlineNodeIds.has(id) ?? false
    const latMult = overrides?.latencyMultipliers.get(id) ?? 1
    const capped = node.effectiveMaxRps > 0

    // Write/read split (E2): data-storage nodes can split traffic into writes (bottleneck at
    // primary) and reads (scale with replicas). SQL primary: writes capped at base capacity
    // (effectiveMaxRps / replicaCount, but we only have the pre-scaled value — for "primary"
    // distribution, write capacity is the base variant maxRPS, approximated as effectiveMaxRps
    // divided by the implicit replica factor). "sharded": writes use the full scaled capacity.
    let served: number
    let failed: number
    if (offline) {
      served = 0
      failed = incoming
    } else if (node.writeRatio !== undefined && node.writeRatio > 0 && capped) {
      const writeRps = incoming * node.writeRatio
      const readRps = incoming * (1 - node.writeRatio)
      // Primary distribution: writes capped at baseMaxRps (single primary node).
      // Sharded: writes use full scaled capacity (distributed across shards).
      const writeCap = node.writeDistribution === "primary"
        ? (node.baseMaxRps ?? node.effectiveMaxRps)
        : node.effectiveMaxRps
      const readCap = node.effectiveMaxRps
      const writeServed = Math.min(writeRps, writeCap)
      const readServed = Math.min(readRps, readCap)
      served = writeServed + readServed
      failed = Math.max(0, incoming - served)
    } else if (node.queueBufferSize !== undefined && node.queueBufferSize > 0 && capped) {
      // Queue backpressure (E5): excess is buffered, not shed. Overflow sheds.
      const drainRate = node.effectiveMaxRps
      served = Math.min(incoming, drainRate)
      const excess = Math.max(0, incoming - drainRate)
      const currentDepth = node.queueDepth ?? 0
      const room = Math.max(0, node.queueBufferSize - currentDepth)
      const buffered = Math.min(excess, room)
      const overflow = excess - buffered
      node.queueDepth = currentDepth + buffered
      failed = overflow
    } else if (capped) {
      served = Math.min(incoming, node.effectiveMaxRps)
      failed = Math.max(0, incoming - served)
    } else {
      served = incoming
      failed = 0
    }

    // Offline (scheduled failure / AZ outage): zero capacity → sheds all incoming traffic.
    const capacityPercent = offline ? (incoming > 0 ? 1 : 0) : capped ? incoming / node.effectiveMaxRps : 0
    let baseLatency = offline ? node.baseLatencyMs : latencyUnderLoad(node.baseLatencyMs, capacityPercent)

    // Protocol overhead (E7): different connection protocols add latency.
    if (node.protocolOverheadMs) {
      baseLatency += node.protocolOverheadMs
    }

    // Queue depth latency (E5): deeper queue = higher latency (0.01ms per buffered item).
    if (node.queueDepth && node.queueDepth > 0) {
      baseLatency += node.queueDepth * 0.01
    }

    // CDN/cache miss latency penalty (E3): add weighted miss latency on top of base.
    if (node.missLatencyPenaltyMs && node.cacheHitRatio !== undefined && node.cacheHitRatio < 1) {
      baseLatency += node.missLatencyPenaltyMs * (1 - node.cacheHitRatio)
    }

    // Serverless cold start penalty (E4): add weighted cold start latency.
    if (node.coldStartLatencyMs && node.coldStartRatio) {
      baseLatency += node.coldStartLatencyMs * node.coldStartRatio
    }

    telemetry.set(id, {
      nodeId: id,
      incomingRps: incoming,
      servedRps: served,
      failedRps: failed,
      latencyMs: baseLatency * latMult,
      capacityPercent,
      overloaded: offline ? incoming > 0 : capped && incoming > node.effectiveMaxRps,
    })
    if (forward) {
      const outs = outAdj.get(id) ?? []
      if (outs.length > 0) {
        // Cache/CDN hit ratio (E1/E3): only miss traffic is forwarded downstream.
        // Hits are absorbed locally. Default: forward all served traffic (ratio undefined or 0).
        const hitRatio = node.cacheHitRatio ?? 0
        const forwarded = hitRatio > 0 ? served * (1 - hitRatio) : served
        const perOut = forwarded / outs.length
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
  scheduledEvents: ScheduledEvent[] = [],
): SimulationResult {
  const safeTicks = Math.max(1, Math.floor(ticks))
  const frames: TickState[] = []
  for (let i = 0; i < safeTicks; i++) {
    const t = safeTicks === 1 ? 0 : (i / (safeTicks - 1)) * durationS
    const targetRps = interpolateRps(curve, t)
    // Empty events → undefined overrides → simulateTick behaves exactly as pre-Epic-16 (no regression).
    const overrides = scheduledEvents.length > 0 ? computeOverrides(graph.nodes, scheduledEvents, t, graph.edges) : undefined
    frames.push(simulateTick(graph, i, targetRps, overrides))
  }
  return { ticks: frames, entryNodeIds: findEntryNodes(graph) }
}
