import { describe, it, expect, beforeAll, vi } from "vitest"
import { writeFileSync, readFileSync } from "node:fs"
import { join } from "node:path"

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
import { loadLocalComponents, buildLeanSolution } from "./referenceSolution"
import { feasibleBreakDials } from "@/services/breakProbe"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

/**
 * Quest-level break dials — generator + freshness guard (owner request 2026-06-11: "only two
 * should be the number we can earn on this quest, configured at the quest level"). For each
 * SINGLE-SOURCE quest, the collectible dial set = what can fell the LEAN reference build (the
 * same per-build probe the invite uses, run against the canonical build). Committed at
 * `src/data/challengeBreakDials.generated.json`; the app sizes the Expert ledger, chips, and
 * collection gate from it. Multi-source / sourceless quests have no entry (legacy all-4 economy).
 * Regenerate with `UPDATE_BREAK_DIALS=1 npx vitest run breakDials` after engine or quest changes.
 */
const OUT_PATH = join(__dirname, "../../../src/data/challengeBreakDials.generated.json")

function computeDials(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const c of getAllChallenges()) {
    if ((c.trafficSources?.length ?? 0) !== 1) continue
    const lean = buildLeanSolution(c)
    const spec = c.trafficSources![0]
    const nodes = lean.nodes.map((n) =>
      n.data.componentCategory === "traffic"
        ? { ...n, data: { ...n.data, trafficRps: spec.rps, trafficKind: spec.kind, trafficWorkload: spec.workload, trafficOrigin: spec.origin } }
        : n,
    ) as unknown as ArchieNode[]
    const feas = feasibleBreakDials(nodes, lean.edges as unknown as ArchieEdge[], c)
    if (!feas) continue
    out[c.id] = (["rps", "kind", "workload", "origin"] as const).filter((d) => feas[d])
  }
  return out
}

describe("challenge break dials (quest-level expert economy)", () => {
  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
  })

  it("committed dials are fresh (regenerate with UPDATE_BREAK_DIALS=1 if this fails)", () => {
    const computed = computeDials()
    if (process.env.UPDATE_BREAK_DIALS) {
      writeFileSync(OUT_PATH, JSON.stringify(computed, null, 2) + "\n")
      return
    }
    const committed = JSON.parse(readFileSync(OUT_PATH, "utf8"))
    expect(committed).toEqual(computed)
  })
})
