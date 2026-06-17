import type { Challenge, ChallengeTrafficSource, StarBreakdown } from "@/lib/challengeTypes"

/**
 * Break-it loop detection (Phase 4 P4-S1, D94).
 *
 * After a quest is 3★'d, the player is invited to BREAK the same build by modifying exactly ONE
 * traffic attribute away from the challenge's authored spec — rps (peak), kind (shape), workload
 * (read/write/mixed), or origin (one/multi-region) — and re-running. A "break" = the re-run FAILS
 * its base pass (uptime/latency targets missed) with exactly one attribute changed. Each attribute
 * can be "collected" once per challenge; each earns expert currency (never hint stars).
 *
 * Detection is PURE and read-only: it diffs the live canvas traffic nodes against the authored
 * trafficSources and inspects the already-computed StarBreakdown. It never touches scoring — the
 * D66 golden + 62/62-3★ invariants can't move.
 */

/** The four player-modifiable traffic attributes, in display order. */
export const BREAK_ATTRIBUTES = ["rps", "kind", "workload", "origin"] as const
export type BreakAttribute = (typeof BREAK_ATTRIBUTES)[number]

/** Player-facing names for the four dials — shared by the results modal + Quest Log surfacing. */
export const BREAK_ATTRIBUTE_LABELS: Record<BreakAttribute, string> = {
  rps: "Peak RPS",
  kind: "Shape",
  workload: "Workload",
  origin: "Origin",
}

/** Minimal traffic-node shape the detector reads (the canvas node's data fields). */
export interface TrafficNodeLike {
  data: {
    componentCategory: string
    trafficRps?: number
    trafficKind?: string
    trafficWorkload?: string
    trafficOrigin?: string
  }
}

/**
 * Diffs the live traffic nodes against the challenge's authored sources, attribute-wise.
 * Matching is positional within each attribute: for every attribute we compare the SORTED
 * multiset of authored values against the sorted multiset of live values, so swapping which
 * node carries which value doesn't count as a change, but any value differing does.
 * Returns the set of attributes whose live values deviate from the authored spec.
 */
export function diffTrafficAttributes(
  nodes: readonly TrafficNodeLike[],
  authored: readonly ChallengeTrafficSource[],
): Set<BreakAttribute> {
  const live = nodes.filter((n) => n.data.componentCategory === "traffic")
  const changed = new Set<BreakAttribute>()
  if (authored.length === 0 || live.length !== authored.length) {
    // Node count changed (added/removed a source) — that's a structural edit, not a single-attribute
    // break; report every attribute as changed so the single-attribute check below can never pass.
    for (const a of BREAK_ATTRIBUTES) changed.add(a)
    return changed
  }
  const multiset = (vals: ReadonlyArray<string | number | undefined>) =>
    [...vals].map((v) => String(v ?? "")).sort().join("|")
  const pairs: Array<[BreakAttribute, (s: ChallengeTrafficSource) => string | number, (n: TrafficNodeLike) => string | number | undefined]> = [
    ["rps", (s) => s.rps, (n) => n.data.trafficRps],
    ["kind", (s) => s.kind, (n) => n.data.trafficKind],
    ["workload", (s) => s.workload, (n) => n.data.trafficWorkload],
    ["origin", (s) => s.origin, (n) => n.data.trafficOrigin],
  ]
  for (const [attr, fromSpec, fromNode] of pairs) {
    if (multiset(authored.map(fromSpec)) !== multiset(live.map(fromNode))) changed.add(attr)
  }
  return changed
}

/**
 * The loop's verdict for one post-3★ re-run:
 * - `null` — not a break (run passed, or zero/multiple attributes changed).
 * - otherwise the single attribute that was modified AND produced a failing run.
 */
export function detectSingleAttributeBreak(
  nodes: readonly TrafficNodeLike[],
  challenge: Pick<Challenge, "trafficSources">,
  breakdown: Pick<StarBreakdown, "passedMetrics">,
): BreakAttribute | null {
  if (breakdown.passedMetrics) return null // the build held — no break
  const authored = challenge.trafficSources ?? []
  if (authored.length === 0) return null // legacy curve-only challenge — no authored spec to diff
  const changed = diffTrafficAttributes(nodes, authored)
  if (changed.size !== 1) return null // untouched, or a combination — one attribute at a time
  return [...changed][0]
}

