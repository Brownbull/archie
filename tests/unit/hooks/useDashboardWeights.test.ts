import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { DEFAULT_WEIGHT_PROFILE } from "@/lib/constants"

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

import { useArchitectureStore } from "@/stores/architectureStore"
import type { RecalculatedMetrics } from "@/engine/recalculator"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)

function makeNode(
  nodeId: string,
  metrics: Array<{ id: string; category: string; numericValue: number }>,
): RecalculatedMetrics {
  const metricValues = metrics.map((m) => ({
    id: m.id,
    value: "medium" as const,
    numericValue: m.numericValue,
    category: m.category,
  }))
  const overallScore =
    metricValues.length > 0
      ? metricValues.reduce((sum, m) => sum + m.numericValue, 0) / metricValues.length
      : 0
  return { nodeId, metrics: metricValues, overallScore }
}

function mockStore(
  metricsMap: Map<string, RecalculatedMetrics>,
  weightOverrides: Record<string, number> = {},
) {
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = {
      computedMetrics: metricsMap,
      weightProfile: { ...DEFAULT_WEIGHT_PROFILE, ...weightOverrides },
    }
    return (selector as (s: typeof state) => unknown)(state)
  })
}

describe("useDashboardWeights", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // Lazy import so the mock is established before the hook resolves the module
  async function importHook() {
    const mod = await import("@/hooks/useDashboardWeights")
    return mod.useDashboardWeights
  }

  it("returns empty categoryScores when no metrics", async () => {
    mockStore(new Map())
    const useDashboardWeights = await importHook()

    const { result } = renderHook(() => useDashboardWeights())

    expect(result.current.categoryScores).toHaveLength(7) // all categories, but with hasData=false
    expect(result.current.categoryScores.every((cs) => !cs.hasData)).toBe(true)
  })

  it("computes categoryScores from metrics", async () => {
    const metrics = new Map([
      [
        "node-1",
        makeNode("node-1", [
          { id: "latency", category: "performance", numericValue: 8 },
          { id: "throughput", category: "performance", numericValue: 6 },
          { id: "uptime", category: "reliability", numericValue: 9 },
        ]),
      ],
    ])
    mockStore(metrics)
    const useDashboardWeights = await importHook()

    const { result } = renderHook(() => useDashboardWeights())

    const perf = result.current.categoryScores.find((cs) => cs.categoryId === "performance")
    expect(perf?.hasData).toBe(true)
    expect(perf?.score).toBe(7) // (8+6)/2
  })

  it("computes aggregateScore as mean of category scores with data", async () => {
    const metrics = new Map([
      [
        "node-1",
        makeNode("node-1", [
          { id: "latency", category: "performance", numericValue: 8 },
          { id: "throughput", category: "performance", numericValue: 6 },
          { id: "uptime", category: "reliability", numericValue: 9 },
        ]),
      ],
    ])
    mockStore(metrics)
    const useDashboardWeights = await importHook()

    const { result } = renderHook(() => useDashboardWeights())

    // perf=7, rel=9 => aggregate = (7+9)/2 = 8.0
    expect(result.current.aggregateScore).toBe(8)
  })

  it("computes weightedAggregateScore with non-default weights", async () => {
    const metrics = new Map([
      [
        "node-1",
        makeNode("node-1", [
          { id: "latency", category: "performance", numericValue: 8 },
          { id: "throughput", category: "performance", numericValue: 6 },
          { id: "uptime", category: "reliability", numericValue: 9 },
        ]),
      ],
    ])
    // performance weight = 0.5, reliability = 1.0
    mockStore(metrics, { performance: 0.5 })
    const useDashboardWeights = await importHook()

    const { result } = renderHook(() => useDashboardWeights())

    // weighted = (7*0.5 + 9*1.0) / (0.5 + 1.0) = 12.5 / 1.5 ≈ 8.333, rounded to 1dp = 8.3
    expect(result.current.weightedAggregateScore).toBe(8.3)
  })

  it("returns isNonDefaultWeights=false when all weights are 1.0", async () => {
    mockStore(new Map())
    const useDashboardWeights = await importHook()

    const { result } = renderHook(() => useDashboardWeights())

    expect(result.current.isNonDefaultWeights).toBe(false)
  })

  it("returns isNonDefaultWeights=true when any weight differs from 1.0", async () => {
    mockStore(new Map(), { performance: 0.5 })
    const useDashboardWeights = await importHook()

    const { result } = renderHook(() => useDashboardWeights())

    expect(result.current.isNonDefaultWeights).toBe(true)
  })

  it("weightedAggregateScore equals aggregateScore when all weights are default", async () => {
    const metrics = new Map([
      [
        "node-1",
        makeNode("node-1", [
          { id: "latency", category: "performance", numericValue: 8 },
          { id: "uptime", category: "reliability", numericValue: 9 },
        ]),
      ],
    ])
    mockStore(metrics)
    const useDashboardWeights = await importHook()

    const { result } = renderHook(() => useDashboardWeights())

    expect(result.current.weightedAggregateScore).toBe(result.current.aggregateScore)
  })
})
