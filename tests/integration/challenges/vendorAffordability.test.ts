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
import { MAX_REPLICAS } from "@/lib/constants"
import { loadLocalComponents, buildClearingSolution, buildLeanSolution, scoreBuild } from "./referenceSolution"
import { tierPrice } from "@/lib/vendorPricing"
import { poolExhaustionCausal } from "@/services/breakProbe"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

/**
 * D103 — progression can never price a quest out of reach. For every quest, EITHER its clearing
 * build works with FREE items only (default vendor + base tier, replicas re-scaled), OR the star
 * cost of the unconstrained clearing build's premium tiers is coverable by the stars earnable from
 * the quest's requires-closure (3★ per prerequisite). Reference builds use default VENDORS by
 * construction, so vendor prices (and the Expert-only elite gate) never enter the bound.
 */
describe("vendor/tier affordability (D103 no-soft-lock gate)", () => {
  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
  })

  it("every quest is free-clearable OR affordable from its closure's stars", () => {
    const challenges = getAllChallenges()
    const byId = new Map(challenges.map((c) => [c.id, c]))
    const closureSize = (id: string, seen = new Set<string>()): number => {
      for (const r of byId.get(id)?.requires ?? []) {
        if (!seen.has(r)) {
          seen.add(r)
          closureSize(r, seen)
        }
      }
      return seen.size
    }
    const failures: string[] = []
    for (const c of challenges) {
      const build = buildClearingSolution(c, MAX_REPLICAS)
      // free-constrained attempt
      const freeNodes = build.nodes.map((n) => {
        const comp = componentLibrary.getComponent(n.data.archieComponentId)
        const base = comp?.configVariants[0]
        if (!base || n.data.componentCategory === "traffic") return n
        const oldV = comp.configVariants.find((v) => v.id === n.data.activeConfigVariantId)
        const ratio = (oldV?.maxRPS ?? 1) / (base.maxRPS ?? 1)
        const replicas = Math.min(MAX_REPLICAS, Math.max(1, Math.ceil((n.data.replicaCount ?? 1) * ratio)))
        return { ...n, data: { ...n.data, activeConfigVariantId: base.id, replicaCount: replicas } }
      })
      if (scoreBuild(c, freeNodes as never, build.edges as never).breakdown.stars === 3) continue
      // paid path: premium tiers of DEFAULT vendors only
      let cost = 0
      for (const n of build.nodes) {
        const comp = componentLibrary.getComponent(n.data.archieComponentId)
        if (!comp?.typeId || n.data.componentCategory === "traffic") continue
        cost += tierPrice(comp.typeId, comp.id, n.data.activeConfigVariantId).stars ?? 0
      }
      const earnable = 3 * closureSize(c.id)
      if (cost > earnable) failures.push(`${c.id}: needs ${cost}★ but only ${earnable}★ earnable before it`)
    }
    expect(failures).toEqual([])
  })

  it("pool-exhaustion's seeded build fails BECAUSE of the pool (the way is earnable there)", () => {
    const c = getAllChallenges().find((x) => x.id === "pool-exhaustion")!
    const seed = c.initialArchitecture!
    const nodes = seed.nodes.map((n) => {
      const comp = componentLibrary.getComponent(n.componentId)!
      return {
        id: n.id,
        type: "archie",
        position: n.position,
        data: {
          archieComponentId: n.componentId,
          activeConfigVariantId: n.configVariantId ?? comp.configVariants[0].id,
          componentName: comp.name,
          componentCategory: comp.category,
          replicaCount: n.replicas ?? 1,
          ...(n.trafficRps !== undefined ? { trafficRps: n.trafficRps, trafficKind: n.trafficKind } : {}),
        },
      }
    }) as unknown as ArchieNode[]
    const edges = seed.edges.map((e) => ({ id: e.id, source: e.sourceNodeId, target: e.targetNodeId })) as unknown as ArchieEdge[]
    expect(poolExhaustionCausal(nodes, edges, c, true)).toBe(true)
  })

  it("a pool-free build never claims the way (first-service lean)", () => {
    const c = getAllChallenges().find((x) => x.id === "first-service")!
    const lean = buildLeanSolution(c)
    expect(poolExhaustionCausal(lean.nodes as unknown as ArchieNode[], lean.edges as unknown as ArchieEdge[], c, true)).toBe(false)
  })
})
