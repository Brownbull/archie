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
  baseLatencyMs: number
  failureMode: FailureMode
}

/** A directed edge: traffic flows source → target. */
export interface SimEdge {
  source: string
  target: string
}

export interface SimGraph {
  nodes: SimNode[]
  edges: SimEdge[]
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
