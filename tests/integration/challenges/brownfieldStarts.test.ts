import { describe, it, beforeAll, expect, vi } from "vitest"
const { mockComponentRepo, emptyRepo } = vi.hoisted(() => ({ mockComponentRepo: { getAll: vi.fn(), getById: vi.fn(), getByCategory: vi.fn() }, emptyRepo: { getAll: vi.fn() } }))
vi.mock("@/repositories/componentRepository", () => ({ componentRepository: mockComponentRepo }))
vi.mock("@/repositories/stackRepository", () => ({ stackRepository: emptyRepo }))
vi.mock("@/repositories/blueprintRepository", () => ({ blueprintRepository: emptyRepo }))
vi.mock("@/repositories/metricCategoryRepository", () => ({ metricCategoryRepository: emptyRepo }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

import { getAllChallenges } from "@/services/challengeLoader"
import { componentLibrary } from "@/services/componentLibrary"
import { makeChallengeCanvas } from "@/services/challengeCanvasSeed"
import { loadLocalComponents, scoreBuild } from "./referenceSolution"

/**
 * Brownfield-start quality gates (P5-S1, D95). For every quest that authors `initial_architecture`:
 *  - REAL COMPONENTS: the seed hydrates with zero placeholders — every component id resolves, so the
 *    player never inherits a gray ghost block.
 *  - NEEDS WORK: the inherited build as-seeded scores BELOW 3★ on its own quest — a brownfield start
 *    is a problem to solve, never a pre-completed freebie (the P4-S7 non-triviality principle).
 * Vacuous while no quest authors a seed; bites the moment P5-S2 content lands.
 */
describe("brownfield starts — authored seed quality (P5-S1)", () => {
  beforeAll(async () => { mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents()); emptyRepo.getAll.mockResolvedValue([]); await componentLibrary.initialize() })

  it("every authored seed hydrates clean and scores <3★ as-inherited", () => {
    const brownfield = getAllChallenges().filter((c) => (c.initialArchitecture?.nodes.length ?? 0) > 0)
    for (const c of brownfield) {
      const { nodes, edges } = makeChallengeCanvas(c)
      const placeholders = nodes.filter((n) => n.type === "archie-placeholder" || !n.data.activeConfigVariantId)
      expect(placeholders, `${c.id}: seed has unresolvable components: ${placeholders.map((n) => n.data.archieComponentId).join(", ")}`).toHaveLength(0)

      const refNodes = nodes.map((n) => ({ id: n.id, data: { ...n.data, replicaCount: n.data.replicaCount ?? 1 } }))
      const refEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
      const { breakdown } = scoreBuild(c, refNodes as never, refEdges as never)
      expect(breakdown.stars, `${c.id}: the inherited build already scores ${breakdown.stars}★ — a brownfield start must NEED work`).toBeLessThan(3)
    }
    // Visibility: how many seeds this gate actually covered (0 until P5-S2 authors content).
    expect(brownfield.length).toBeGreaterThanOrEqual(0)
  })
})

describe("seed self-coherence (Phase 5 review #1)", () => {
  it("no authored seed contains its own quest's forbidden types or restricted vendors", () => {
    for (const c of getAllChallenges()) {
      if (!c.initialArchitecture?.nodes.length) continue
      for (const n of c.initialArchitecture.nodes) {
        const typeId = componentLibrary.getComponent(n.componentId)?.typeId
        expect(
          typeId && c.forbiddenTypes?.includes(typeId),
          `${c.id}: authored seed places forbidden type "${typeId}" (${n.componentId})`,
        ).toBeFalsy()
        expect(
          c.restrictedVendors?.includes(n.componentId),
          `${c.id}: authored seed places restricted vendor "${n.componentId}"`,
        ).toBeFalsy()
      }
    }
  })
})
