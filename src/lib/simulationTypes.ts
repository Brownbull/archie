import type { ComponentCategoryId } from "@/lib/constants"

// --- Traffic curve (Epic 15) ---

/** A point on a time-varying traffic curve. `t` is seconds from start; `rps` is target requests/sec. */
export interface TrafficCurvePoint {
  t: number
  rps: number
}

export type TrafficCurve = TrafficCurvePoint[]

// --- Capacity model (per node, derived from variant + replicas) ---

export type FailureMode = "shed" | "queue" | "crash"

// --- Simulation graph (an immutable snapshot the engine runs over) ---

/** A node as the engine sees it — capacity already resolved (variant.maxRPS × replicaFactor). */
export interface SimNode {
  id: string
  category: ComponentCategoryId
  /** Effective max requests/sec (0 = unknown/uncapped → treated as no limit). */
  effectiveMaxRps: number
  /** Unscaled variant maxRPS (before replica multiplication). Used for write-primary bottleneck (E2). */
  baseMaxRps?: number
  baseLatencyMs: number
  failureMode: FailureMode
  /**
   * Cache hit ratio (0–1). When set, only `(1 - cacheHitRatio)` of served traffic is forwarded
   * downstream (cache misses). Hits are absorbed locally. Applies to cache and CDN nodes (E1/E3).
   */
  cacheHitRatio?: number
  /**
   * Write ratio (0–1). When set, incoming traffic is split: writes = incoming × writeRatio,
   * reads = incoming × (1 - writeRatio). Write capacity depends on writeDistribution (E2).
   */
  writeRatio?: number
  /**
   * How writes are distributed. "primary": writes capped at base capacity (single primary,
   * replicas help reads only — SQL model). "sharded": writes scale with replicas like reads
   * (sharded NoSQL model). Default: undefined (no split, all traffic uniform).
   */
  writeDistribution?: "primary" | "sharded"
  /** Queue buffer size. When set, excess traffic is buffered instead of shed. Overflow sheds (E5). */
  queueBufferSize?: number
  /** Current queue depth (mutable across ticks in a multi-tick run; 0 at start). */
  queueDepth?: number
  /** Additional latency (ms) added for cache/CDN misses, weighted by miss ratio (E3). */
  missLatencyPenaltyMs?: number
  /** Protocol overhead latency (ms) added to base latency — HTTP > gRPC > TCP (E7). */
  protocolOverheadMs?: number
  /** Cold start latency penalty (ms) for serverless on-demand invocations (E4). */
  coldStartLatencyMs?: number
  /** Fraction of requests that hit a cold start (0–1). Default 0 = no cold starts (E4). */
  coldStartRatio?: number
  /**
   * Concurrency ceiling (EN2, D74): max in-flight requests, replica-scaled. When set, the node sheds
   * (connection-pool exhaustion) once `served × W/1000` (Little's law, W = queueing latency) exceeds it
   * — a SECOND saturation axis besides the rps cap. undefined ⇒ no concurrency limit (gate is a no-op).
   */
  concurrencyLimit?: number
  /**
   * Availability-zone spread (ED2, D74): how many AZs this node's replicas occupy (1–MAX_AZ_COUNT).
   * An az_outage removes ONE AZ, so the node survives at (azCount−1)/azCount capacity — spreading a tier
   * across AZs is what lets it ride out a zone failure. Derived from replicaCount. undefined ⇒ 1 (single AZ).
   */
  azCount?: number
  /**
   * Replication lag (ms) for a read-replicated data tier (EN4, D74): the base staleness a read replica
   * lags the primary. A synchronous/strong variant sets a low value; an async read-replica a high one.
   * Feeds the consistency staleness model in the write/read-split branch. undefined ⇒ DEFAULT_REPLICATION_LAG_MS.
   */
  replicationLagMs?: number
}

/** A directed edge: traffic flows source → target. */
export interface SimEdge {
  source: string
  target: string
}

