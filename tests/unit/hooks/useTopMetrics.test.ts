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

beforeEach(() => {
  vi.resetAllMocks()
})

// Lazy import to ensure mocks are set up before module loads
async function getHook() {
  const { useTopMetrics } = await import("@/hooks/useTopMetrics")
  return useTopMetrics
}

describe("useTopMetrics", () => {
  it("returns top 2 categories sorted by weight descending", async () => {
    const useTopMetrics = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeNode("node-1", [
      { id: "m1", category: "performance", numericValue: 8.0 },
      { id: "m2", category: "reliability", numericValue: 6.0 },
      { id: "m3", category: "scalability", numericValue: 4.0 },
      { id: "m4", category: "security", numericValue: 7.0 },
    ]))

    // Weight performance and scalability highest
    mockStore(metrics, { performance: 1.0, reliability: 0.3, scalability: 0.9, security: 0.5 })

    const { result } = renderHook(() => useTopMetrics("node-1"))

    expect(result.current).toHaveLength(2)
    // Performance (weight 1.0) should be first, Scalability (0.9) second
    expect(result.current[0].categoryId).toBe("performance")
    expect(result.current[0].shortName).toBe("Perf")
    expect(result.current[0].value).toBe(8.0)
    expect(result.current[0].color).toContain("performance")

    expect(result.current[1].categoryId).toBe("scalability")
    expect(result.current[1].shortName).toBe("Scale")
    expect(result.current[1].value).toBe(4.0)
  })

  it("returns empty array when nodeId not found", async () => {
    const useTopMetrics = await getHook()
    mockStore(new Map())

    const { result } = renderHook(() => useTopMetrics("missing-node"))

    expect(result.current).toEqual([])
  })

  it("returns empty array when node has no metrics", async () => {
    const useTopMetrics = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeNode("node-1", []))

    mockStore(metrics)

    const { result } = renderHook(() => useTopMetrics("node-1"))

    expect(result.current).toEqual([])
  })

  it("returns fewer than count when node has fewer categories", async () => {
    const useTopMetrics = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeNode("node-1", [
      { id: "m1", category: "performance", numericValue: 7.5 },
    ]))

    mockStore(metrics)

    const { result } = renderHook(() => useTopMetrics("node-1"))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].categoryId).toBe("performance")
  })

  it("respects custom count parameter", async () => {
    const useTopMetrics = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeNode("node-1", [
      { id: "m1", category: "performance", numericValue: 8.0 },
      { id: "m2", category: "reliability", numericValue: 6.0 },
      { id: "m3", category: "scalability", numericValue: 4.0 },
    ]))

    mockStore(metrics)

    const { result } = renderHook(() => useTopMetrics("node-1", 3))

    expect(result.current).toHaveLength(3)
  })

  it("averages multiple metrics in same category", async () => {
    const useTopMetrics = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeNode("node-1", [
      { id: "m1", category: "performance", numericValue: 8.0 },
      { id: "m2", category: "performance", numericValue: 6.0 },
      { id: "m3", category: "reliability", numericValue: 5.0 },
    ]))

    // Equal weights — performance has higher average (7.0) than reliability (5.0)
    mockStore(metrics)

    const { result } = renderHook(() => useTopMetrics("node-1"))

    // With equal weights, both should appear; perf average = 7.0, rel = 5.0
    expect(result.current).toHaveLength(2)
    expect(result.current[0].value).toBe(7.0)
    expect(result.current[1].value).toBe(5.0)
  })

  it("excludes categories with zero weight", async () => {
    const useTopMetrics = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeNode("node-1", [
      { id: "m1", category: "performance", numericValue: 8.0 },
      { id: "m2", category: "reliability", numericValue: 6.0 },
      { id: "m3", category: "scalability", numericValue: 9.0 },
    ]))

    // Zero-weight scalability — should not appear despite high value
    mockStore(metrics, { scalability: 0 })

    const { result } = renderHook(() => useTopMetrics("node-1"))

    expect(result.current).toHaveLength(2)
    expect(result.current.every((m) => m.categoryId !== "scalability")).toBe(true)
  })
})
