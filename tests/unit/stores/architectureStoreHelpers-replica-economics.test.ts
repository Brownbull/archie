import { describe, it, expect, vi, beforeEach } from "vitest"
import { getNodeCost, computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"

const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: (...args: unknown[]) => mockGetComponent(...args),
  },
}))

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

// category drives CATEGORY_SCALING_RULES lookup: compute=full, data-storage=read-only, monitoring=none
const makeComponent = (category: string, monthlyCost: number, maxRPS: number, baseLatencyMs = 5) => ({
  id: `test-${category}`,
  name: category,
  category,
  configVariants: [{ id: "default", name: "Default", metrics: [], monthlyCost, maxRPS, baseLatencyMs }],
})

describe("getNodeCost — replica scaling (Epic 14)", () => {
  beforeEach(() => mockGetComponent.mockReset())

  it("defaults to 1× when replicaCount omitted (backward compatible)", () => {
    mockGetComponent.mockReturnValue(makeComponent("compute", 45, 500))
    const r = getNodeCost("c", "default")
    expect(r.monthlyCost).toBe(45)
    expect(r.maxRPS).toBe(500)
  })

  it("scales cost AND capacity linearly for a full-scaling (compute) component", () => {
    mockGetComponent.mockReturnValue(makeComponent("compute", 45, 500))
    const r = getNodeCost("c", "default", 3)
    expect(r.monthlyCost).toBe(135)
    expect(r.maxRPS).toBe(1500)
    expect(r.baseLatencyMs).toBe(5) // latency unaffected by replication
  })

  it("scales cost AND read capacity linearly for a read-only (data-storage) component", () => {
    mockGetComponent.mockReturnValue(makeComponent("data-storage", 100, 800))
    const r = getNodeCost("db", "default", 4)
    expect(r.monthlyCost).toBe(400)
    expect(r.maxRPS).toBe(3200)
  })

  it("scales cost but NOT capacity for a non-scalable (monitoring, replicaType none) component", () => {
    mockGetComponent.mockReturnValue(makeComponent("monitoring", 30, 200))
    const r = getNodeCost("mon", "default", 5)
    expect(r.monthlyCost).toBe(150) // still pay per instance
    expect(r.maxRPS).toBe(200) // no throughput gain — replicaFactor 1
  })

  it("treats replicaCount below 1 as 1 (defensive clamp)", () => {
    mockGetComponent.mockReturnValue(makeComponent("compute", 45, 500))
    expect(getNodeCost("c", "default", 0).monthlyCost).toBe(45)
  })

  it("treats non-finite replicaCount (NaN, ±Infinity) as 1", () => {
    mockGetComponent.mockReturnValue(makeComponent("compute", 45, 500))
    expect(getNodeCost("c", "default", Number.NaN).monthlyCost).toBe(45)
    expect(getNodeCost("c", "default", Number.POSITIVE_INFINITY).monthlyCost).toBe(45)
    expect(getNodeCost("c", "default", Number.NEGATIVE_INFINITY).monthlyCost).toBe(45)
  })

  it("floors fractional replicaCount", () => {
    mockGetComponent.mockReturnValue(makeComponent("compute", 10, 100))
    expect(getNodeCost("c", "default", 2.9).monthlyCost).toBe(20)
  })

  it("leaves undefined economics undefined regardless of replicaCount", () => {
    mockGetComponent.mockReturnValue({
      id: "x", name: "x", category: "compute",
      configVariants: [{ id: "default", name: "d", metrics: [] }],
    })
    const r = getNodeCost("x", "default", 5)
    expect(r.monthlyCost).toBeUndefined()
    expect(r.maxRPS).toBeUndefined()
  })

  it("returns undefined economics for an unknown component regardless of replicaCount", () => {
    mockGetComponent.mockReturnValue(undefined)
    const r = getNodeCost("nope", "default", 7)
    expect(r.monthlyCost).toBeUndefined()
    expect(r.maxRPS).toBeUndefined()
  })
})

describe("computeTotalArchitectureCost — replica scaling (Epic 14)", () => {
  beforeEach(() => mockGetComponent.mockReset())

  it("multiplies each node's cost by its replicaCount before summing", () => {
    mockGetComponent.mockImplementation((id: string) =>
      id === "web" ? makeComponent("compute", 50, 1000) : makeComponent("data-storage", 100, 500),
    )
    const total = computeTotalArchitectureCost([
      { data: { archieComponentId: "web", activeConfigVariantId: "default", replicaCount: 3 } },
      { data: { archieComponentId: "db", activeConfigVariantId: "default", replicaCount: 1 } },
    ])
    expect(total).toBe(50 * 3 + 100) // 250
  })

  it("defaults a missing replicaCount to 1 (backward compatible)", () => {
    mockGetComponent.mockReturnValue(makeComponent("compute", 80, 1000))
    const total = computeTotalArchitectureCost([
      { data: { archieComponentId: "web", activeConfigVariantId: "default" } },
    ])
    expect(total).toBe(80)
  })
})
