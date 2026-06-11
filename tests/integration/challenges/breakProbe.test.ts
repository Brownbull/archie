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
import { loadLocalComponents, buildLeanSolution } from "./referenceSolution"
import { minBreakingRps, isCategoricalCausal, rawTrafficRps } from "@/services/breakProbe"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

/**
 * D101 break-probe — ENGINE-TRUTH pins on first-service's lean build (ground truth measured
 * 2026-06-11: the realistic-shape boundary sits ≈154 rps; no categorical dial can fell it alone).
 * These pins hold the probe to the live engine, so the precision gate can't silently drift.
 */
describe("breakProbe (D101)", () => {
  let c: ReturnType<typeof getAllChallenges>[number]
  let nodes: ArchieNode[]
  let edges: ArchieEdge[]

  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
    c = getAllChallenges().find((x) => x.id === "first-service")!
    const lean = buildLeanSolution(c)
    nodes = lean.nodes as unknown as ArchieNode[]
    edges = lean.edges as unknown as ArchieEdge[]
  })

  // A real canvas traffic node carries the full dial set (the challenge seeds them); the lean
  // harness RefNode only sets trafficRps — mirror the canvas here.
  const withRps = (rps: number) =>
    nodes.map((n) =>
      n.data.componentCategory === "traffic"
        ? { ...n, data: { ...n.data, trafficRps: rps, trafficKind: "realistic", trafficWorkload: "mixed", trafficOrigin: "one-region" } }
        : n,
    ) as ArchieNode[]

  it("brackets the rps failure boundary near the engine's true edge (the lean compute saturates ≈1000)", () => {
    const b = minBreakingRps(withRps(5000), edges, c)
    expect(b).not.toBeNull()
    console.log(`[probe] first-service live boundary: ${b} rps`)
    expect(b!).toBeGreaterThanOrEqual(900)
    expect(b!).toBeLessThanOrEqual(2500)
  })

  it("returns null (never punishes) when the player's value doesn't actually break the build", () => {
    expect(minBreakingRps(withRps(900), edges, c)).toBeNull()
  })

  it("a categorical change that the load would have broken anyway is NOT causal", () => {
    // kind realistic→periodic at rps 5000: the authored realistic shape ALSO fails there,
    // so the kind change isn't what felled it.
    const deviated = withRps(5000).map((n) =>
      n.data.componentCategory === "traffic" ? { ...n, data: { ...n.data, trafficKind: "periodic" } } : n,
    ) as ArchieNode[]
    expect(isCategoricalCausal(deviated, edges, c, "kind")).toBe(false)
  })

  it("a categorical change at a load the authored value survives IS causal", () => {
    // at rps 400 the authored realistic shape passes — if a deviated kind fails there, it's the cause.
    const deviated = withRps(400).map((n) =>
      n.data.componentCategory === "traffic" ? { ...n, data: { ...n.data, trafficKind: "periodic" } } : n,
    ) as ArchieNode[]
    expect(isCategoricalCausal(deviated, edges, c, "kind")).toBe(true)
  })

  it("rawTrafficRps sums the dial values directly", () => {
    expect(rawTrafficRps(withRps(777))).toBe(777)
  })
})
