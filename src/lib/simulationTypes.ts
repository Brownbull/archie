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
