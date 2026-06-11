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
import { loadLocalComponents, buildClearingSolution, capReplicas } from "./referenceSolution"
import { computeBreakingFailures } from "@/services/failureImpact"
import { getAllFailurePresets } from "@/services/failureLoader"

/**
 * P4-S4 real-data sanity: the failure-impact probe runs the REAL recalculation pipeline over a real
 * reference build without throwing, returns only known preset ids, and is deterministic. Deliberately
 * NO exact-set assertion — metric retunes may legitimately shift which conditions break a given lean
 * build, and the per-preset glow is a hint, not a graded contract.
 */
describe("failure-impact probe on a real reference build (P4-S4)", () => {
  beforeAll(async () => { mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents()); emptyRepo.getAll.mockResolvedValue([]); await componentLibrary.initialize() })

  it("probes the edge-delivery reference build: valid ids, deterministic", () => {
    const c = getAllChallenges().find((x) => x.id === "edge-delivery")!
    const build = buildClearingSolution(c, MAX_REPLICAS)
    const nodes = capReplicas(build.nodes, MAX_REPLICAS)
    const known = new Set(getAllFailurePresets().map((p) => p.id))
    expect(known.size).toBeGreaterThan(0)

    const first = computeBreakingFailures(nodes as never, build.edges as never)
    for (const id of first) expect(known.has(id)).toBe(true)
    const second = computeBreakingFailures(nodes as never, build.edges as never)
    expect([...second].sort()).toEqual([...first].sort())
  })
})
