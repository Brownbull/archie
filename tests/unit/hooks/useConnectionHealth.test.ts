import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { PARTICLE_DENSITY_MIN, PARTICLE_DENSITY_MAX } from "@/lib/constants"

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

import { useArchitectureStore } from "@/stores/architectureStore"
import type { RecalculatedMetrics } from "@/engine/recalculator"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)

function makeMetrics(nodeId: string, overallScore: number): RecalculatedMetrics {
  return { nodeId, metrics: [], overallScore }
}

function mockStore(metricsMap: Map<string, RecalculatedMetrics>) {
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = { computedMetrics: metricsMap }
    return (selector as (s: typeof state) => unknown)(state)
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

async function getHook() {
  const { useConnectionHealth } = await import("@/hooks/useConnectionHealth")
  return useConnectionHealth
}

describe("useConnectionHealth", () => {
  it("returns high density for healthy edge (both nodes score 8.0)", async () => {
    const useConnectionHealth = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeMetrics("node-1", 8.0))
    metrics.set("node-2", makeMetrics("node-2", 8.0))
    mockStore(metrics)

    const { result } = renderHook(() => useConnectionHealth("node-1", "node-2"))

    expect(result.current.healthScore).toBe(8.0)
    // score 8.0 → density = round(2 + ((8-1)/9)*10) = round(2 + 7.78) = round(9.78) = 10
    expect(result.current.density).toBeGreaterThanOrEqual(PARTICLE_DENSITY_MIN)
    expect(result.current.density).toBeLessThanOrEqual(PARTICLE_DENSITY_MAX)
    expect(result.current.status).toBe("healthy")
  })

  it("returns low density for bottleneck edge (both nodes score 3.0)", async () => {
    const useConnectionHealth = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeMetrics("node-1", 3.0))
    metrics.set("node-2", makeMetrics("node-2", 3.0))
    mockStore(metrics)

    const { result } = renderHook(() => useConnectionHealth("node-1", "node-2"))

    expect(result.current.healthScore).toBe(3.0)
    expect(result.current.density).toBeLessThan(6)
    expect(result.current.status).toBe("bottleneck")
  })

  it("averages source and target scores correctly", async () => {
    const useConnectionHealth = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeMetrics("node-1", 8.0))
    metrics.set("node-2", makeMetrics("node-2", 2.0))
    mockStore(metrics)

    const { result } = renderHook(() => useConnectionHealth("node-1", "node-2"))

    expect(result.current.healthScore).toBe(5.0)
    expect(result.current.status).toBe("warning")
  })

  it("returns default density when nodes have no metrics", async () => {
    const useConnectionHealth = await getHook()
    mockStore(new Map())

    const { result } = renderHook(() => useConnectionHealth("node-1", "node-2"))

    // Default score 5.0 when nodes not found
    expect(result.current.healthScore).toBe(5.0)
    expect(result.current.density).toBeGreaterThanOrEqual(PARTICLE_DENSITY_MIN)
  })

  it("clamps score at minimum 1", async () => {
    const useConnectionHealth = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeMetrics("node-1", 0))
    metrics.set("node-2", makeMetrics("node-2", 0))
    mockStore(metrics)

    const { result } = renderHook(() => useConnectionHealth("node-1", "node-2"))

    expect(result.current.healthScore).toBe(1)
    expect(result.current.density).toBe(PARTICLE_DENSITY_MIN)
  })

  it("clamps score at maximum 10", async () => {
    const useConnectionHealth = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeMetrics("node-1", 12))
    metrics.set("node-2", makeMetrics("node-2", 12))
    mockStore(metrics)

    const { result } = renderHook(() => useConnectionHealth("node-1", "node-2"))

    expect(result.current.healthScore).toBe(10)
    expect(result.current.density).toBe(PARTICLE_DENSITY_MAX)
  })

  it("uses default score for missing node and real score for present node", async () => {
    const useConnectionHealth = await getHook()
    const metrics = new Map<string, RecalculatedMetrics>()
    metrics.set("node-1", makeMetrics("node-1", 6.0))
    // node-2 intentionally absent — should use CONNECTION_DEFAULT_HEALTH_SCORE (5.0)
    mockStore(metrics)

    const { result } = renderHook(() => useConnectionHealth("node-1", "node-2"))

    // (6.0 + 5.0) / 2 = 5.5
    expect(result.current.healthScore).toBe(5.5)
    expect(result.current.density).toBeGreaterThanOrEqual(PARTICLE_DENSITY_MIN)
    expect(result.current.density).toBeLessThanOrEqual(PARTICLE_DENSITY_MAX)
  })
})
