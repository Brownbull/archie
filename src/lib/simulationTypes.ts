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
  /** Effective latency this tick (ms), rising with load. */
  latencyMs: number
  /** incomingRps / effectiveMaxRps (0..>1). 0 when uncapped. */
  capacityPercent: number
  /** true when incomingRps > effectiveMaxRps. */
  overloaded: boolean
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
}
