import { describe, it, expect, beforeAll, vi } from "vitest"

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
import { MAX_REPLICAS } from "@/lib/constants"
import { loadLocalComponents, scoreSolution } from "./referenceSolution"

/**
 * Phase 4 solvability harness (ISAPivot, sub-slice 4a) — the safety net for the recast.
 *
 * For each built-in challenge it constructs a generic, over-provisioned REFERENCE SOLUTION (see
 * referenceSolution.ts) from the challenge's own required_components + required_types, runs the REAL
 * simulation + scorer, and asserts the attempt CLEARS (≥1★ — base pass: metrics met + required types
 * present + no forbidden block).
 *
 * CRITICAL (D71): the reference solution is scored with every node capped at MAX_REPLICAS — the same
 * ceiling the architecture-import schema + the replica stepper enforce in the UI. A challenge is only
 * "clearable" if a player can actually BUILD a passing architecture within the canvas budget (≤50
 * nodes, ≤20 replicas/node). Before D71 the harness scored UNCAPPED, which let 5 absurd capstones ship
 * tuned to 4–9M rps — clearable only with 1,000s of replicas no player could place. Capping here is
 * what guarantees every authored challenge is genuinely beatable, not just theoretically solvable.
 *
 * It is a smoke test, not a balance oracle: clearing means "a sensible, well-provisioned, buildable
 * architecture passes", not "the intended minimal solution".
 */
describe("Phase 4 solvability harness — every built-in challenge is clearable (4a)", () => {
  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
  })

  const challenges = getAllChallenges().slice().sort((a, b) => a.id.localeCompare(b.id))

  it("loads all 58 built-in challenges", () => {
    expect(challenges.length).toBe(58)
  })

  for (const c of challenges) {
    it(`is 3★-completable "${c.id}" (${c.difficulty}) within the UI replica budget`, () => {
      const { breakdown, stats, maxReplica } = scoreSolution(c, { replicaCap: MAX_REPLICAS })
      expect(
        breakdown.stars,
        `${c.id}: stars=${breakdown.stars} passedMetrics=${breakdown.passedMetrics} ` +
          `underBudget=${breakdown.underBudget} cleanTopology=${breakdown.cleanTopology} ` +
          `hasRequiredBlocks=${breakdown.hasRequiredBlocks} maxReplica=${maxReplica}/${MAX_REPLICAS} ` +
          `uptime=${stats.uptimePercent.toFixed(1)}/${c.targetMetrics.uptimePercent} ` +
          `p99=${Math.round(stats.p99LatencyMs)}/${c.targetMetrics.p99LatencyMs}`,
      ).toBe(3)
    })
  }
})
