import { describe, it, expect, beforeAll, vi } from "vitest"
import { writeFileSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Same mocked-repo setup as the solvability harness — load LOCAL component YAMLs, not Firestore.
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
import { computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"
import { loadLocalComponents, buildClearingSolution } from "./referenceSolution"
import type { ChallengePar } from "@/lib/challengePar"

/**
 * "Par" generator + freshness guard (LX3, D74). Par = the lean reference build's monthly cost +
 * node count — the achievable benchmark the results modal shows after 3★ so a learner can tell a
 * lean clear from a wasteful one. Committed at `src/data/challengePar.generated.json` and imported by
 * the app. Regenerate with `UPDATE_PAR=1 npx vitest run challengePar` whenever the builder or any
 * challenge changes (part of the D75 re-calibration exit gate).
 */
const PAR_PATH = join(__dirname, "../../../src/data/challengePar.generated.json")

function computePar(): Record<string, ChallengePar> {
  const out: Record<string, ChallengePar> = {}
  for (const c of getAllChallenges()) {
    const { nodes } = buildClearingSolution(c, MAX_REPLICAS)
    out[c.id] = { cost: Math.round(computeTotalArchitectureCost(nodes as never)), nodes: nodes.length }
  }
  return out
}

describe("challenge par (LX3 reference benchmark)", () => {
  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
  })

  it("committed par is fresh (regenerate with UPDATE_PAR=1 if this fails)", () => {
    const computed = computePar()
    if (process.env.UPDATE_PAR) {
      writeFileSync(PAR_PATH, JSON.stringify(computed, null, 2) + "\n")
      return
    }
    const committed = JSON.parse(readFileSync(PAR_PATH, "utf8")) as Record<string, ChallengePar>
    expect(committed).toEqual(computed)
  })
})
