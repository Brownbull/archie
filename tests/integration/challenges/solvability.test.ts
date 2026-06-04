import { describe, it, expect, beforeAll, vi } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { load } from "js-yaml"

// The real componentRepository reads Firestore (components were reseeded there); in tests we load the
// LOCAL authoring YAMLs instead and feed them through componentLibrary.initialize() via mocked repos.
const { mockComponentRepo, emptyRepo } = vi.hoisted(() => ({
  mockComponentRepo: { getAll: vi.fn(), getById: vi.fn(), getByCategory: vi.fn() },
  emptyRepo: { getAll: vi.fn() },
}))
vi.mock("@/repositories/componentRepository", () => ({ componentRepository: mockComponentRepo }))
vi.mock("@/repositories/stackRepository", () => ({ stackRepository: emptyRepo }))
vi.mock("@/repositories/blueprintRepository", () => ({ blueprintRepository: emptyRepo }))
vi.mock("@/repositories/metricCategoryRepository", () => ({ metricCategoryRepository: emptyRepo }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

import { getAllChallenges } from "@/services/challengeLoader"
import { componentLibrary } from "@/services/componentLibrary"
import { ComponentYamlSchema, type Component } from "@/schemas/componentSchema"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import { buildSimGraph, computeTotalArchitectureCost, evaluateTopology, buildTrafficCurveFromSpecs } from "@/stores/architectureStoreHelpers"
import { runSimulation } from "@/engine/simulationEngine"
import { computeSimStats } from "@/lib/simulationStats"
import { evaluateAttempt } from "@/engine/rubricScorer"
import { SIM_TICKS } from "@/lib/constants"
import type { Challenge } from "@/lib/challengeTypes"
import type { ComponentCategoryId } from "@/lib/constants"

/** Parse every local component authoring YAML into a validated Component (no Firestore). */
function loadLocalComponents(): Component[] {
  const dir = join(process.cwd(), "src/data/components")
  const out: Component[] = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const parsed = load(readFileSync(join(dir, file), "utf-8"))
    const result = ComponentYamlSchema.safeParse(parsed)
    if (result.success) out.push(result.data)
  }
  return out
}

/**
 * Phase 4 solvability harness (ISAPivot, sub-slice 4a) — the safety net for the recast.
 *
 * For each built-in challenge it constructs a generic, over-provisioned REFERENCE SOLUTION from the
 * challenge's own required_components + required_types, runs the REAL simulation + scorer, and asserts
 * the attempt CLEARS (≥1★ — base pass: metrics met + required types present + no forbidden block).
 *
 * This locks the current solvability baseline BEFORE Phase 4b/4c recast + harden the challenges, so any
 * future change that makes a challenge unclearable by a reasonable architecture fails here (the analog
 * of 3f's golden snapshot for scoring). It is a smoke test, not a balance oracle: clearing means
 * "a sensible, well-provisioned architecture passes", not "the intended minimal solution".
 */

// A representative TYPE id to place for each required_components CATEGORY (categories aren't scored
// directly, but a functional solution needs a node of each to route traffic through realistically).
const CATEGORY_PRIMARY_TYPE: Record<string, string> = {
  traffic: "traffic-source",
  "delivery-network": "load-balancer",
  compute: "compute",
  "data-storage": "relational-db",
  caching: "cache",
  search: "search-engine",
  messaging: "message-queue",
  "real-time": "realtime",
  monitoring: "observability",
  "auth-security": "auth",
}

// The synchronous spine, ordered FRONT of compute. cdn + cache sit ahead of compute so their hits are
// served terminally (the sim absorbs hits locally, only misses forward) — stacked cdn(~0.90)+cache(~0.92)
// absorb ~99% of reads, which is what lets a reference solution survive a full compute az_outage.
const FRONT_SPINE = ["dns", "cdn", "cache", "api-gateway", "auth", "rate-limiter", "load-balancer"]
// Categories placed AFTER compute (compute fans out to them).
const DATA_CATEGORIES = new Set(["data-storage", "search"])
// Async tiers (messaging / real-time) are placed for required-type PRESENCE but left OFF the sync path
// (unwired), so an az_outage on them — e.g. async-backbone's messaging outage — cannot shed the
// synchronous request traffic. They are simply never added to the spine below.

interface RefNode {
  id: string
  type: "archie"
  position: { x: number; y: number }
  data: { archieComponentId: string; activeConfigVariantId: string; componentCategory: ComponentCategoryId; replicaCount: number; trafficRps?: number; trafficWorkload?: string }
}

type Variant = { id: string; maxRPS?: number; cacheHitRatio?: number }

/**
 * Pick the configVariant for a node. For cache-capable types (cdn/cache) we maximize the cache HIT
 * RATIO — hits are served terminally, so a high-hit-ratio front tier is what survives a compute
 * outage. (The max-throughput CDN variant has NO hit ratio, so "biggest" would be useless here.)
 * For everything else we over-provision throughput.
 */
function pickVariant(component: { configVariants: Variant[] }, typeId: string): Variant {
  const variants = component.configVariants
  if (typeId === "cdn" || typeId === "cache") {
    const withRatio = variants.filter((v) => (v.cacheHitRatio ?? 0) > 0)
    if (withRatio.length > 0) {
      return withRatio.reduce((best, v) => ((v.cacheHitRatio ?? 0) > (best.cacheHitRatio ?? 0) ? v : best))
    }
  }
  return variants.reduce((best, v) => ((v.maxRPS ?? 0) > (best.maxRPS ?? 0) ? v : best), variants[0])
}

/**
 * The traffic curve the GAME actually runs: when a challenge declares typed trafficSources, the load
 * is derived from them (peak-anchored, summed) — overriding the authored trafficCurve, exactly as
 * ChallengeStartButton does. So the harness validates the real recast load, not the legacy curve.
 */
function challengeCurve(c: Challenge) {
  return c.trafficSources && c.trafficSources.length > 0
    ? buildTrafficCurveFromSpecs(c.trafficSources, c.durationSeconds)
    : c.trafficCurve
}

function curvePeak(c: Challenge): number {
  return challengeCurve(c).reduce((m, p) => Math.max(m, p.rps), 0)
}

/** Build a node for a TYPE id via its default provider, sized to cover `peak` rps. */
function refNode(idSuffix: string, typeId: string, peak: number, trafficRps?: number): RefNode | null {
  const type = COMPONENT_TYPES.get(typeId)
  if (!type) return null
  const component = componentLibrary.getComponent(type.defaultProviderId)
  if (!component || component.configVariants.length === 0) return null
  const variant = pickVariant(component as never, typeId)
  const perNode = variant.maxRPS && variant.maxRPS > 0 ? variant.maxRPS : peak || 1
  const replicaCount = Math.max(1, Math.ceil((peak || 1) / perNode))
  return {
    id: `n-${idSuffix}`,
    type: "archie",
    position: { x: 0, y: 0 },
    data: {
      archieComponentId: component.id,
      activeConfigVariantId: variant.id,
      componentCategory: component.category as ComponentCategoryId,
      replicaCount,
      ...(trafficRps !== undefined ? { trafficRps } : {}),
    },
  }
}

/** Construct an over-provisioned, resilience-fronted reference solution for a challenge. */
function buildSolution(c: Challenge): { nodes: RefNode[]; edges: Array<{ id: string; source: string; target: string }> } {
  const peak = curvePeak(c)
  // availableBlocks hard-gates the player's palette; a faithful reference solution only uses allowed
  // types. Empty availableBlocks ⇒ unrestricted.
  const allowed = c.availableBlocks.length > 0 ? new Set(c.availableBlocks) : null
  const canUse = (t: string) => allowed === null || allowed.has(t)
  const catOf = (t: string) => COMPONENT_TYPES.get(t)?.category

  // Pick an allowed representative TYPE for a required category (prefer the canonical primary).
  const repForCategory = (cat: string): string | undefined => {
    const primary = CATEGORY_PRIMARY_TYPE[cat]
    if (primary && canUse(primary)) return primary
    if (allowed) for (const t of allowed) if (catOf(t) === cat) return t
    return primary
  }

  // TYPE ids to place: required categories + explicit required types + compute, then resilience fronting
  // (stacked cdn + cache when allowed — survives compute outages, cuts latency).
  const wanted = new Set<string>(["traffic-source", "compute"])
  for (const cat of c.requiredComponents) {
    const t = repForCategory(cat)
    if (t) wanted.add(t)
  }
  for (const t of c.requiredTypes) wanted.add(t)
  for (const t of ["cdn", "cache"]) if (canUse(t)) wanted.add(t)

  const nodes: RefNode[] = []
  const idByType = new Map<string, string>()
  for (const t of wanted) {
    const n = refNode(t, t, peak, t === "traffic-source" ? peak : undefined)
    if (n) {
      nodes.push(n)
      idByType.set(t, n.id)
    }
  }

  const id = (t: string) => idByType.get(t)
  const present = (t: string) => idByType.has(t)
  const placed = [...idByType.keys()]
  const computeTypes = placed.filter((t) => catOf(t) === "compute")
  const dataTypes = placed.filter((t) => DATA_CATEGORIES.has(catOf(t) ?? ""))

  const edges: Array<{ id: string; source: string; target: string }> = []
  let ei = 0
  const link = (source?: string, target?: string) => {
    if (!source || !target || source === target) return
    edges.push({ id: `e${ei++}`, source, target })
  }

  // Sync spine: traffic → [front spine, ordered] → [compute chain] → fan out to data nodes.
  const front = FRONT_SPINE.filter(present)
  const chain = [id("traffic-source"), ...front.map(id), ...computeTypes.map(id)].filter(Boolean) as string[]
  for (let i = 0; i < chain.length - 1; i++) link(chain[i], chain[i + 1])
  const primaryCompute = computeTypes.map(id).find(Boolean) ?? id("compute")
  for (const d of dataTypes) link(primaryCompute, id(d))
  // Observability monitors compute (E8 monitoring-recovery helps uptime through failures).
  if (present("observability")) link(primaryCompute, id("observability"))
  // Async tiers (messaging / real-time) stay OFF the sync path: present for required-type coverage,
  // but no synchronous traffic flows through them, so their outage cannot shed the request path.

  return { nodes, edges }
}

function scoreSolution(c: Challenge) {
  const { nodes, edges } = buildSolution(c)
  const graph = buildSimGraph(nodes, edges)
  const result = runSimulation(graph, challengeCurve(c), undefined, c.durationSeconds, c.scheduledEvents, c.chaosIntensity)
  const stats = computeSimStats(result.ticks, result.ticks.length - 1)
  const { topologyIssues } = evaluateTopology(nodes, edges)
  const totalCost = computeTotalArchitectureCost(nodes)
  const canvasTypeIds = new Set<string>()
  const typeByNodeId = new Map<string, string>()
  for (const n of nodes) {
    const typeId = componentLibrary.getComponent(n.data.archieComponentId)?.typeId
    if (typeId) {
      canvasTypeIds.add(typeId)
      typeByNodeId.set(n.id, typeId)
    }
  }
  const requestCount = stats.totalServed * (c.durationSeconds / SIM_TICKS)
  const costPerRequest = requestCount > 0 ? totalCost / requestCount : undefined
  const breakdown = evaluateAttempt(stats, c, topologyIssues.length, totalCost, canvasTypeIds, costPerRequest, {
    typeByNodeId,
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  })
  return { breakdown, stats, nodeCount: nodes.length }
}

describe("Phase 4 solvability harness — every built-in challenge is clearable (4a)", () => {
  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
  })

  const challenges = getAllChallenges().slice().sort((a, b) => a.id.localeCompare(b.id))

  it("loads all 41 built-in challenges", () => {
    expect(challenges.length).toBe(41)
  })

  for (const c of challenges) {
    it(`clears "${c.id}" (${c.difficulty}) with a reference solution`, () => {
      const { breakdown, stats } = scoreSolution(c)
      expect(
        breakdown.stars,
        `${c.id}: stars=${breakdown.stars} passedMetrics=${breakdown.passedMetrics} ` +
          `hasRequiredBlocks=${breakdown.hasRequiredBlocks} uptime=${stats.uptimePercent.toFixed(1)}/${c.targetMetrics.uptimePercent} ` +
          `p99=${Math.round(stats.p99LatencyMs)}/${c.targetMetrics.p99LatencyMs}`,
      ).toBeGreaterThanOrEqual(1)
    })
  }
})
