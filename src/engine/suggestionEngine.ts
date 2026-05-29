import { buildSimGraph, computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"
import { runSimulation } from "@/engine/simulationEngine"
import { computeSimStats, type SimulationStats } from "@/lib/simulationStats"
import { componentLibrary } from "@/services/componentLibrary"
import { getScalingRule, MIN_REPLICAS, MAX_REPLICAS, type ComponentCategoryId } from "@/lib/constants"
import type { TrafficCurve, ScheduledEvent } from "@/lib/simulationTypes"
import type { ChallengeTargetMetrics } from "@/lib/challengeTypes"

/**
 * Shadow-simulation suggestion engine (Epic 17 Phase 1).
 *
 * Pure + deterministic: treats the current canvas as a frozen baseline, enumerates a small,
 * bounded set of single-lever candidate changes (replica ±1, swap to a cheaper / bigger variant),
 * re-runs the existing simulation engine for each, and returns the single best net-positive change
 * with its {uptime, latency, cost} deltas. No store/UI/IO/auth, no randomness — same inputs,
 * same suggestion.
 *
 * Ranking is challenge-aware when targetMetrics are supplied: if the baseline already passes
 * (uptime ≥ target AND p99 ≤ target), only cost-saving changes that KEEP it passing qualify; if it
 * fails, only changes that improve toward / achieve a pass qualify. Without targets it falls back to
 * a weighted net-improvement score (uptime up, latency down, cost down).
 */

/** Minimal node shape — structurally matches buildSimGraph + computeTotalArchitectureCost inputs. */
export interface SuggestionNode {
  id: string
  data: {
    archieComponentId: string
    activeConfigVariantId: string
    componentCategory: ComponentCategoryId
    replicaCount?: number
  }
}
export interface SuggestionEdge {
  source: string
  target: string
}

export type SuggestionChangeType = "add-replica" | "remove-replica" | "cheaper-variant" | "bigger-variant"

export interface ArchitectureSuggestion {
  changeType: SuggestionChangeType
  nodeId: string
  /** Human-readable, e.g. "Add a replica to App Server (2× → 3×)". */
  description: string
  /** Percentage points vs baseline (positive = better). */
  uptimeDelta: number
  /** p99 ms vs baseline (negative = better). */
  latencyDelta: number
  /** $/mo vs baseline (negative = better). */
  costDelta: number
}

export interface SuggestionInput {
  nodes: ReadonlyArray<SuggestionNode>
  edges: ReadonlyArray<SuggestionEdge>
  curve: TrafficCurve
  scheduledEvents?: ScheduledEvent[]
  durationS?: number
  /** When present, rank against the challenge rubric (pass-first). */
  targetMetrics?: ChallengeTargetMetrics
}

export interface SuggestionResult {
  kind: "suggestion" | "well-optimized"
  best: ArchitectureSuggestion | null
  baseline: SimulationStats
  baselineCost: number
  /** Number of candidate changes simulated. */
  considered: number
}

const EPS = 1e-6
// Default-mode normalization (no challenge targets): how many ms / $ count as "one unit" of gain.
const LAT_SCALE = 50
const COST_SCALE = 50
const W_UPTIME = 1
const W_LATENCY = 1
const W_COST = 0.5

interface Candidate extends ArchitectureSuggestion {
  passed: boolean
  weightedGain: number
}

function isScalable(category: ComponentCategoryId): boolean {
  const rule = getScalingRule(category)
  return rule.scalable && rule.replicaType !== "none"
}

function replaceNode(
  nodes: ReadonlyArray<SuggestionNode>,
  id: string,
  patch: Partial<SuggestionNode["data"]>,
): SuggestionNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
}

function statsFor(
  nodes: ReadonlyArray<SuggestionNode>,
  input: SuggestionInput,
): { stats: SimulationStats; cost: number } {
  const graph = buildSimGraph(nodes, input.edges)
  const result = runSimulation(graph, input.curve, undefined, input.durationS, input.scheduledEvents)
  return { stats: computeSimStats(result.ticks, result.ticks.length - 1), cost: computeTotalArchitectureCost(nodes) }
}

function nodeName(archieComponentId: string): string {
  return componentLibrary.getComponent(archieComponentId)?.name ?? archieComponentId
}