/** Per-challenge record of which attributes have produced a collected break. */
export type BreaksRecord = Partial<Record<BreakAttribute, true>>

/** True when this attribute's break hasn't been collected yet for the challenge. */
export function isNewBreak(record: BreaksRecord | undefined, attribute: BreakAttribute): boolean {
  return !record?.[attribute]
}

/** The attributes still uncollected for a challenge, in display order (the "try these next" list).
 *  `dials` scopes to the quest's collectible set (challengeBreakDials) — defaults to all four. */
export function remainingBreakAttributes(record: BreaksRecord | undefined, dials: readonly BreakAttribute[] = BREAK_ATTRIBUTES): BreakAttribute[] {
  return dials.filter((a) => isNewBreak(record, a))
}

/**
 * D102 — the global break-method registry's vocabulary. A "way of breaking" is VALUE-level:
 * the rps dial is one way regardless of magnitude; each categorical VALUE is its own way
 * (periodic bursts ≠ steady saturation ≠ search spikes — different failure modes, separately
 * earnable). Resilience conditions fold in as `resilience-<conditionId>`. Each pays ONCE
 * game-wide; afterward it's knowledge the registry carries quest to quest.
 */
export type BreakMethodId = string

export function breakMethodId(
  attribute: BreakAttribute,
  nodes: readonly TrafficNodeLike[],
): BreakMethodId {
  if (attribute === "rps") return "rps-overload"
  const t = nodes.find((n) => n.data.componentCategory === "traffic")
  if (attribute === "kind") return `shape-${t?.data.trafficKind ?? "unknown"}`
  if (attribute === "workload") return `workload-${t?.data.trafficWorkload ?? "unknown"}`
  return "origin-multi-region"
}

export function resilienceMethodId(conditionId: string): BreakMethodId {
  return `resilience-${conditionId}`
}

/** Display labels for registry surfaces; resilience methods resolve via the failure preset name. */
export const BREAK_METHOD_LABELS: Readonly<Record<string, string>> = {
  "rps-overload": "Peak-RPS overload",
  "shape-steady": "Steady saturation",
  "shape-periodic": "Periodic bursts",
  "shape-search": "Search spikes",
  "shape-realistic": "Realistic bursts",
  "workload-read": "Read storm",
  "workload-write": "Write storm",
  "workload-mixed": "Mixed pressure",
  "origin-multi-region": "Multi-region spread",
  // D103/B — mechanic ways (component-class failure modes, earnable at first encounter):
  "pool-exhaustion": "Pool exhaustion",
}

export function breakMethodLabel(methodId: BreakMethodId): string {
  if (methodId.startsWith("resilience-")) return `Survived-condition: ${methodId.slice("resilience-".length)}`
  return BREAK_METHOD_LABELS[methodId] ?? methodId
}

const ALL_SHAPE_VALUES = ["steady", "realistic", "periodic", "search"] as const
const ALL_WORKLOAD_VALUES = ["read", "write", "mixed"] as const

/**
 * For each dial, returns the set of method IDs that a player could trigger by changing from the
 * authored value to any alternative. rps has one method; categorical dials have N-1 alternatives.
 * `authoredSource` is the quest's single authored traffic source (only single-source quests use the
 * break economy). Returns null for multi-source quests.
 */
export function alternativeMethodIds(
  attribute: BreakAttribute,
  authoredSource: { kind: string; workload: string; origin: string },
): BreakMethodId[] {
  if (attribute === "rps") return ["rps-overload"]
  if (attribute === "kind") return ALL_SHAPE_VALUES.filter((v) => v !== authoredSource.kind).map((v) => `shape-${v}`)
  if (attribute === "workload") return ALL_WORKLOAD_VALUES.filter((v) => v !== authoredSource.workload).map((v) => `workload-${v}`)
  return authoredSource.origin === "one-region" ? ["origin-multi-region"] : []
}

/**
 * Checks whether ALL alternative method IDs for a dial are already in the game-wide break registry.
 * Returns true when attempting this dial cannot earn expert currency (every possible value is known).
 */
export function isDialFullyKnown(
  attribute: BreakAttribute,
  authoredSource: { kind: string; workload: string; origin: string },
  breakMethods: Readonly<Record<string, unknown>>,
): boolean {
  const alts = alternativeMethodIds(attribute, authoredSource)
  return alts.length > 0 && alts.every((id) => !!breakMethods[id])
}