export interface SimGraph {
  nodes: SimNode[]
  edges: SimEdge[]
  /**
   * Global write-pressure (0–1) derived from the traffic sources' workloads (rps-weighted: write=1,
   * mixed=0.5, read=0). ISAPivot Phase 2b: blended into a DB's intrinsic writeRatio so write-heavy
   * sources push more load onto the write path. Absent (undefined) when there are no traffic sources
   * → the write/read split uses the node's intrinsic writeRatio unchanged (no behavior change).
   */
  writePressure?: number
  /**
   * ED5 (D74): global cacheable-fraction (0–1), rps-weighted across traffic sources (default 1 per
   * source). With writePressure + cacheErosion it derates a cache's headline hit ratio to its REAL one.
   * Absent ⇒ 1 (no derate from cacheability).
   */
  cacheableFraction?: number
  /**
   * ED5 (D74): global access-pattern erosion (0–1), rps-weighted across traffic sources from each
   * source's `kind` (steady 1.0, realistic 0.9, periodic 0.8, search 0.5). Long-tail/spiky patterns
   * have poor cache locality → lower effective hit ratio. Absent ⇒ 1 (no erosion).
   */
  cacheErosion?: number
  /**
   * Cross-region RTT penalty (ms) added per cross-region hop (ED6, D74). Applies ONLY to hops whose
   * category is compute/data-storage/search/messaging/real-time (NOT traffic/delivery-network/caching —
   * edge tiers terminate locally). Authored per challenge (`cross_region_rtt_ms`); NEVER auto-defaulted,
   * so a challenge that omits it (incl. the 7 existing multi-region ones) is byte-identical.
   */
  crossRegionRttMs?: number
  /** ED6 (D74): whether this run spans regions (gates crossRegionRttMs). Authored alongside the RTT. */
  multiRegion?: boolean
}

// --- Per-tick telemetry ---

export interface NodeTelemetry {
  nodeId: string
  /** Requests/sec arriving at this node this tick. */
  incomingRps: number
  /** Requests/sec the node served (≤ capacity). */
  servedRps: number
  /** Requests/sec shed because they exceeded capacity. */
  failedRps: number
  /** Requests/sec rejected by the concurrency gate — connection-pool exhaustion (EN2). Subset of failedRps. */
  rejectedRps?: number
  /** Effective latency this tick (ms), rising with load. */
  latencyMs: number
  /** incomingRps / effectiveMaxRps (0..>1). 0 when uncapped. */
  capacityPercent: number
  /** true when incomingRps > effectiveMaxRps. */
  overloaded: boolean
  /** Read staleness (ms) at a read-replicated data tier (EN4, D74): replication lag amplified by
   *  write-pressure + a bounded replica fan-out. Only emitted for write/read-split nodes; feeds the
   *  consistency scoring gate. Absent on tiers with no replication-lag model. */
  stalenessMs?: number
  /** Retry load (rps) re-offered to this node by downstream sheds during an outage (EN3, D74) — the
   *  thundering-herd amplification. 0/absent outside an active cascade. */
  retriedRps?: number
}

export interface TickState {
  /** 0-based tick index. */
  tick: number
  /** Target requests/sec injected at entry nodes this tick (from the curve). */
  targetRps: number
  nodes: NodeTelemetry[]
  /** Requests/sec that completed without being shed anywhere. */
  totalServedRps: number
  /** Requests/sec shed at any hop this tick. */
  totalFailedRps: number
  /**
   * End-to-end latency this tick (ED1/EN1, D74): traffic-weighted mean of the SUMMED per-node latency
   * along the served path to each completion point (+ inter-node RTT per edge). Optional only so legacy
   * fixtures without it fall back to worst-hop; `simulateTick` always populates it.
   */
  pathLatencyMs?: number
  /** Worst single-hop node latency this tick (the pre-ED1 system-latency metric), kept for telemetry. */
  worstHopLatencyMs?: number
}

export interface SimulationResult {
  ticks: TickState[]
  /** Node IDs with no incoming edge — where traffic is injected. Empty = no entry (no traffic). */
  entryNodeIds: string[]
}

// --- Scheduled failure events (Epic 16 Challenge Mode) ---

export type ScheduledEventType = "component_failure" | "latency_spike" | "az_outage"

export interface ScheduledEvent {
  /** Seconds from start when the event begins. */
  t: number
  type: ScheduledEventType
  /** Target node id (component_failure / latency_spike) or category id (az_outage). */
  target: string
  /** Duration in seconds; omit for "until the end of the run". */
  durationS?: number
  /** Latency multiplier for latency_spike (default 3). Ignored by other types. */
  multiplier?: number
}

/** Per-tick simulation overrides derived from the scheduled events active at that tick. */
export interface TickOverrides {
  offlineNodeIds: Set<string>
  latencyMultipliers: Map<string, number>
  /**
   * ED2 (D74): per-node surviving capacity FRACTION during an az_outage — `(azCount−1)/azCount`. A node
   * spread across 3 AZs survives at 0.667; a single-AZ node at 0. Optional so legacy override literals
   * (and the two existing test fixtures) keep compiling; absent ⇒ full capacity (1).
   */
  capacityFactors?: Map<string, number>
  /**
   * EN3 (D74): node ids that DAMP retry amplification — they sit next to a breaker (monitoring or
   * rate-limiter), so when traffic downstream of them sheds, the re-offered retry uses the damped
   * multiplier instead of the full one. Absent ⇒ no damping anywhere.
   */
  breakerNodeIds?: Set<string>
}
