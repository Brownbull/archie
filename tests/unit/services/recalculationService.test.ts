import { describe, it, expect, vi, beforeEach } from "vitest"
import { recalculationService, type RecalculationResult } from "@/services/recalculationService"
import type { MetricValue } from "@/schemas/metricSchema"
import type { Component } from "@/schemas/componentSchema"

// --- Mock componentLibrary ---

const mockComponents = new Map<string, Component>()

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => mockComponents.get(id)),
  },
}))

// --- Test Helpers ---

function makeMetric(
  id: string,
  numericValue: number,
  category: string,
): MetricValue {
  const value =
    numericValue <= 3 ? "low" : numericValue <= 7 ? "medium" : "high"
  return { id, value, numericValue, category }
}

function makeComponent(overrides: Partial<Component> & { id: string; category: string }): Component {
  return {
    name: overrides.id,
    description: "test",
    is: "test",
    gain: ["test"],
    cost: ["test"],
    tags: [],
    baseMetrics: [],
    configVariants: [{ id: "default", name: "Default", metrics: [] }],
    ...overrides,
  }
}

// --- Tests ---

describe("recalculationService", () => {
  beforeEach(() => {
    mockComponents.clear()
  })

  describe("run", () => {
    it("returns metrics and propagationHops in result", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric("read-latency", 5, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
      ] as { id: string; data: { archieComponentId: string; activeConfigVariantId: string; componentName: string; componentCategory: string } }[]
      const edges: { source: string; target: string }[] = []

      const result = recalculationService.run(nodes, edges, "n1")
      expect(result.metrics).toBeDefined()
      expect(result.propagationHops).toBeDefined()
      expect(result.metrics.size).toBe(1)
      expect(result.propagationHops.length).toBeGreaterThanOrEqual(1)
    })

    it("merges base metrics with variant overlay (variant overrides matching IDs)", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [
          makeMetric("read-latency", 5, "performance"),
          makeMetric("write-throughput", 5, "performance"),
          makeMetric("data-durability", 9, "reliability"),
        ],
        configVariants: [
          {
            id: "primary-replica",
            name: "Primary-Replica",
            metrics: [
              makeMetric("read-latency", 2, "performance"), // overrides base
              // write-throughput NOT overridden — base value should persist
            ],
          },
        ],
      }))

      const nodes = [{
        id: "n1",
        data: { archieComponentId: "pg", activeConfigVariantId: "primary-replica", componentName: "PG", componentCategory: "data-storage" },
      }]
      const edges: { source: string; target: string }[] = []

      const result = recalculationService.run(nodes, edges, "n1")
      const nodeMetrics = result.metrics.get("n1")!

      // read-latency should be overridden to 2
      const readLatency = nodeMetrics.metrics.find((m) => m.id === "read-latency")
      expect(readLatency!.numericValue).toBe(2)

      // write-throughput should be base value 5
      const writeThroughput = nodeMetrics.metrics.find((m) => m.id === "write-throughput")
      expect(writeThroughput!.numericValue).toBe(5)

      // data-durability should be base value 9
      const durability = nodeMetrics.metrics.find((m) => m.id === "data-durability")
      expect(durability!.numericValue).toBe(9)

      // Total metrics should be 3 (all base, 1 overridden)
      expect(nodeMetrics.metrics).toHaveLength(3)
    })

    it("handles multi-node propagation through connected components", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric("read-latency", 5, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("redis-cache", makeComponent({
        id: "redis-cache",
        category: "caching",
        baseMetrics: [makeMetric("cache-hit-latency", 1, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "redis-cache", activeConfigVariantId: "default", componentName: "Redis Cache", componentCategory: "caching" } },
      ]
      const edges = [{ source: "n2", target: "n1" }]

      const result = recalculationService.run(nodes, edges, "n1")

      // Both nodes should have recalculated metrics
      expect(result.metrics.size).toBe(2)
      expect(result.metrics.has("n1")).toBe(true)
      expect(result.metrics.has("n2")).toBe(true)
    })

    it("returns correct propagation order (BFS from changed node)", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric("read-latency", 5, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("redis-cache", makeComponent({
        id: "redis-cache",
        category: "caching",
        baseMetrics: [makeMetric("cache-hit-latency", 1, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("express", makeComponent({
        id: "express",
        category: "compute",
        baseMetrics: [makeMetric("request-latency", 4, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "redis-cache", activeConfigVariantId: "default", componentName: "Cache", componentCategory: "caching" } },
        { id: "n3", data: { archieComponentId: "express", activeConfigVariantId: "default", componentName: "Express", componentCategory: "compute" } },
      ]
      // Chain: n1 → n2 → n3
      const edges = [
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
      ]

      const result = recalculationService.run(nodes, edges, "n1")

      // Propagation hops should be in BFS order from n1
      expect(result.propagationHops[0].nodeId).toBe("n1")
      expect(result.propagationHops[0].hopIndex).toBe(0)
      expect(result.propagationHops[1].nodeId).toBe("n2")
      expect(result.propagationHops[1].hopIndex).toBe(1)
      expect(result.propagationHops[2].nodeId).toBe("n3")
      expect(result.propagationHops[2].hopIndex).toBe(2)
    })

    it("handles componentLibrary returning undefined gracefully", () => {
      // n1 has a valid component, n2 has an unknown component
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric("read-latency", 5, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "unknown-comp", activeConfigVariantId: "default", componentName: "Unknown", componentCategory: "compute" } },
      ]
      const edges = [{ source: "n1", target: "n2" }]

      // Should not throw
      const result = recalculationService.run(nodes, edges, "n1")
      expect(result.metrics.size).toBe(2)

      // Unknown component gets empty metrics
      const n2Metrics = result.metrics.get("n2")!
      expect(n2Metrics.metrics).toEqual([])
    })

    it("handles variant not found — falls back to base metrics only", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric("read-latency", 5, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [makeMetric("read-latency", 3, "performance")] }],
      }))

      const nodes = [{
        id: "n1",
        data: { archieComponentId: "pg", activeConfigVariantId: "nonexistent-variant", componentName: "PG", componentCategory: "data-storage" },
      }]

      const result = recalculationService.run(nodes, [], "n1")
      const n1Metrics = result.metrics.get("n1")!
      // Should use base metrics since variant not found
      expect(n1Metrics.metrics[0].numericValue).toBe(5)
    })

    it("returns complete RecalculationResult structure", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric("read-latency", 5, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [{
        id: "n1",
        data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" },
      }]

      const result = recalculationService.run(nodes, [], "n1")

      // RecalculationResult should have metrics (ArchitectureMetrics) and propagationHops
      expect(result.metrics).toBeInstanceOf(Map)
      expect(Array.isArray(result.propagationHops)).toBe(true)
      expect(result.propagationHops[0]).toHaveProperty("nodeId")
      expect(result.propagationHops[0]).toHaveProperty("hopIndex")
      expect(result.propagationHops[0]).toHaveProperty("delayMs")
    })

    it("variant-not-found falls back to base metrics during propagation", () => {
      // n1 has valid variant, n2 has nonexistent variant — verify propagation handles gracefully
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric("read-latency", 5, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [makeMetric("read-latency", 3, "performance")] }],
      }))
      mockComponents.set("redis-cache", makeComponent({
        id: "redis-cache",
        category: "caching",
        baseMetrics: [makeMetric("cache-hit-latency", 2, "performance")],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "nonexistent-variant", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "redis-cache", activeConfigVariantId: "default", componentName: "Redis", componentCategory: "caching" } },
      ]
      const edges = [{ source: "n1", target: "n2" }]

      // Should not throw — n1 falls back to base metrics
      const result = recalculationService.run(nodes, edges, "n1")
      expect(result.metrics.size).toBe(2)

      // n1 should use base metrics (variant not found)
      const n1Metrics = result.metrics.get("n1")!
      expect(n1Metrics.metrics[0].numericValue).toBeGreaterThanOrEqual(1)

      // n2 should still be recalculated
      const n2Metrics = result.metrics.get("n2")!
      expect(n2Metrics.metrics.length).toBeGreaterThan(0)
    })
  })
})
