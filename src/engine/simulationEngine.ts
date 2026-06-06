import { SIM_TICKS, SIM_DEFAULT_DURATION_S, LATENCY_QUEUE_FLOOR_RHO, LATENCY_QUEUE_RHO_CAP, INTER_NODE_RTT_MS, QUEUEING_LATENCY_EPS, MAX_FLOW_PASSES, FLOW_EPSILON, OBS_DETECT_DELAY_S, OBS_RESIDUAL_BLAST, DEFAULT_REPLICATION_LAG_MS, REPLICA_LAG_WRITE_K, DEFAULT_SIM_TARGET_RPS } from "@/lib/constants"
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
  // ED4/LX4 (D74): M/M/1-style queueing curve. At/below FLOOR utilization, latency is the base (a node
  // with headroom is fast). Above FLOOR, renormalize ρ into u∈[0,1) and return base/(1−u), so latency
  // climbs steeply toward the cap — making headroom a real, teachable lever. CAP bounds it (no Infinity
  // at ρ≥1). ρ=0.5→1×, 0.75→2×, 0.9→5×, 0.95→10×, 0.99+→50×.
  if (capacityPercent <= LATENCY_QUEUE_FLOOR_RHO) return baseLatencyMs
  const rhoCapped = Math.min(capacityPercent, LATENCY_QUEUE_RHO_CAP)
  const u = (rhoCapped - LATENCY_QUEUE_FLOOR_RHO) / (1 - LATENCY_QUEUE_FLOOR_RHO)
  return baseLatencyMs / (1 - u)
}

/**
 * ED5 (D74): the REAL cache hit ratio = the variant's headline ceiling derated by the WORKLOAD —
 * cacheable fraction × read share (1−writePressure; writes can't be cached) × access-pattern erosion.
 * Every factor defaults to identity, so a graph with no workload data returns the ceiling unchanged
 * (byte-identical to pre-ED5). The headline ratio is a ceiling, never a promise.
 */
export function effectiveCacheHitRatio(ceiling: number, graph: Pick<SimGraph, "cacheableFraction" | "writePressure" | "cacheErosion">): number {
  const mult = (graph.cacheableFraction ?? 1) * (1 - (graph.writePressure ?? 0)) * (graph.cacheErosion ?? 1)
  return Math.max(0, ceiling * mult)
}

/**
 * ED6 (D74): categories that pay the cross-region RTT penalty on a multi-region run — the synchronous
 * request path (compute, data-storage, search, messaging, real-time). Edge tiers (traffic, delivery-
 * network, caching) terminate locally so they're exempt. SimNode has no typeId, so the rule is by category.
 */
const CROSS_REGION_RTT_CATEGORIES: ReadonlySet<string> = new Set([
  "compute", "data-storage", "search", "messaging", "real-time",
])

/**
 * Resolves the scheduled events active at `timeS` into per-tick overrides (Epic 16).
 * - component_failure: target node offline (sheds all traffic) — unless monitored + detected (EN7),
 *   when the blast shrinks to OBS_RESIDUAL_BLAST and the node serves the rest.
 * - az_outage: each node whose category === target loses ONE AZ → survives at (azCount−1)/azCount
 *   capacity (ED2). Monitoring shrinks even that loss to (1/azCount)×severity after detection (EN7).
 * - latency_spike: target node's latency is multiplied (default ×3), scaled by `chaosIntensity`
 *   (ISAPivot 3e): effective = 1 + (authored − 1) × chaosIntensity. chaosIntensity 1 (default) ⇒
 *   exactly the authored multiplier (byte-identical to pre-3e); 0 ⇒ inert; >1 ⇒ harsher.
 * EN7 (D74): failures run their FULL authored window `[t, t + durationS)` (no early recovery);
 * observability earns its keep by reducing the blast radius after a detection delay, not the duration.
 * Concurrent latency_spike events on the same node multiply together (×3 × ×2 = ×6).
 */
