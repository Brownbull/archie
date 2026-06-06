import { describe, it, expect, vi, beforeEach } from "vitest"
import { getNodeCost, computeTotalArchitectureCost, workloadBlend, cacheErosionForKind } from "@/stores/architectureStoreHelpers"

const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: (...args: unknown[]) => mockGetComponent(...args),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

const makeComponent = (variants: Array<{ id: string; monthlyCost?: number; maxRPS?: number; baseLatencyMs?: number }>) => ({
  id: "test-component",
  name: "Test",
  category: "compute",
  configVariants: variants.map((v) => ({
    id: v.id,
    name: v.id,
    metrics: [],
    monthlyCost: v.monthlyCost,
    maxRPS: v.maxRPS,
    baseLatencyMs: v.baseLatencyMs,
  })),
})

describe("getNodeCost", () => {
  beforeEach(() => {
    mockGetComponent.mockReset()
  })

  it("returns economics for a valid component + variant", () => {
    mockGetComponent.mockReturnValue(makeComponent([
      { id: "default", monthlyCost: 45, maxRPS: 500, baseLatencyMs: 5 },
    ]))
    const result = getNodeCost("test-component", "default")
    expect(result.monthlyCost).toBe(45)
    expect(result.maxRPS).toBe(500)
    expect(result.baseLatencyMs).toBe(5)
  })

  it("returns undefined fields when component not found", () => {
    mockGetComponent.mockReturnValue(undefined)
    const result = getNodeCost("unknown", "default")
    expect(result.monthlyCost).toBeUndefined()
    expect(result.maxRPS).toBeUndefined()
    expect(result.baseLatencyMs).toBeUndefined()
  })

  it("returns undefined fields when variant not found", () => {
    mockGetComponent.mockReturnValue(makeComponent([
      { id: "other", monthlyCost: 100, maxRPS: 1000, baseLatencyMs: 10 },
    ]))
    const result = getNodeCost("test-component", "nonexistent")
    expect(result.monthlyCost).toBeUndefined()
  })

  it("returns zero monthlyCost for free-tier variants", () => {
    mockGetComponent.mockReturnValue(makeComponent([
      { id: "free", monthlyCost: 0, maxRPS: 100000, baseLatencyMs: 20 },
    ]))
    const result = getNodeCost("test-component", "free")
    expect(result.monthlyCost).toBe(0)
  })

  it("returns undefined for fields not present on variant (backward compat)", () => {
    mockGetComponent.mockReturnValue(makeComponent([
      { id: "legacy" },
    ]))
    const result = getNodeCost("test-component", "legacy")
    expect(result.monthlyCost).toBeUndefined()
    expect(result.maxRPS).toBeUndefined()
    expect(result.baseLatencyMs).toBeUndefined()
  })

  it("returns fractional baseLatencyMs", () => {
    mockGetComponent.mockReturnValue(makeComponent([
      { id: "cache", monthlyCost: 15, maxRPS: 50000, baseLatencyMs: 0.5 },
    ]))
    const result = getNodeCost("test-component", "cache")
    expect(result.baseLatencyMs).toBe(0.5)
  })
})

describe("computeTotalArchitectureCost", () => {
  beforeEach(() => {
    mockGetComponent.mockReset()
  })

  it("returns 0 for empty nodes array", () => {
    expect(computeTotalArchitectureCost([])).toBe(0)
  })

  it("sums costs across multiple nodes", () => {
    mockGetComponent.mockImplementation((id: string) => {
      if (id === "pg") return makeComponent([{ id: "single", monthlyCost: 45, maxRPS: 500, baseLatencyMs: 5 }])
      if (id === "redis") return makeComponent([{ id: "standard", monthlyCost: 15, maxRPS: 50000, baseLatencyMs: 0.5 }])
      return undefined
    })

    const nodes = [
      { data: { archieComponentId: "pg", activeConfigVariantId: "single" } },
      { data: { archieComponentId: "redis", activeConfigVariantId: "standard" } },
    ]
    expect(computeTotalArchitectureCost(nodes)).toBe(60)
  })

  it("skips nodes with undefined monthlyCost", () => {
    mockGetComponent.mockImplementation((id: string) => {
      if (id === "pg") return makeComponent([{ id: "single", monthlyCost: 45 }])
      if (id === "legacy") return makeComponent([{ id: "default" }])
      return undefined
    })

    const nodes = [
      { data: { archieComponentId: "pg", activeConfigVariantId: "single" } },
      { data: { archieComponentId: "legacy", activeConfigVariantId: "default" } },
    ]
    expect(computeTotalArchitectureCost(nodes)).toBe(45)
  })

  it("includes zero-cost nodes in total without adding", () => {
    mockGetComponent.mockReturnValue(makeComponent([{ id: "free", monthlyCost: 0 }]))

    const nodes = [
      { data: { archieComponentId: "cdn", activeConfigVariantId: "free" } },
    ]
    expect(computeTotalArchitectureCost(nodes)).toBe(0)
  })

  it("handles unknown components gracefully", () => {
    mockGetComponent.mockReturnValue(undefined)

    const nodes = [
      { data: { archieComponentId: "nonexistent", activeConfigVariantId: "default" } },
    ]
    expect(computeTotalArchitectureCost(nodes)).toBe(0)
  })
})

describe("workloadBlend (ED5/D20, D74)", () => {
  it("empty / zero-rps sources ⇒ no override", () => {
    expect(workloadBlend([])).toEqual({})
    expect(workloadBlend([{ rps: 0, workload: "write" }])).toEqual({})
  })

  it("rps-weights write-pressure, cacheable-fraction, and access-pattern erosion", () => {
    // 3000 read (wp 0, cacheable 0.3, steady erosion 1) + 1000 write (wp 1, cacheable default 1, steady 1)
    const b = workloadBlend([
      { rps: 3000, workload: "read", kind: "steady", cacheableFraction: 0.3 },
      { rps: 1000, workload: "write", kind: "steady" },
    ])
    expect(b.writePressure).toBeCloseTo(0.25, 6) // (3000·0 + 1000·1)/4000
    expect(b.cacheableFraction).toBeCloseTo((3000 * 0.3 + 1000 * 1) / 4000, 6) // 0.475
    expect(b.cacheErosion).toBeCloseTo(1, 6) // both steady
  })

  it("access-pattern erosion: steady 1 → realistic 0.95 → periodic 0.9 → search 0.6", () => {
    expect(cacheErosionForKind("steady")).toBe(1)
    expect(cacheErosionForKind("realistic")).toBe(0.95)
    expect(cacheErosionForKind("search")).toBe(0.6)
    expect(cacheErosionForKind(undefined)).toBe(1)
  })
})
