import { describe, it, expect, vi, beforeEach } from "vitest"
import { recalculationService } from "@/services/recalculationService"
import { componentLibrary } from "@/services/componentLibrary"
import type { Component } from "@/schemas/componentSchema"
import { makeMetric, makeComponent } from "../../helpers/factories"

// --- Mock componentLibrary ---

const mockComponents = new Map<string, Component>()

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => mockComponents.get(id)),
  },
}))

// --- Tests ---

describe("recalculationService", () => {
  beforeEach(() => {
    mockComponents.clear()
    vi.mocked(componentLibrary.getComponent).mockImplementation(
      (id: string) => mockComponents.get(id),
    )
  })

  describe("run", () => {
    it("returns metrics and propagationHops in result", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
      ] as { id: string; data: { archieComponentId: string; activeConfigVariantId: string; componentName: string; componentCategory: string } }[]
      const edges: { id: string; source: string; target: string }[] = []

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
          makeMetric({ id: "read-latency", numericValue: 5, category: "performance" }),
          makeMetric({ id: "write-throughput", numericValue: 5, category: "performance" }),
          makeMetric({ id: "data-durability", numericValue: 9, category: "reliability" }),
        ],
        configVariants: [
          {
            id: "primary-replica",
            name: "Primary-Replica",
            metrics: [
              makeMetric({ id: "read-latency", numericValue: 2, category: "performance" }), // overrides base
              // write-throughput NOT overridden — base value should persist
            ],
          },
        ],
      }))

      const nodes = [{
        id: "n1",
        data: { archieComponentId: "pg", activeConfigVariantId: "primary-replica", componentName: "PG", componentCategory: "data-storage" },
      }]
      const edges: { id: string; source: string; target: string }[] = []

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
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("redis-cache", makeComponent({
        id: "redis-cache",
        category: "caching",
        baseMetrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "redis-cache", activeConfigVariantId: "default", componentName: "Redis Cache", componentCategory: "caching" } },
      ]
      const edges = [{ id: "e1", source: "n2", target: "n1" }]

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
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("redis-cache", makeComponent({
        id: "redis-cache",
        category: "caching",
        baseMetrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("express", makeComponent({
        id: "express",
        category: "compute",
        baseMetrics: [makeMetric({ id: "request-latency", numericValue: 4, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "redis-cache", activeConfigVariantId: "default", componentName: "Cache", componentCategory: "caching" } },
        { id: "n3", data: { archieComponentId: "express", activeConfigVariantId: "default", componentName: "Express", componentCategory: "compute" } },
      ]
      // Chain: n1 → n2 → n3
      const edges = [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
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
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "unknown-comp", activeConfigVariantId: "default", componentName: "Unknown", componentCategory: "compute" } },
      ]
      const edges = [{ id: "e1", source: "n1", target: "n2" }]

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
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [makeMetric({ id: "read-latency", numericValue: 3, category: "performance" })] }],
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

    it("includes nodeHeatmap and edgeHeatmap in result", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 8, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("redis-cache", makeComponent({
        id: "redis-cache",
        category: "caching",
        baseMetrics: [makeMetric({ id: "cache-hit-latency", numericValue: 2, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "redis-cache", activeConfigVariantId: "default", componentName: "Redis", componentCategory: "caching" } },
      ]
      const edges = [{ id: "e1", source: "n1", target: "n2" }]

      const result = recalculationService.run(nodes, edges, "n1")

      // nodeHeatmap should have entries for both nodes
      expect(result.nodeHeatmap).toBeInstanceOf(Map)
      expect(result.nodeHeatmap.size).toBe(2)
      expect(result.nodeHeatmap.has("n1")).toBe(true)
      expect(result.nodeHeatmap.has("n2")).toBe(true)

      // edgeHeatmap should have entry for the edge
      expect(result.edgeHeatmap).toBeInstanceOf(Map)
      expect(result.edgeHeatmap.size).toBe(1)
      expect(result.edgeHeatmap.has("e1")).toBe(true)

      // Verify node heatmap values are valid HeatmapStatus values
      const validStatuses = ["healthy", "warning", "bottleneck"]
      expect(validStatuses).toContain(result.nodeHeatmap.get("n1"))
      expect(validStatuses).toContain(result.nodeHeatmap.get("n2"))
      expect(validStatuses).toContain(result.edgeHeatmap.get("e1"))
    })

    it("returns complete RecalculationResult structure", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
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
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [makeMetric({ id: "read-latency", numericValue: 3, category: "performance" })] }],
      }))
      mockComponents.set("redis-cache", makeComponent({
        id: "redis-cache",
        category: "caching",
        baseMetrics: [makeMetric({ id: "cache-hit-latency", numericValue: 2, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "nonexistent-variant", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "redis-cache", activeConfigVariantId: "default", componentName: "Redis", componentCategory: "caching" } },
      ]
      const edges = [{ id: "e1", source: "n1", target: "n2" }]

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

    it("handles componentLibrary.getComponent() throwing an exception gracefully", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      // Override mock to throw for a specific ID
      vi.mocked(componentLibrary.getComponent).mockImplementation((id: string) => {
        if (id === "corrupted-comp") {
          throw new Error("Cache corruption: invalid entry")
        }
        return mockComponents.get(id)
      })

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "corrupted-comp", activeConfigVariantId: "default", componentName: "Corrupted", componentCategory: "compute" } },
      ]
      const edges = [{ id: "e1", source: "n1", target: "n2" }]

      // Should NOT throw — error is caught internally
      const result = recalculationService.run(nodes, edges, "n1")
      expect(result.metrics.size).toBe(2)

      // Corrupted component gets empty metrics
      const n2Metrics = result.metrics.get("n2")!
      expect(n2Metrics.metrics).toEqual([])

      // Valid component still recalculates normally
      const n1Metrics = result.metrics.get("n1")!
      expect(n1Metrics.metrics.length).toBeGreaterThan(0)

    })

    it("3-node chain: middle node throws, outer nodes still recalculate", () => {
      mockComponents.set("pg", makeComponent({
        id: "pg",
        category: "data-storage",
        baseMetrics: [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))
      mockComponents.set("express", makeComponent({
        id: "express",
        category: "compute",
        baseMetrics: [makeMetric({ id: "request-latency", numericValue: 4, category: "performance" })],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      }))

      // Override mock: "broken-cache" throws
      vi.mocked(componentLibrary.getComponent).mockImplementation((id: string) => {
        if (id === "broken-cache") {
          throw new Error("Firestore deserialization error")
        }
        return mockComponents.get(id)
      })

      const nodes = [
        { id: "n1", data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" } },
        { id: "n2", data: { archieComponentId: "broken-cache", activeConfigVariantId: "default", componentName: "Broken Cache", componentCategory: "caching" } },
        { id: "n3", data: { archieComponentId: "express", activeConfigVariantId: "default", componentName: "Express", componentCategory: "compute" } },
      ]
      // Chain: n1 -> n2 -> n3
      const edges = [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ]

      const result = recalculationService.run(nodes, edges, "n1")

      // All 3 nodes should have entries
      expect(result.metrics.size).toBe(3)

      // n1 (valid) should have real metrics
      const n1Metrics = result.metrics.get("n1")!
      expect(n1Metrics.metrics.length).toBeGreaterThan(0)

      // n2 (broken) should have empty metrics but not crash
      const n2Metrics = result.metrics.get("n2")!
      expect(n2Metrics.metrics).toEqual([])
      expect(n2Metrics.overallScore).toBe(0)

      // n3 (valid) should still recalculate
      const n3Metrics = result.metrics.get("n3")!
      expect(n3Metrics.metrics.length).toBeGreaterThan(0)

      // Heatmaps should still be computed for all nodes
      expect(result.nodeHeatmap.size).toBe(3)
      expect(result.edgeHeatmap.size).toBe(2)

    })
  })

  describe("failure override logic — per-component vs global (TD-11-4a)", () => {
    const globalFailureModifiers = { "read-latency": 0.5 }
    const baseMetrics = [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })]
    const defaultVariant = { id: "default", name: "Default", metrics: [] }

    function makeServiceNode(archieComponentId: string) {
      return [{
        id: "n1",
        data: { archieComponentId, activeConfigVariantId: "default", componentName: "Test", componentCategory: "data-storage" },
      }]
    }

    it("uses component-specific failureResponses when preset matches (1.1)", () => {
      mockComponents.set("comp-with-responses", makeComponent({
        id: "comp-with-responses",
        category: "data-storage",
        baseMetrics,
        configVariants: [defaultVariant],
        failureResponses: {
          "failure-traffic-spike": { "read-latency": 0.2 },
        },
      }))

      const nodes = makeServiceNode("comp-with-responses")
      const result = recalculationService.run(
        nodes, [], "n1", null, globalFailureModifiers, "failure-traffic-spike",
      )
      const metric = result.metrics.get("n1")!.metrics.find((m) => m.id === "read-latency")

      // Component-specific: base 5 * 0.2 = 1.0 (NOT global 5 * 0.5 = 2.5)
      expect(metric!.numericValue).toBe(1)
    })

    it("falls back to global failureModifiers when component has no failureResponses (1.2)", () => {
      mockComponents.set("comp-no-responses", makeComponent({
        id: "comp-no-responses",
        category: "data-storage",
        baseMetrics,
        configVariants: [defaultVariant],
        // no failureResponses
      }))

      const nodes = makeServiceNode("comp-no-responses")
      const result = recalculationService.run(
        nodes, [], "n1", null, globalFailureModifiers, "failure-traffic-spike",
      )
      const metric = result.metrics.get("n1")!.metrics.find((m) => m.id === "read-latency")

      // Global: base 5 * 0.5 = 2.5
      expect(metric!.numericValue).toBe(2.5)
    })

    it("uses global failureModifiers when activeFailurePresetId is null (1.3)", () => {
      mockComponents.set("comp-with-responses-2", makeComponent({
        id: "comp-with-responses-2",
        category: "data-storage",
        baseMetrics,
        configVariants: [defaultVariant],
        failureResponses: {
          "failure-traffic-spike": { "read-latency": 0.1 },
        },
      }))

      const nodes = makeServiceNode("comp-with-responses-2")
      const result = recalculationService.run(
        nodes, [], "n1", null, globalFailureModifiers, null,
      )
      const metric = result.metrics.get("n1")!.metrics.find((m) => m.id === "read-latency")

      // Global wins even though component has data: base 5 * 0.5 = 2.5 (NOT 5 * 0.1 = 0.5)
      expect(metric!.numericValue).toBe(2.5)
    })

    it("falls back to global when component has failureResponses but not for active preset (1.4)", () => {
      mockComponents.set("comp-partial-responses", makeComponent({
        id: "comp-partial-responses",
        category: "data-storage",
        baseMetrics,
        configVariants: [defaultVariant],
        failureResponses: {
          "failure-single-node": { "read-latency": 0.1 },
        },
      }))

      const nodes = makeServiceNode("comp-partial-responses")
      const result = recalculationService.run(
        nodes, [], "n1", null, globalFailureModifiers, "failure-traffic-spike",
      )
      const metric = result.metrics.get("n1")!.metrics.find((m) => m.id === "read-latency")

      // Global: preset "failure-traffic-spike" not in component's responses → fallback
      expect(metric!.numericValue).toBe(2.5)
    })
  })
})
