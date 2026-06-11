import { describe, it, beforeAll, expect, vi } from "vitest"
const { mockComponentRepo, emptyRepo } = vi.hoisted(() => ({ mockComponentRepo: { getAll: vi.fn(), getById: vi.fn(), getByCategory: vi.fn() }, emptyRepo: { getAll: vi.fn() } }))
vi.mock("@/repositories/componentRepository", () => ({ componentRepository: mockComponentRepo }))
vi.mock("@/repositories/stackRepository", () => ({ stackRepository: emptyRepo }))
vi.mock("@/repositories/blueprintRepository", () => ({ blueprintRepository: emptyRepo }))
vi.mock("@/repositories/metricCategoryRepository", () => ({ metricCategoryRepository: emptyRepo }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

import { getAllChallenges } from "@/services/challengeLoader"
import { componentLibrary } from "@/services/componentLibrary"
import { loadLocalComponents } from "./referenceSolution"

/**
 * Progressive-chain coherence gates (P5-S5, D95). For every authored chain:
 *  - exactly ONE stage-1 root;
 *  - every continues_from names a member of the SAME chain with a strictly lower stage (a DAG by
 *    construction — no cycles, no cross-chain grafts);
 *  - the build parent is also a knowledge gate: continues_from ∈ requires, so a stage can never be
 *    PLAYABLE before the build it grows from is even unlocked;
 *  - every member is reachable from the root (no orphaned stages).
 * 3★-solvability of each member is already pinned by the global harness.
 */
describe("progressive chains — authored coherence (P5-S5)", () => {
  beforeAll(async () => { mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents()); emptyRepo.getAll.mockResolvedValue([]); await componentLibrary.initialize() })

  it("every authored chain is a rooted, requires-gated DAG", () => {
    const all = getAllChallenges()
    const byChain = new Map<string, typeof all>()
    for (const c of all) {
      if (!c.chain) continue
      byChain.set(c.chain.id, [...(byChain.get(c.chain.id) ?? []), c])
    }
    expect(byChain.size, "at least one chain ships from P5-S5 on").toBeGreaterThanOrEqual(1)

    for (const [chainId, members] of byChain) {
      const roots = members.filter((m) => m.chain!.stage === 1)
      expect(roots, `${chainId}: exactly one stage-1 root`).toHaveLength(1)

      const memberIds = new Set(members.map((m) => m.id))
      for (const m of members) {
        if (m.chain!.stage === 1) continue
        const parentId = m.chain!.continuesFrom!
        const parent = members.find((x) => x.id === parentId)
        expect(memberIds.has(parentId), `${chainId}/${m.id}: continues_from "${parentId}" must be a member of the same chain`).toBe(true)
        expect(parent!.chain!.stage, `${chainId}/${m.id}: must continue from a LOWER stage`).toBeLessThan(m.chain!.stage)
        expect(m.requires.includes(parentId), `${chainId}/${m.id}: the build parent must also be a requires gate`).toBe(true)
      }

      // Reachability from the root via continues_from edges.
      const reachable = new Set([roots[0].id])
      let grew = true
      while (grew) {
        grew = false
        for (const m of members) {
          if (!reachable.has(m.id) && m.chain!.continuesFrom && reachable.has(m.chain!.continuesFrom)) {
            reachable.add(m.id)
            grew = true
          }
        }
      }
      expect(reachable.size, `${chainId}: every stage reachable from the root`).toBe(members.length)
    }

    // The shipped data-backbone chain is the FORKED one the owner chose — pin the fork exists.
    const backbone = byChain.get("data-backbone")
    expect(backbone, "data-backbone chain must exist").toBeTruthy()
    const forkChildren = backbone!.filter((m) => m.chain!.continuesFrom === "event-stream")
    expect(forkChildren.length, "data-backbone forks after event-stream (≥2 branches)").toBeGreaterThanOrEqual(2)
  })
})

describe("seed/gate coherence (Phase 5 review #1)", () => {
  it("no chain stage forbids/restricts what its parent's reference build uses", async () => {
    const { buildClearingSolution } = await import("./referenceSolution")
    const { MAX_REPLICAS } = await import("@/lib/constants")
    const all = getAllChallenges()
    for (const child of all) {
      if (!child.chain?.continuesFrom) continue
      const parent = all.find((x) => x.id === child.chain!.continuesFrom)!
      const parentBuild = buildClearingSolution(parent, MAX_REPLICAS)
      for (const n of parentBuild.nodes) {
        const typeId = componentLibrary.getComponent(n.data.archieComponentId)?.typeId
        expect(
          typeId && child.forbiddenTypes?.includes(typeId),
          `${child.id} forbids "${typeId}" — its chain parent ${parent.id}'s reference build uses it (inherited 0★ trap)`,
        ).toBeFalsy()
        expect(
          child.restrictedVendors?.includes(n.data.archieComponentId),
          `${child.id} restricts "${n.data.archieComponentId}" — its chain parent ${parent.id}'s reference build uses it`,
        ).toBeFalsy()
      }
    }
  })
})
