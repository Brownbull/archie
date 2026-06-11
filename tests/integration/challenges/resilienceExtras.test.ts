import { describe, it, beforeAll, expect, vi } from "vitest"
const { mockComponentRepo, emptyRepo } = vi.hoisted(() => ({ mockComponentRepo: { getAll: vi.fn(), getById: vi.fn(), getByCategory: vi.fn() }, emptyRepo: { getAll: vi.fn() } }))
vi.mock("@/repositories/componentRepository", () => ({ componentRepository: mockComponentRepo }))
vi.mock("@/repositories/stackRepository", () => ({ stackRepository: emptyRepo }))
vi.mock("@/repositories/blueprintRepository", () => ({ blueprintRepository: emptyRepo }))
vi.mock("@/repositories/metricCategoryRepository", () => ({ metricCategoryRepository: emptyRepo }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

import { getAllChallenges } from "@/services/challengeLoader"
import { componentLibrary } from "@/services/componentLibrary"
import { MAX_REPLICAS } from "@/lib/constants"
import { loadLocalComponents, buildClearingSolution, scoreBuild, buildRedundantSolution, capReplicas } from "./referenceSolution"
import { computeBreakingFailures } from "@/services/failureImpact"
import { isKnownFailurePresetId } from "@/services/failureLoader"

/**
 * P4-S7 (D94) resilience-extras harness — the curated catalog's twin guarantees:
 *  - CLEARABLE: a 3★-valid build exists (the redundant reference) whose metric probe survives the
 *    condition — the extra can actually be earned, with provisioning a player can reach.
 *  - NON-TRIVIAL: the LEAN 3★ reference does NOT survive it — the extra demands hardening beyond
 *    the cheapest clear, so the +1 expert is earned, not handed out.
 * The curation table below is the LOCKSTEP mirror of the YAMLs' resilience_conditions — adding or
 * changing an authored condition without updating (and re-proving) it here fails CI.
 */
const CURATED: Record<string, string[]> = {
  "edge-delivery": ["failure-traffic-spike"],
  "edge-resilience": ["failure-traffic-spike"],
  "follow-the-sun": ["failure-data-corruption"],
}

describe("resilience extras (P4-S7 / D94)", () => {
  beforeAll(async () => { mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents()); emptyRepo.getAll.mockResolvedValue([]); await componentLibrary.initialize() })

  it("the authored catalog matches the curated table exactly (lockstep)", () => {
    const authored: Record<string, string[]> = {}
    for (const c of getAllChallenges()) {
      if (c.resilienceConditions?.length) authored[c.id] = [...c.resilienceConditions].sort()
    }
    expect(authored).toEqual(CURATED)
  })

  it("every curated condition is a known failure preset", () => {
    for (const conditions of Object.values(CURATED)) {
      for (const id of conditions) expect(isKnownFailurePresetId(id), id).toBe(true)
    }
  })

  for (const [qid, conditions] of Object.entries(CURATED)) {
    for (const condition of conditions) {
      it(`${qid} + ${condition}: clearable by a hardened 3★ build, NOT by the lean one`, () => {
        const c = getAllChallenges().find((x) => x.id === qid)!
        expect(c, `challenge ${qid} must exist`).toBeTruthy()

        // NON-TRIVIAL: the lean 3★ reference still breaks under the condition.
        const lean = buildClearingSolution(c, MAX_REPLICAS)
        expect(scoreBuild(c, lean.nodes, lean.edges).breakdown.stars, `${qid} lean build must be 3★`).toBe(3)
        const leanBreaking = computeBreakingFailures(lean.nodes as never, lean.edges as never)
        expect(leanBreaking.has(condition), `${qid}: ${condition} no longer breaks the lean build — the extra became free currency; re-curate`).toBe(true)

        // CLEARABLE: the hardened (redundant) build holds 3★ AND survives the condition.
        const hardened = buildRedundantSolution(c, 2)
        const nodes = capReplicas(hardened.nodes, MAX_REPLICAS)
        expect(scoreBuild(c, nodes, hardened.edges).breakdown.stars, `${qid} hardened build must be 3★`).toBe(3)
        const hardenedBreaking = computeBreakingFailures(nodes as never, hardened.edges as never)
        expect(hardenedBreaking.has(condition), `${qid}: the hardened build no longer clears ${condition} — the extra became unearnable; re-curate`).toBe(false)
      })
    }
  }
})
