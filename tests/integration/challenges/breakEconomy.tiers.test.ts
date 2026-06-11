import { describe, it, expect, beforeAll, vi } from "vitest"

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
import { loadLocalComponents, buildLeanSolution, scoreBuild } from "./referenceSolution"
import { minBreakingRps, feasibleBreakDials, isCategoricalCausal } from "@/services/breakProbe"
import { diffTrafficAttributes, detectSingleAttributeBreak } from "@/engine/breakDetection"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

/**
 * Break-economy journey harness (owner request 2026-06-11) — the expert-currency twin of the 3★
 * solvability proof: ONE quest per tier, the full break loop verified against the live engine on
 * the lean reference build. Each tier proves the chain a player walks:
 *   3★ (authored demand) → unchanged re-run still passes (P182 seam) → an rps boundary EXISTS →
 *   breaking just above it FAILS within the 2× precision window (the expert is collectible) →
 *   where the feasibility probe lights a categorical dial, a causal point exists for it too.
 * CURATED is the per-tier pick (owner: "one per tier first; a second per tier in a later run").
 * Picks avoid the known D35 unbreakables (heat-death, lean-at-scale) and multi-source quests.
 */
const CURATED: ReadonlyArray<{ tier: number; id: string }> = [
  { tier: 1, id: "first-service" },
  { tier: 2, id: "cache-the-hot-path" },
  { tier: 3, id: "polyglot-persistence" },
  { tier: 4, id: "search-at-scale" },
  { tier: 5, id: "foundations-mastery" },
  { tier: 6, id: "zero-budget-hero" },
]

describe("break economy per tier (D101 journey harness)", () => {
  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
  })

  it.each(CURATED)("T$tier $id: 3★ → boundary → collectible break (+ causal categorical where lit)", ({ tier, id }) => {
    const c = getAllChallenges().find((x) => x.id === id)
    expect(c, `${id} missing from the catalog`).toBeTruthy()
    expect(c!.tier, `${id} moved tiers — update CURATED`).toBe(tier)
    expect(c!.trafficSources?.length, `${id} must be single-source for the v2 economy`).toBe(1)

    const lean = buildLeanSolution(c!)
    // 1. The 3★ the player must earn first (authored spec curve — the pre-3★ scoring path).
    expect(scoreBuild(c!, lean.nodes, lean.edges).breakdown.stars, `${id}: lean build must 3★`).toBe(3)

    const spec = c!.trafficSources![0]
    const seed = (over: Record<string, unknown> = {}) =>
      lean.nodes.map((n) =>
        n.data.componentCategory === "traffic"
          ? { ...n, data: { ...n.data, trafficRps: spec.rps, trafficKind: spec.kind, trafficWorkload: spec.workload, trafficOrigin: spec.origin, ...over } }
          : n,
      ) as unknown as ArchieNode[]
    const edges = lean.edges as unknown as ArchieEdge[]

    // 2. Feasibility (includes baseline integrity: boundary must sit ABOVE authored — P182).
    const feas = feasibleBreakDials(seed(), edges, c!)
    expect(feas, `${id}: probe must resolve`).not.toBeNull()
    expect(feas!.boundary, `${id}: an rps failure boundary must exist`).not.toBeNull()
    expect(feas!.boundary!, `${id}: unchanged post-3★ re-run must still pass (boundary above authored)`).toBeGreaterThan(spec.rps)
    expect(feas!.rps, `${id}: the rps dial must be feasible`).toBe(true)

    // 3. The collectible break: a value just past the boundary, inside the 2× precision window.
    const breakRps = Math.min(Math.round(feas!.boundary! * 1.1), 2 * feas!.boundary!)
    const broken = seed({ trafficRps: breakRps })
    expect(diffTrafficAttributes(broken, c!.trafficSources!), `${id}: only rps deviates`).toEqual(new Set(["rps"]))
    const boundary = minBreakingRps(broken, edges, c!)
    expect(boundary, `${id}: the hook's boundary search must bracket`).not.toBeNull()
    expect(breakRps, `${id}: the break value pays (≤2× boundary)`).toBeLessThanOrEqual(2 * boundary!)
    // Legacy detection agrees this is a single-attribute break shape (multi-source quests' path).
    expect(detectSingleAttributeBreak(broken, c!, { passedMetrics: false })).toBe("rps")

    // 4. Where the probe lights a categorical dial, a causal point must really exist.
    const testLoad = Math.max(spec.rps, Math.floor(feas!.boundary! * 0.97))
    for (const [attr, key, alternatives] of [
      ["kind", "trafficKind", ["steady", "realistic", "periodic", "search"]],
      ["workload", "trafficWorkload", ["read", "write", "mixed"]],
    ] as const) {
      if (!feas![attr]) continue
      const causalAlt = alternatives.some((v) =>
        v !== spec[attr] && isCategoricalCausal(seed({ trafficRps: testLoad, [key]: v }), edges, c!, attr),
      )
      expect(causalAlt, `${id}: feasibility lit "${attr}" but no causal alternative found at 0.97×boundary`).toBe(true)
    }
  })
})
