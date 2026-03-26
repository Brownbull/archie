import { describe, it, expect, vi, beforeEach } from "vitest"
import { recalculationService } from "@/services/recalculationService"
import type { MetricValue } from "@/schemas/metricSchema"
import type { Component } from "@/schemas/componentSchema"
import type { DemandProfile, DemandResponse } from "@/lib/demandTypes"

// --- Mock componentLibrary ---

const mockComponents = new Map<string, Component>()

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => mockComponents.get(id)),
  },
}))

// --- Mock scenarioLoader (prevents import.meta.glob in test) ---

vi.mock("@/services/scenarioLoader", () => ({
  getScenarioPreset: vi.fn(),
  getAllScenarioPresets: vi.fn(() => []),
  isKnownScenarioId: vi.fn(() => false),
}))

// --- Test Helpers ---

function makeMetric(id: string, numericValue: number, category: string): MetricValue {
  const value = numericValue <= 3 ? "low" : numericValue <= 7 ? "medium" : "high"
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

function makeNode(id: string, componentId: string, category: string) {
  return {
    id,
    data: {
      archieComponentId: componentId,
      activeConfigVariantId: "default",
      componentName: componentId,
      componentCategory: category,
    },
  }
}

// --- Demand response: PostgreSQL degrades under traffic ---
const pgDemandResponses: DemandResponse = {
  "traffic-volume": {
    extreme: {
      "read-latency": 0.4,       // severe degradation
      "write-throughput": 0.5,
    },
    high: {
      "read-latency": 0.7,
      "write-throughput": 0.8,
    },
  },
  "concurrent-users": {
    high: {
      "read-latency": 0.6,
      "write-throughput": 0.7,
    },
  },
}

// Nginx barely affected by traffic
const nginxDemandResponses: DemandResponse = {
  "traffic-volume": {
    extreme: {
      "request-routing": 0.9,    // minimal degradation
    },
  },
}

const TRAFFIC_PEAK_PROFILE: DemandProfile = {
  "traffic-volume": "extreme",
  "data-size": "medium",
  "concurrent-users": "high",
  "geographic-spread": "single-region",
  "burst-pattern": "periodic-spikes",
}

// --- Tests ---

describe("demand recalculation pipeline (integration)", () => {
  beforeEach(() => {
    mockComponents.clear()
  })

  it("Traffic Peak degrades PostgreSQL metrics, Nginx barely affected", () => {
    mockComponents.set("postgresql", makeComponent({
      id: "postgresql",
      category: "data-storage",
      configVariants: [{
        id: "default",
        name: "Default",
        metrics: [
          makeMetric("read-latency", 7, "performance"),
          makeMetric("write-throughput", 8, "performance"),
          makeMetric("data-durability", 9, "reliability"),
        ],
      }],
      demandResponses: pgDemandResponses,
    }))

    mockComponents.set("nginx", makeComponent({
      id: "nginx",
      category: "delivery-network",
      configVariants: [{
        id: "default",
        name: "Default",
        metrics: [
          makeMetric("request-routing", 8, "performance"),
          makeMetric("ssl-termination", 7, "security"),
        ],
      }],
      demandResponses: nginxDemandResponses,
    }))

    const nodes = [
      makeNode("n1", "postgresql", "data-storage"),
      makeNode("n2", "nginx", "delivery-network"),
    ]
    const edges = [{ id: "e1", source: "n1", target: "n2" }]

    // Baseline (no demand)
    const baseline = recalculationService.run(nodes, edges, "n1")
    const pgBaseline = baseline.metrics.get("n1")!
    const nginxBaseline = baseline.metrics.get("n2")!

    // With demand
    const demandResult = recalculationService.run(nodes, edges, "n1", TRAFFIC_PEAK_PROFILE)
    const pgDemand = demandResult.metrics.get("n1")!
    const nginxDemand = demandResult.metrics.get("n2")!

    // PostgreSQL: read-latency should degrade significantly
    const pgReadBaseline = pgBaseline.metrics.find((m) => m.id === "read-latency")!
    const pgReadDemand = pgDemand.metrics.find((m) => m.id === "read-latency")!
    expect(pgReadDemand.numericValue).toBeLessThan(pgReadBaseline.numericValue)

    // PostgreSQL: write-throughput should degrade
    const pgWriteBaseline = pgBaseline.metrics.find((m) => m.id === "write-throughput")!
    const pgWriteDemand = pgDemand.metrics.find((m) => m.id === "write-throughput")!
    expect(pgWriteDemand.numericValue).toBeLessThan(pgWriteBaseline.numericValue)

    // PostgreSQL: data-durability has no demand response — should be unchanged
    const pgDurBaseline = pgBaseline.metrics.find((m) => m.id === "data-durability")!
    const pgDurDemand = pgDemand.metrics.find((m) => m.id === "data-durability")!
    expect(pgDurDemand.numericValue).toBe(pgDurBaseline.numericValue)

    // Nginx: request-routing should barely degrade (0.9 multiplier)
    const nginxRoutBaseline = nginxBaseline.metrics.find((m) => m.id === "request-routing")!
    const nginxRoutDemand = nginxDemand.metrics.find((m) => m.id === "request-routing")!
    expect(nginxRoutDemand.numericValue).toBeGreaterThanOrEqual(nginxRoutBaseline.numericValue * 0.85)

    // Nginx: ssl-termination has no demand response — should be unchanged
    const nginxSslBaseline = nginxBaseline.metrics.find((m) => m.id === "ssl-termination")!
    const nginxSslDemand = nginxDemand.metrics.find((m) => m.id === "ssl-termination")!
    expect(nginxSslDemand.numericValue).toBe(nginxSslBaseline.numericValue)
  })

  it("heatmap status shifts under demand (healthy → warning for weak components)", () => {
    // Component with metrics right at the healthy/warning boundary
    mockComponents.set("borderline", makeComponent({
      id: "borderline",
      category: "compute",
      configVariants: [{
        id: "default",
        name: "Default",
        metrics: [
          makeMetric("cpu-utilization", 6, "performance"),   // just at warning threshold
          makeMetric("memory-usage", 7, "performance"),
        ],
      }],
      demandResponses: {
        "traffic-volume": {
          extreme: {
            "cpu-utilization": 0.5,   // drops to 3 → bottleneck
            "memory-usage": 0.7,      // drops to ~5 → warning
          },
        },
      },
    }))

    const nodes = [makeNode("n1", "borderline", "compute")]
    const edges: { id: string; source: string; target: string }[] = []

    // Baseline
    const baseline = recalculationService.run(nodes, edges, "n1")
    const baselineHeatmap = baseline.nodeHeatmap.get("n1")
    // With 6 and 7 avg = 6.5, depending on heatmap thresholds this may be "warning" or "healthy"

    // With extreme traffic
    const demandResult = recalculationService.run(nodes, edges, "n1", TRAFFIC_PEAK_PROFILE)
    const demandHeatmap = demandResult.nodeHeatmap.get("n1")

    // Under demand, scores drop significantly — heatmap should be worse or equal
    expect(["warning", "bottleneck"]).toContain(demandHeatmap)
    // If baseline was healthy, demand should have shifted it
    if (baselineHeatmap === "healthy") {
      expect(demandHeatmap).not.toBe("healthy")
    }
  })

  it("deselecting scenario (null demandProfile) reverts all metrics to baseline", () => {
    mockComponents.set("postgresql", makeComponent({
      id: "postgresql",
      category: "data-storage",
      configVariants: [{
        id: "default",
        name: "Default",
        metrics: [
          makeMetric("read-latency", 7, "performance"),
          makeMetric("write-throughput", 8, "performance"),
        ],
      }],
      demandResponses: pgDemandResponses,
    }))

    const nodes = [makeNode("n1", "postgresql", "data-storage")]
    const edges: { id: string; source: string; target: string }[] = []

    // Baseline
    const baseline = recalculationService.run(nodes, edges, "n1")
    const baseMetrics = baseline.metrics.get("n1")!.metrics

    // With demand
    const withDemand = recalculationService.run(nodes, edges, "n1", TRAFFIC_PEAK_PROFILE)
    const demandMetrics = withDemand.metrics.get("n1")!.metrics
    expect(demandMetrics[0].numericValue).not.toBe(baseMetrics[0].numericValue)

    // Revert (null profile = no demand)
    const reverted = recalculationService.run(nodes, edges, "n1", null)
    const revertedMetrics = reverted.metrics.get("n1")!.metrics

    // Should match baseline exactly
    for (let i = 0; i < baseMetrics.length; i++) {
      expect(revertedMetrics[i].numericValue).toBe(baseMetrics[i].numericValue)
    }
  })

  it("no demand profile means identity — same results as before story 9-4", () => {
    mockComponents.set("redis", makeComponent({
      id: "redis",
      category: "caching",
      configVariants: [{
        id: "default",
        name: "Default",
        metrics: [
          makeMetric("cache-hit-ratio", 9, "performance"),
          makeMetric("eviction-rate", 7, "reliability"),
        ],
      }],
    }))

    const nodes = [makeNode("n1", "redis", "caching")]
    const edges: { id: string; source: string; target: string }[] = []

    // Without demandProfile parameter (legacy call)
    const legacy = recalculationService.run(nodes, edges, "n1")

    // With explicit null
    const withNull = recalculationService.run(nodes, edges, "n1", null)

    // With undefined
    const withUndefined = recalculationService.run(nodes, edges, "n1", undefined)

    const legacyMetrics = legacy.metrics.get("n1")!.metrics
    const nullMetrics = withNull.metrics.get("n1")!.metrics
    const undefMetrics = withUndefined.metrics.get("n1")!.metrics

    for (let i = 0; i < legacyMetrics.length; i++) {
      expect(nullMetrics[i].numericValue).toBe(legacyMetrics[i].numericValue)
      expect(undefMetrics[i].numericValue).toBe(legacyMetrics[i].numericValue)
    }
  })
})
