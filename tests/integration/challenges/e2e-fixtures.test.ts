import { describe, it, beforeAll, expect, vi } from "vitest"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { dump } from "js-yaml"
const { mockComponentRepo, emptyRepo } = vi.hoisted(() => ({ mockComponentRepo: { getAll: vi.fn(), getById: vi.fn(), getByCategory: vi.fn() }, emptyRepo: { getAll: vi.fn() } }))
vi.mock("@/repositories/componentRepository", () => ({ componentRepository: mockComponentRepo }))
vi.mock("@/repositories/stackRepository", () => ({ stackRepository: emptyRepo }))
vi.mock("@/repositories/blueprintRepository", () => ({ blueprintRepository: emptyRepo }))
vi.mock("@/repositories/metricCategoryRepository", () => ({ metricCategoryRepository: emptyRepo }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
import { getAllChallenges } from "@/services/challengeLoader"
import { componentLibrary } from "@/services/componentLibrary"
import { MAX_REPLICAS } from "@/lib/constants"
import { loadLocalComponents, buildClearingSolution, scoreBuild, toArchitectureFixture, capReplicas } from "./referenceSolution"

/**
 * Generates + verifies the tier-3 and tier-4 E2E fixtures used by challenge-disconnect-budget.spec.ts.
 * Mirrors the capstone fixture generator (capstone-completion.test.ts) — writes the SAME
 * toArchitectureFixture the production Import UI accepts, and asserts each is a real 3★ build so the
 * E2E's "baseline 3★ then disconnect" premise can't silently rot. Re-runs on every test pass, so
 * engine/challenge changes keep the fixtures fresh.
 *
 * The disconnect spec deletes ONE specific edge per fixture to orphan a paid leaf node, so each build
 * here MUST keep the edge ids the generator assigns (e0, e1, …) — toArchitectureFixture preserves them
 * and the importer preserves them, so the spec can target `rf__edge-<id>` deterministically.
 */
const DIR = join(process.cwd(), "tests/e2e/fixtures/challenges")
const CASES = [
  { id: "edge-delivery", file: "edge-delivery.architecture.yaml" },   // tier 3
  { id: "production-ai", file: "production-ai.architecture.yaml" },   // tier 4 (the user's LLM scenario)
] as const

describe("tier-3 + tier-4 E2E fixtures are generated + 3★", () => {
  beforeAll(async () => { mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents()); emptyRepo.getAll.mockResolvedValue([]); await componentLibrary.initialize() })
  for (const { id, file } of CASES) {
    it(`${id} clearing build writes a 3★ fixture`, () => {
      const c = getAllChallenges().find((x) => x.id === id)
      expect(c, `challenge ${id} must exist`).toBeTruthy()
      const build = buildClearingSolution(c!, MAX_REPLICAS)
      expect(scoreBuild(c!, build.nodes, build.edges).breakdown.stars, `${id} reference build should be 3★`).toBe(3)
      writeFileSync(join(DIR, file), dump(toArchitectureFixture(c!, capReplicas(build.nodes, MAX_REPLICAS), build.edges)))
    })
  }
})