export function computeOverrides(nodes: SimNode[], events: ScheduledEvent[], timeS: number, edges?: Array<{ source: string; target: string }>, chaosIntensity: number = 1): TickOverrides {
  // E8/EN7: which nodes (and categories) sit next to a monitoring tier. Coverage is what lets
  // observability shrink a failure's blast radius after detection.
  const monitoredNodes = new Set<string>()
  const monitoredCategories = new Set<string>()
  if (edges) {
    const monitorIds = new Set(nodes.filter((n) => n.category === "monitoring").map((n) => n.id))
    for (const e of edges) {
      if (monitorIds.has(e.target)) monitoredNodes.add(e.source)
      if (monitorIds.has(e.source)) monitoredNodes.add(e.target)
    }
    for (const n of nodes) if (monitoredNodes.has(n.id)) monitoredCategories.add(n.category)
  }

  const offlineNodeIds = new Set<string>()
  const latencyMultipliers = new Map<string, number>()
  const capacityFactors = new Map<string, number>() // ED2/EN7: per-node surviving fraction during a failure
  for (const e of events) {
    // EN7 (D74): failures now run their FULL authored duration (no magic early recovery). Observability
    // instead shrinks the BLAST: a monitored failure is full-blast for OBS_DETECT_DELAY_S (detection lag),
    // then mitigated to OBS_RESIDUAL_BLAST. severity = shed fraction (1 = undetected/unmonitored).
    const active = timeS >= e.t && (e.durationS == null || timeS < e.t + e.durationS)
    if (!active) continue
    if (e.type === "latency_spike") {
      // 3e: scale the spike INTENSITY (not the raw multiplier) so chaos 0 ⇒ inert (×1), not ×0.
      const effective = 1 + ((e.multiplier ?? 3) - 1) * chaosIntensity
      latencyMultipliers.set(e.target, (latencyMultipliers.get(e.target) ?? 1) * effective)
      continue
    }
    const monitored = e.type === "component_failure" ? monitoredNodes.has(e.target) : monitoredCategories.has(e.target)
    const severity = monitored && timeS - e.t >= OBS_DETECT_DELAY_S ? OBS_RESIDUAL_BLAST : 1
    if (e.type === "component_failure") {
      // Base blast = the whole node. severity 1 ⇒ fully offline (byte-identical to pre-D74 for the
      // common unmonitored case); mitigated ⇒ the node serves (1−severity) of its capacity.
      if (severity >= 1) offlineNodeIds.add(e.target)
      else capacityFactors.set(e.target, (capacityFactors.get(e.target) ?? 1) * (1 - severity))
    } else if (e.type === "az_outage") {
      // ED2 (D74): an az_outage removes ONE availability zone (base blast 1/azCount), so a node spread
      // across azCount AZs survives at (azCount−1)/azCount. EN7: observability shrinks even that blast
      // to (1/azCount)×severity after detection — a monitored, well-spread tier barely notices.
      for (const n of nodes) {
        if (n.category !== e.target) continue
        const az = n.azCount ?? 1
        const lost = (1 / az) * severity
        capacityFactors.set(n.id, (capacityFactors.get(n.id) ?? 1) * (1 - lost))
      }
    }
  }
  return { offlineNodeIds, latencyMultipliers, capacityFactors }
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
  const parentAdj = new Map<string, string[]>() // ED1: reverse edges, for served-path latency accumulation
  const indeg = new Map<string, number>()
  for (const n of graph.nodes) {
    outAdj.set(n.id, [])
    parentAdj.set(n.id, [])
    indeg.set(n.id, 0)
  }
  for (const e of graph.edges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue
    outAdj.get(e.source)!.push(e.target)
    parentAdj.get(e.target)!.push(e.source)
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
  // Nodes left in a cycle (not reachable by Kahn). EN6 (D74) gives them a bounded fixed-point below so
  // they forward their served traffic too — closing D7's totalServedRps overcount. Any node downstream
  // of a cycle is itself cyclic (Kahn can't consume the cycle's edges to reach it), so cyclic nodes
  // forward ONLY to other cyclic nodes — the DAG pass above is never disturbed and stays exact.
  const cyclic = graph.nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)

  const telemetry = new Map<string, NodeTelemetry>()
  const process = (id: string, forward: boolean) => {
    const node = nodeById.get(id) as SimNode
    const incoming = inflow.get(id) ?? 0
    // ED2 (D74): az_outage scales effective capacity to the surviving fraction (capFactor). capFactor ≤ 0
    // (single-AZ node) — or a partial AZ hit on an UNCAPPED node (no rated capacity to fractionally keep)
    // — is treated as fully offline. Otherwise effMax = effectiveMaxRps × capFactor (capFactor 1 ⇒ unchanged).
    const capFactor = overrides?.capacityFactors?.get(id) ?? 1
    const offline = (overrides?.offlineNodeIds.has(id) ?? false) || capFactor <= 0 || (node.effectiveMaxRps === 0 && capFactor < 1)
    const latMult = overrides?.latencyMultipliers.get(id) ?? 1
    const capped = node.effectiveMaxRps > 0
    const effMax = node.effectiveMaxRps * capFactor

    // Write/read split (E2): data-storage nodes can split traffic into writes (bottleneck at
    // primary) and reads (scale with replicas). SQL primary: writes capped at base capacity
    // (effectiveMaxRps / replicaCount, but we only have the pre-scaled value — for "primary"
    // distribution, write capacity is the base variant maxRPS, approximated as effectiveMaxRps
    // divided by the implicit replica factor). "sharded": writes use the full scaled capacity.
    let served: number
    let failed: number
    let stalenessMs: number | undefined // EN4 (D74): read staleness, only on the write/read-split branch
    if (offline) {
      served = 0
      failed = incoming
    } else if (node.writeRatio !== undefined && node.writeRatio > 0 && capped) {
      // ISAPivot Phase 2b: blend the DB's intrinsic write ratio with the traffic sources' write-pressure
      // (write-heavy sources push more traffic onto the capacity-limited write path). No sources →
      // graph.writePressure undefined → the intrinsic writeRatio is used unchanged (no behavior change).
      const effWriteRatio = graph.writePressure !== undefined ? (node.writeRatio + graph.writePressure) / 2 : node.writeRatio
      const writeRps = incoming * effWriteRatio
      const readRps = incoming * (1 - effWriteRatio)
      // Primary distribution: writes capped at baseMaxRps (single primary node). Sharded: full scaled
      // capacity. Both scale by capFactor (ED2 — a lost AZ removes a fraction of write + read capacity).
      const writeCap = (node.writeDistribution === "primary"
        ? (node.baseMaxRps ?? node.effectiveMaxRps)
        : node.effectiveMaxRps) * capFactor
      const readCap = effMax
      const writeServed = Math.min(writeRps, writeCap)
      const readServed = Math.min(readRps, readCap)
      served = writeServed + readServed
      failed = Math.max(0, incoming - served)
      // EN4 (D74): read staleness = replication lag × write-pressure amplification × a BOUNDED replica
      // fan-out (log2, never linear — a linear fan-out explodes to ~2200ms and makes any target
      // unbeatable). A synchronous/low-lag variant with few replicas stays small; an async read-replica-
      // heavy build grows. Feeds the consistency gate (inert until a challenge authors consistency_target).
      const lag = node.replicationLagMs ?? DEFAULT_REPLICATION_LAG_MS
      const replicas = node.baseMaxRps && node.baseMaxRps > 0 ? node.effectiveMaxRps / node.baseMaxRps : 1
      stalenessMs = lag * (1 + effWriteRatio * REPLICA_LAG_WRITE_K) * (1 + Math.log2(Math.max(1, replicas)))
    } else if (node.queueBufferSize !== undefined && node.queueBufferSize > 0 && capped) {
      // Queue backpressure (E5): excess is buffered, not shed. Overflow sheds.
      const drainRate = effMax
      served = Math.min(incoming, drainRate)
      const excess = Math.max(0, incoming - drainRate)
      const currentDepth = node.queueDepth ?? 0
      const room = Math.max(0, node.queueBufferSize - currentDepth)
      const buffered = Math.min(excess, room)
      const overflow = excess - buffered
      node.queueDepth = currentDepth + buffered
      failed = overflow
    } else if (capped) {
      served = Math.min(incoming, effMax)
      failed = Math.max(0, incoming - served)
    } else {
      served = incoming
      failed = 0
    }

    // Offline (scheduled failure / full AZ loss): zero capacity → sheds all incoming traffic. Otherwise
    // utilization is against the surviving capacity effMax (ED2 — a lost AZ raises ρ on what remains).
    const capacityPercent = offline ? (incoming > 0 ? 1 : 0) : capped ? incoming / effMax : 0
    // W_queue (EN2): the bare queueing-curve latency, BEFORE additive terms + latMult — the latency the
    // concurrency gate uses (so a Phase-3 latency_spike multiplier can't silently collapse throughput).
    const queueLatencyMs = offline ? node.baseLatencyMs : latencyUnderLoad(node.baseLatencyMs, capacityPercent)

    // Concurrency gate (EN2, D74): a node can exhaust its connection pool BEFORE its rps cap when
    // requests are slow. In-flight = served × W/1000 (Little's law); if that exceeds the replica-scaled
    // concurrencyLimit, the excess is rejected — a SECOND saturation axis. undefined limit ⇒ no-op.
    let rejected = 0
    if (!offline && node.concurrencyLimit !== undefined && node.concurrencyLimit > 0) {
      const w = Math.max(queueLatencyMs, QUEUEING_LATENCY_EPS)
      if (served * (w / 1000) > node.concurrencyLimit) {
        const xCap = (node.concurrencyLimit * 1000) / w
        const clamped = Math.min(served, xCap)
        rejected = served - clamped
        served = clamped
        failed += rejected
      }
    }

    let baseLatency = queueLatencyMs

    // Protocol overhead (E7): different connection protocols add latency.
    if (node.protocolOverheadMs) {
      baseLatency += node.protocolOverheadMs
    }

    // Queue depth latency (E5): deeper queue = higher latency (0.01ms per buffered item).
    if (node.queueDepth && node.queueDepth > 0) {
      baseLatency += node.queueDepth * 0.01
    }

    // CDN/cache miss latency penalty (E3): add weighted miss latency on top of base. ED5: the EFFECTIVE
    // hit ratio (workload-derated) decides the miss share — a low-cacheable/write-heavy workload pays
    // the miss penalty far more often than the headline ceiling would suggest.
    if (node.missLatencyPenaltyMs && node.cacheHitRatio !== undefined) {
      const h = effectiveCacheHitRatio(node.cacheHitRatio, graph)
      if (h < 1) baseLatency += node.missLatencyPenaltyMs * (1 - h)
    }

    // Serverless cold start penalty (E4): add weighted cold start latency.
    if (node.coldStartLatencyMs && node.coldStartRatio) {
      baseLatency += node.coldStartLatencyMs * node.coldStartRatio
    }

    // ED6 (D74): cross-region hops pay an RTT penalty (authored + multi-region only; NEVER
    // auto-defaulted, so the 7 existing multi-region challenges are byte-identical). Edge/cache tiers
    // terminate locally → only the synchronous compute/data/search/messaging/real-time path pays it.
    if (graph.crossRegionRttMs !== undefined && graph.multiRegion && CROSS_REGION_RTT_CATEGORIES.has(node.category)) {
      baseLatency += graph.crossRegionRttMs
    }

    telemetry.set(id, {
      nodeId: id,
      incomingRps: incoming,
      servedRps: served,
      failedRps: failed,
      ...(rejected > 0 ? { rejectedRps: rejected } : {}),
      ...(stalenessMs !== undefined ? { stalenessMs } : {}),
      latencyMs: baseLatency * latMult,
      capacityPercent,
      overloaded: (offline ? incoming > 0 : capped && incoming > effMax) || rejected > 0,
    })
    if (forward) {
      const outs = outAdj.get(id) ?? []
      if (outs.length > 0) {
        // Cache/CDN hit ratio (E1/E3): only miss traffic is forwarded downstream. Hits are absorbed
        // locally. ED5: the EFFECTIVE (workload-derated) ratio decides — a poorly-cacheable workload
        // forwards more misses to the origin. Default: forward all served traffic (ratio undefined or 0).
        const hitRatio = node.cacheHitRatio !== undefined ? effectiveCacheHitRatio(node.cacheHitRatio, graph) : 0
        const forwarded = hitRatio > 0 ? served * (1 - hitRatio) : served
        const perOut = forwarded / outs.length
        for (const target of outs) inflow.set(target, (inflow.get(target) ?? 0) + perOut)
      }
    }
  }
  for (const id of order) process(id, true)

  // EN6 (D74): bounded fixed-point for the cyclic subgraph. The DAG pass froze each cyclic node's
  // inflow CONTRIBUTION from the DAG; here cyclic nodes additionally forward among themselves until
  // their served traffic settles (undamped Jacobi, capped at MAX_FLOW_PASSES). queueDepth is reset to
  // the tick-start value each pass so the mutation lands exactly once (no per-pass compounding).
  if (cyclic.length > 0) {
    const seedDepth = new Map(cyclic.map((id) => [id, nodeById.get(id)?.queueDepth ?? 0]))
    const dagInflow = new Map(cyclic.map((id) => [id, inflow.get(id) ?? 0]))
    let lastServed = new Map<string, number>(cyclic.map((id) => [id, 0]))
    for (let pass = 0; pass < MAX_FLOW_PASSES; pass++) {
      // Rebuild cyclic inflows: the frozen DAG contribution + forwards from cyclic peers (prev pass).
      for (const id of cyclic) inflow.set(id, dagInflow.get(id) ?? 0)
      for (const id of cyclic) {
        const node = nodeById.get(id)!
        const outs = outAdj.get(id) ?? []
        if (outs.length === 0) continue
        const hitRatio = node.cacheHitRatio !== undefined ? effectiveCacheHitRatio(node.cacheHitRatio, graph) : 0
        const fwd = hitRatio > 0 ? (lastServed.get(id) ?? 0) * (1 - hitRatio) : (lastServed.get(id) ?? 0)
        const perOut = fwd / outs.length
        for (const t of outs) inflow.set(t, (inflow.get(t) ?? 0) + perOut) // t is always cyclic
      }
      for (const id of cyclic) nodeById.get(id)!.queueDepth = seedDepth.get(id) ?? 0
      for (const id of cyclic) process(id, false)
      let change = 0
      const nowServed = new Map<string, number>()
      for (const id of cyclic) {
        const s = telemetry.get(id)?.servedRps ?? 0
        nowServed.set(id, s)
        change = Math.max(change, Math.abs(s - (lastServed.get(id) ?? 0)))
      }
      lastServed = nowServed
      if (change < FLOW_EPSILON) break
    }
  }

  const nodes = graph.nodes.map((n) => telemetry.get(n.id)!)
  const totalFailedRps = nodes.reduce((sum, t) => sum + t.failedRps, 0)
  const totalServedRps = Math.max(0, targetRps - totalFailedRps)

  // ED1/EN1 (D74): end-to-end latency = SUM along the served request path, not the worst single hop.
  // Each served-carrying edge charges INTER_NODE_RTT_MS; a node's own term is its full telemetry latency.
  // accLatency(v) = nodeLatency(v) + (servedParents ? RTT + max-parent accLatency : 0). Cache hits
  // short-circuit: a node is a COMPLETION POINT for the served fraction it does NOT forward (cache hits
  // complete at the cache; terminals complete everything). pathLatency = the traffic-weighted mean
  // accLatency over completion points, so a high-hit cache genuinely lowers it (the dominant fraction
  // completes on the short front path). Side-channel categories (monitoring/messaging/real-time) are
  // excluded — they're not where user requests complete.
  const forwardedOf = (id: string): number => {
    const n = nodeById.get(id)
    if (!n) return 0
    const served = telemetry.get(id)?.servedRps ?? 0
    if ((outAdj.get(id)?.length ?? 0) === 0) return 0
    const h = n.cacheHitRatio !== undefined ? effectiveCacheHitRatio(n.cacheHitRatio, graph) : 0
    return h > 0 ? served * (1 - h) : served
  }
  const acc = new Map<string, number>()
  const nodeLat = (id: string) => telemetry.get(id)?.latencyMs ?? 0
  for (const id of order) {
    let maxParentAcc = -1
    for (const p of parentAdj.get(id) ?? []) {
      if (forwardedOf(p) > 0 && acc.has(p)) maxParentAcc = Math.max(maxParentAcc, acc.get(p)!)
    }
    acc.set(id, nodeLat(id) + (maxParentAcc >= 0 ? INTER_NODE_RTT_MS + maxParentAcc : 0))
  }
  for (const id of cyclic) if (!acc.has(id)) acc.set(id, nodeLat(id)) // cyclic nodes contribute as terminals

  const EXCLUDED_FROM_PATH = new Set(["monitoring", "messaging", "real-time"])
  let worstHop = 0
  let pSum = 0
  let pWeight = 0
  for (const n of graph.nodes) {
    const t = telemetry.get(n.id)!
    if (t.latencyMs > worstHop) worstHop = t.latencyMs
    if (EXCLUDED_FROM_PATH.has(n.category)) continue
    const completes = t.servedRps - forwardedOf(n.id) // served fraction that terminates here
    if (completes > 0) {
      pSum += completes * (acc.get(n.id) ?? t.latencyMs)
      pWeight += completes
    }
  }
  const pathLatencyMs = pWeight > 0 ? pSum / pWeight : worstHop

  return { tick, targetRps, nodes, totalServedRps, totalFailedRps, pathLatencyMs, worstHopLatencyMs: worstHop }
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
  chaosIntensity: number = 1,
): SimulationResult {
  const safeTicks = Math.max(1, Math.floor(ticks))
  const frames: TickState[] = []
  for (let i = 0; i < safeTicks; i++) {
    const t = safeTicks === 1 ? 0 : (i / (safeTicks - 1)) * durationS
    const targetRps = interpolateRps(curve, t)
    // Empty events → undefined overrides → simulateTick behaves exactly as pre-Epic-16 (no regression).
    const overrides = scheduledEvents.length > 0 ? computeOverrides(graph.nodes, scheduledEvents, t, graph.edges, chaosIntensity) : undefined
    frames.push(simulateTick(graph, i, targetRps, overrides))
  }
  return { ticks: frames, entryNodeIds: findEntryNodes(graph) }
}
