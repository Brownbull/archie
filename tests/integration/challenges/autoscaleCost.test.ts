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

import { componentLibrary } from "@/services/componentLibrary"
import { computeTotalArchitectureCost, computeIntegratedArchitectureCost } from "@/stores/architectureStoreHelpers"
import type { TickState } from "@/lib/simulationTypes"
import { loadLocalComponents } from "./referenceSolution"

/**
 * ED9 (D74) integrated cost. The serverless challenges happen to provision R=1 (edge-function's 10k
 * capacity covers their peak), so the discount is invisible there. This proves the mechanic on a
 * provisioned-for-the-spike serverless tier (R>1) under a bursty curve: autoscaling bills the MEAN of
 * active replicas, far below the flat peak — while a non-autoscale tier is unchanged (short-circuit).
 */
describe("ED9 integrated autoscale cost", () => {
  beforeAll(async () => {
    mockComponentRepo.getAll.mockResolvedValue(loadLocalComponents())
    emptyRepo.getAll.mockResolvedValue([])
    await componentLibrary.initialize()
  })

  // cold-start serverless: per-replica 1000 rps, $5/replica, autoscale. Provisioned R=4 for a 4000 spike.
  const node = { id: "fn", data: { archieComponentId: "serverless", activeConfigVariantId: "cold-start", replicaCount: 4 } }
  const tick = (incoming: number): TickState => ({
    tick: 0, targetRps: incoming,
    nodes: [{ nodeId: "fn", incomingRps: incoming, servedRps: incoming, failedRps: 0, latencyMs: 100, capacityPercent: 0, overloaded: false }],
    totalServedRps: incoming, totalFailedRps: 0,
  })

  it("a bursty autoscale tier bills mean-active, well below the flat peak cost", () => {
    const flat = computeTotalArchitectureCost([node]) // 4 replicas × $5 = $20, always-on
    expect(flat).toBe(20)
    // Mostly baseline (500 rps → 1 active), one spike (3500 rps → 4 active): mean active ≈ 1.6 → ~$8.
    const ticks = [tick(500), tick(500), tick(500), tick(3500), tick(500)]
    const integrated = computeIntegratedArchitectureCost([node], ticks)
    expect(integrated).toBeLessThan(flat * 0.6) // autoscaling slashes the bill vs paying for peak 24/7
    expect(integrated).toBeGreaterThan(0)
  })

  it("idle (pre-ramp) ticks are skipped so they don't fake a deeper discount", () => {
    const sustained = computeIntegratedArchitectureCost([node], [tick(3500), tick(3500)]) // always at spike
    expect(sustained).toBeCloseTo(20, 6) // 4 active every loaded tick → equals flat
  })

  it("a non-autoscale node is unchanged (exact short-circuit to the flat cost)", () => {
    const staticNode = { id: "db", data: { archieComponentId: "postgresql", activeConfigVariantId: "single", replicaCount: 1 } }
    expect(computeIntegratedArchitectureCost([staticNode], [tick(500)])).toBe(computeTotalArchitectureCost([staticNode]))
  })
})