/** Build the bounded candidate node-sets, each a single immutable lever pulled on one node. */
function buildCandidates(input: SuggestionInput): Array<{ changeType: SuggestionChangeType; nodeId: string; description: string; nodes: SuggestionNode[] }> {
  const out: Array<{ changeType: SuggestionChangeType; nodeId: string; description: string; nodes: SuggestionNode[] }> = []
  for (const n of input.nodes) {
    const replicas = n.data.replicaCount ?? 1
    const name = nodeName(n.data.archieComponentId)
    const scalable = isScalable(n.data.componentCategory)

    if (scalable && replicas < MAX_REPLICAS) {
      out.push({ changeType: "add-replica", nodeId: n.id, description: `Add a replica to ${name} (${replicas}× → ${replicas + 1}×)`, nodes: replaceNode(input.nodes, n.id, { replicaCount: replicas + 1 }) })
    }
    if (scalable && replicas > MIN_REPLICAS) {
      out.push({ changeType: "remove-replica", nodeId: n.id, description: `Remove a replica from ${name} (${replicas}× → ${replicas - 1}×)`, nodes: replaceNode(input.nodes, n.id, { replicaCount: replicas - 1 }) })
    }

    const variants = componentLibrary.getComponent(n.data.archieComponentId)?.configVariants ?? []
    // If the active variant can't be resolved (corrupted/stale id), we can't reason about relative
    // swaps — replica candidates above still apply; variant candidates are intentionally skipped.
    const current = variants.find((v) => v.id === n.data.activeConfigVariantId)
    if (current) {
      // Cheaper: the lowest-cost variant strictly cheaper than the current; on cost ties, the one
      // with the most capacity (better value for the same price).
      if (current.monthlyCost !== undefined) {
        const cheaper = variants
          .filter((v) => v.monthlyCost !== undefined && v.monthlyCost < current.monthlyCost!)
          .sort((a, b) => a.monthlyCost! - b.monthlyCost! || (b.maxRPS ?? 0) - (a.maxRPS ?? 0))[0]
        if (cheaper) {
          out.push({ changeType: "cheaper-variant", nodeId: n.id, description: `Switch ${name} to a cheaper variant (${current.name} → ${cheaper.name})`, nodes: replaceNode(input.nodes, n.id, { activeConfigVariantId: cheaper.id }) })
        }
      }
      // Bigger: the next variant up in capacity (smallest maxRPS strictly greater than current); on
      // capacity ties, the cheapest (don't recommend a needlessly pricier equivalent).
      if (current.maxRPS !== undefined) {
        const bigger = variants
          .filter((v) => v.maxRPS !== undefined && v.maxRPS > current.maxRPS!)
          .sort((a, b) => a.maxRPS! - b.maxRPS! || (a.monthlyCost ?? Infinity) - (b.monthlyCost ?? Infinity))[0]
        if (bigger) {
          out.push({ changeType: "bigger-variant", nodeId: n.id, description: `Scale up ${name}'s variant (${current.name} → ${bigger.name})`, nodes: replaceNode(input.nodes, n.id, { activeConfigVariantId: bigger.id }) })
        }
      }
    }
  }
  return out
}

function passes(stats: SimulationStats, target: ChallengeTargetMetrics): boolean {
  return stats.uptimePercent >= target.uptimePercent - EPS && stats.p99LatencyMs <= target.p99LatencyMs + EPS
}

export function suggestArchitectureChange(input: SuggestionInput): SuggestionResult {
  const base = statsFor(input.nodes, input)
  const baseResult: Pick<SuggestionResult, "baseline" | "baselineCost"> = { baseline: base.stats, baselineCost: base.cost }

  const rawCandidates = buildCandidates(input)
  const target = input.targetMetrics
  const basePassed = target ? passes(base.stats, target) : true

  const evaluated: Candidate[] = rawCandidates.map((c) => {
    const r = statsFor(c.nodes, input)
    const uptimeDelta = r.stats.uptimePercent - base.stats.uptimePercent
    const latencyDelta = r.stats.p99LatencyMs - base.stats.p99LatencyMs
    const costDelta = r.cost - base.cost
    const weightedGain = W_UPTIME * uptimeDelta + W_LATENCY * (-latencyDelta / LAT_SCALE) + W_COST * (-costDelta / COST_SCALE)
    return { changeType: c.changeType, nodeId: c.nodeId, description: c.description, uptimeDelta, latencyDelta, costDelta, passed: target ? passes(r.stats, target) : true, weightedGain }
  })

  const qualifying = evaluated.filter((c) => {
    if (target) {
      if (basePassed) {
        // Already passing → only suggest a saving that keeps it passing AND does not degrade
        // latency (a cheaper-but-slower change is not an improvement for a healthy system).
        return c.passed && c.costDelta < -EPS && c.latencyDelta <= EPS
      }
      // Failing → only suggest progress toward / achievement of a pass.
      return c.passed || c.uptimeDelta > EPS || c.latencyDelta < -EPS
    }
    return c.weightedGain > EPS
  })

  if (qualifying.length === 0) {
    return { kind: "well-optimized", best: null, ...baseResult, considered: evaluated.length }
  }

  const best = pickBest(qualifying, Boolean(target), basePassed)
  const { passed: _p, weightedGain: _g, ...suggestion } = best
  return { kind: "suggestion", best: suggestion, ...baseResult, considered: evaluated.length }
}

function pickBest(candidates: Candidate[], hasTarget: boolean, basePassed: boolean): Candidate {
  const sorted = [...candidates].sort((a, b) => {
    if (hasTarget && !basePassed) {
      // Prefer achieving a pass, then biggest uptime gain, then biggest latency cut, then cheaper.
      if (a.passed !== b.passed) return a.passed ? -1 : 1
      if (Math.abs(a.uptimeDelta - b.uptimeDelta) > EPS) return b.uptimeDelta - a.uptimeDelta
      if (Math.abs(a.latencyDelta - b.latencyDelta) > EPS) return a.latencyDelta - b.latencyDelta
      return a.costDelta - b.costDelta
    }
    if (hasTarget && basePassed) {
      // All still pass → prefer the biggest saving, then the lowest latency.
      if (Math.abs(a.costDelta - b.costDelta) > EPS) return a.costDelta - b.costDelta
      return a.latencyDelta - b.latencyDelta
    }
    // No target → maximize the weighted net improvement.
    return b.weightedGain - a.weightedGain
  })
  return sorted[0]
}
