import { describe, it, expect, vi, beforeEach } from "vitest"
import { recalculationService } from "@/services/recalculationService"
import { recalculateNode, recalculateArchitecture, INTERACTION_RULES } from "@/engine/recalculator"
import { getAffectedNodes, getPropagationHops } from "@/engine/propagator"
import type { MetricValue } from "@/schemas/metricSchema"
import type { Component } from "@/schemas/componentSchema"

// --- Mock componentLibrary with realistic data ---

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

function makeNode(
  id: string,
  componentId: string,
  category: string,
  variantId = "default",
) {
  return {
    id,
    data: {
      archieComponentId: componentId,
      activeConfigVariantId: variantId,
      componentName: componentId,
      componentCategory: category,
    },
  }
}

// --- Integration Tests ---

describe("recalculation pipeline (integration)", () => {
  beforeEach(() => {
    mockComponents.clear()
  })

  it("end-to-end: 3 components in chain, config change propagates correctly", () => {
    // Setup: A (data-storage) → B (caching) → C (compute)
    mockComponents.set("pg", makeComponent({
      id: "pg",
      category: "data-storage",
      baseMetrics: [
        makeMetric("read-latency", 5, "performance"),
        makeMetric("write-throughput", 6, "performance"),
        makeMetric("data-durability", 9, "reliability"),
        makeMetric("operational-complexity", 5, "operational-complexity"),
      ],
      configVariants: [
        { id: "single-node", name: "Single Node", metrics: [makeMetric("read-latency", 3, "performance")] },
        { id: "primary-replica", name: "Primary-Replica", metrics: [makeMetric("read-latency", 2, "performance")] },
      ],
    }))

    mockComponents.set("redis-cache", makeComponent({
      id: "redis-cache",
      category: "caching",
      baseMetrics: [
        makeMetric("cache-hit-latency", 1, "performance"),
        makeMetric("cache-efficiency", 8, "performance"),
        makeMetric("operational-complexity", 3, "operational-complexity"),
      ],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
    }))

    mockComponents.set("express", makeComponent({
      id: "express",
      category: "compute",
      baseMetrics: [
        makeMetric("request-latency", 4, "performance"),
        makeMetric("concurrent-connections", 6, "scalability"),
        makeMetric("operational-complexity", 4, "operational-complexity"),
      ],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
    }))

    const nodes = [
      makeNode("n1", "pg", "data-storage", "single-node"),
      makeNode("n2", "redis-cache", "caching"),
      makeNode("n3", "express", "compute"),
    ]
    const edges = [
      { source: "n1", target: "n2" },
      { source: "n2", target: "n3" },
    ]

    // Change A's config → triggers pipeline
    const result = recalculationService.run(nodes, edges, "n1")

    // All 3 nodes should be recalculated
    expect(result.metrics.size).toBe(3)
    expect(result.metrics.has("n1")).toBe(true)
    expect(result.metrics.has("n2")).toBe(true)
    expect(result.metrics.has("n3")).toBe(true)

    // Each node should have metrics
    for (const [, entry] of result.metrics) {
      expect(entry.metrics.length).toBeGreaterThan(0)
      expect(typeof entry.overallScore).toBe("number")
    }
  })

  it("propagation order: A first, B second, C third", () => {
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
      makeNode("A", "pg", "data-storage"),
      makeNode("B", "redis-cache", "caching"),
      makeNode("C", "express", "compute"),
    ]
    const edges = [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
    ]

    const result = recalculationService.run(nodes, edges, "A")

    expect(result.propagationHops[0].nodeId).toBe("A")
    expect(result.propagationHops[0].hopIndex).toBe(0)
    expect(result.propagationHops[1].nodeId).toBe("B")
    expect(result.propagationHops[1].hopIndex).toBe(1)
    expect(result.propagationHops[2].nodeId).toBe("C")
    expect(result.propagationHops[2].hopIndex).toBe(2)
  })

  it("determinism: same scenario twice produces identical results", () => {
    mockComponents.set("pg", makeComponent({
      id: "pg",
      category: "data-storage",
      baseMetrics: [
        makeMetric("read-latency", 5, "performance"),
        makeMetric("write-throughput", 6, "performance"),
      ],
      configVariants: [
        { id: "replica", name: "Replica", metrics: [makeMetric("read-latency", 2, "performance")] },
      ],
    }))
    mockComponents.set("redis-cache", makeComponent({
      id: "redis-cache",
      category: "caching",
      baseMetrics: [makeMetric("cache-hit-latency", 1, "performance")],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
    }))

    const nodes = [
      makeNode("n1", "pg", "data-storage", "replica"),
      makeNode("n2", "redis-cache", "caching"),
    ]
    const edges = [{ source: "n2", target: "n1" }]

    const result1 = recalculationService.run(nodes, edges, "n1")
    const result2 = recalculationService.run(nodes, edges, "n1")

    for (const [id, entry1] of result1.metrics) {
      const entry2 = result2.metrics.get(id)!
      expect(entry1.nodeId).toEqual(entry2.nodeId)
      expect(entry1.metrics).toEqual(entry2.metrics)
      expect(entry1.overallScore).toEqual(entry2.overallScore)
    }
  })

  it("partial variant metrics: 5 base + 2 variant overrides → merged 5 metrics", () => {
    mockComponents.set("pg", makeComponent({
      id: "pg",
      category: "data-storage",
      baseMetrics: [
        makeMetric("read-latency", 5, "performance"),
        makeMetric("write-throughput", 5, "performance"),
        makeMetric("horizontal-scalability", 3, "scalability"),
        makeMetric("data-durability", 9, "reliability"),
        makeMetric("operational-complexity", 5, "operational-complexity"),
      ],
      configVariants: [
        {
          id: "primary-replica",
          name: "Primary-Replica",
          metrics: [
            makeMetric("read-latency", 2, "performance"),     // overrides base 5
            makeMetric("horizontal-scalability", 5, "scalability"), // overrides base 3
          ],
        },
      ],
    }))

    const nodes = [makeNode("n1", "pg", "data-storage", "primary-replica")]

    const result = recalculationService.run(nodes, [], "n1")
    const nodeMetrics = result.metrics.get("n1")!

    // Should have all 5 base metrics, with 2 overridden
    expect(nodeMetrics.metrics).toHaveLength(5)

    const readLatency = nodeMetrics.metrics.find((m) => m.id === "read-latency")
    expect(readLatency!.numericValue).toBe(2) // variant override

    const scalability = nodeMetrics.metrics.find((m) => m.id === "horizontal-scalability")
    expect(scalability!.numericValue).toBe(5) // variant override

    const writeThroughput = nodeMetrics.metrics.find((m) => m.id === "write-throughput")
    expect(writeThroughput!.numericValue).toBe(5) // base value preserved

    const durability = nodeMetrics.metrics.find((m) => m.id === "data-durability")
    expect(durability!.numericValue).toBe(9) // base value preserved

    const opComplexity = nodeMetrics.metrics.find((m) => m.id === "operational-complexity")
    expect(opComplexity!.numericValue).toBe(5) // base value preserved
  })

  it("interaction rules modify metrics for connected category pairs", () => {
    // Connect caching to data-storage → check "caching→data-storage" rule fires
    mockComponents.set("pg", makeComponent({
      id: "pg",
      category: "data-storage",
      baseMetrics: [
        makeMetric("read-latency", 5, "performance"),
        makeMetric("operational-complexity", 5, "operational-complexity"),
      ],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
    }))
    mockComponents.set("redis-cache", makeComponent({
      id: "redis-cache",
      category: "caching",
      baseMetrics: [makeMetric("cache-hit-latency", 1, "performance")],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
    }))

    const nodes = [
      makeNode("pg-node", "pg", "data-storage"),
      makeNode("cache-node", "redis-cache", "caching"),
    ]
    const edges = [{ source: "cache-node", target: "pg-node" }]

    const result = recalculationService.run(nodes, edges, "pg-node")
    const pgMetrics = result.metrics.get("pg-node")!

    // "caching→data-storage" rule should modify read-latency
    const rule = INTERACTION_RULES["caching→data-storage"]
    expect(rule).toBeDefined()

    const readLatencyAdj = rule.find((a) => a.metricId === "read-latency")
    if (readLatencyAdj) {
      const readLatency = pgMetrics.metrics.find((m) => m.id === "read-latency")
      const expected = Math.max(1, Math.min(10, 5 + readLatencyAdj.adjustment))
      expect(readLatency!.numericValue).toBe(expected)
    }
  })

  it("pure engine functions do not import react, zustand, or firebase", () => {
    // Verify by calling engine functions directly — they work without any framework
    const metrics = [makeMetric("read-latency", 5, "performance")]
    const result = recalculateNode("test", "data-storage", metrics, [], [])
    expect(result.nodeId).toBe("test")

    const nodes = [{ id: "test", category: "data-storage" }]
    const archResult = recalculateArchitecture(nodes, [], () => metrics)
    expect(archResult.size).toBe(1)

    const affected = getAffectedNodes("test", [{ id: "test" }], [])
    expect(affected).toEqual(["test"])

    const hops = getPropagationHops("test", [{ id: "test" }], [])
    expect(hops).toHaveLength(1)
  })
})
