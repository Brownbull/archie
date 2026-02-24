import { describe, it, expect } from "vitest"
import {
  recalculateNode,
  recalculateArchitecture,
  INTERACTION_RULES,
  type ConnectedNodeInfo,
} from "@/engine/recalculator"
import { makeMetric } from "../../helpers/factories"

// --- Tests ---

describe("recalculator", () => {
  describe("INTERACTION_RULES", () => {
    it("has between 5 and 8 rules", () => {
      const ruleCount = Object.keys(INTERACTION_RULES).length
      expect(ruleCount).toBeGreaterThanOrEqual(5)
      expect(ruleCount).toBeLessThanOrEqual(8)
    })

    it("every rule key uses arrow format 'category→category'", () => {
      for (const key of Object.keys(INTERACTION_RULES)) {
        expect(key).toContain("→")
        const parts = key.split("→")
        expect(parts).toHaveLength(2)
        expect(parts[0].length).toBeGreaterThan(0)
        expect(parts[1].length).toBeGreaterThan(0)
      }
    })

    it("every adjustment has a metricId and numeric adjustment in [-2, 2]", () => {
      for (const [, adjustments] of Object.entries(INTERACTION_RULES)) {
        expect(adjustments.length).toBeGreaterThanOrEqual(1)
        expect(adjustments.length).toBeLessThanOrEqual(3)
        for (const adj of adjustments) {
          expect(adj.metricId).toBeDefined()
          expect(adj.metricId.length).toBeGreaterThan(0)
          expect(adj.adjustment).toBeGreaterThanOrEqual(-2)
          expect(adj.adjustment).toBeLessThanOrEqual(2)
        }
      }
    })
  })

  describe("recalculateNode", () => {
    it("returns effective metrics unchanged when node has no connections", () => {
      const metrics = [
        makeMetric({ id: "read-latency", numericValue: 5, category: "performance" }),
        makeMetric({ id: "write-throughput", numericValue: 6, category: "performance" }),
      ]
      const result = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        [],
        [],
      )
      expect(result.nodeId).toBe("node-1")
      expect(result.metrics).toHaveLength(2)
      expect(result.metrics[0].numericValue).toBe(5)
      expect(result.metrics[1].numericValue).toBe(6)
    })

    it("does not mutate input effectiveMetrics array", () => {
      const metrics = [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })]
      const original = [...metrics.map((m) => ({ ...m }))]
      recalculateNode("node-1", "data-storage", metrics, [], [])
      expect(metrics).toEqual(original)
    })

    it("does not mutate input connectedNodes array", () => {
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "node-2",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
      ]
      const originalConnected = JSON.parse(JSON.stringify(connected))
      recalculateNode(
        "node-1",
        "data-storage",
        [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })],
        connected,
        [{ source: "node-2", target: "node-1" }],
      )
      expect(connected).toEqual(originalConnected)
    })

    it("applies interaction rule adjustments for matching category pair", () => {
      // caching→data-storage rule should apply when recalculating data-storage connected to caching
      const metrics = [
        makeMetric({ id: "read-latency", numericValue: 5, category: "performance" }),
        makeMetric({ id: "operational-complexity", numericValue: 5, category: "operational-complexity" }),
      ]
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "cache-node",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
      ]
      const edges = [{ source: "cache-node", target: "node-1" }]
      const result = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        connected,
        edges,
      )

      // Verify the rule was applied by checking metrics changed
      const rule = INTERACTION_RULES["caching→data-storage"]
      expect(rule).toBeDefined()

      for (const adj of rule) {
        const resultMetric = result.metrics.find((m) => m.id === adj.metricId)
        const originalMetric = metrics.find((m) => m.id === adj.metricId)
        if (resultMetric && originalMetric) {
          const expected = Math.max(
            1,
            Math.min(10, originalMetric.numericValue + adj.adjustment),
          )
          expect(resultMetric.numericValue).toBe(expected)
        }
      }
    })

    it("leaves metrics unchanged when no matching interaction rule exists", () => {
      // auth-security→search has no rule defined
      const metrics = [makeMetric({ id: "query-latency", numericValue: 5, category: "performance" })]
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "auth-node",
          category: "auth-security",
          metrics: [makeMetric({ id: "operational-complexity", numericValue: 3, category: "operational-complexity" })],
        },
      ]
      const edges = [{ source: "auth-node", target: "node-1" }]
      const result = recalculateNode(
        "node-1",
        "search",
        metrics,
        connected,
        edges,
      )
      expect(result.metrics[0].numericValue).toBe(5)
    })

    it("skips adjustments for metric IDs not present in effective metrics", () => {
      // caching→data-storage has read-latency adjustment, but node only has write-throughput
      const metrics = [makeMetric({ id: "write-throughput", numericValue: 5, category: "performance" })]
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "cache-node",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
      ]
      const edges = [{ source: "cache-node", target: "node-1" }]
      const result = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        connected,
        edges,
      )
      // write-throughput should be unchanged (no rule targets it for this pair)
      const writeMetric = result.metrics.find(
        (m) => m.id === "write-throughput",
      )
      expect(writeMetric?.numericValue).toBe(5)
    })

    it("clamps numericValue at lower bound (1)", () => {
      // Create a scenario where adjustment would push below 1
      const metrics = [makeMetric({ id: "read-latency", numericValue: 1, category: "performance" })]
      // Find a rule with negative adjustment for read-latency
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "cache-node",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
      ]
      const edges = [{ source: "cache-node", target: "node-1" }]
      const result = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        connected,
        edges,
      )
      const readLatency = result.metrics.find((m) => m.id === "read-latency")
      expect(readLatency!.numericValue).toBeGreaterThanOrEqual(1)
    })

    it("clamps numericValue at upper bound (10)", () => {
      // Create scenario where adjustment would push above 10
      const metrics = [
        makeMetric({ id: "horizontal-scalability", numericValue: 10, category: "scalability" }),
      ]
      // messaging→compute adds +2 to horizontal-scalability
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "msg-node",
          category: "messaging",
          metrics: [makeMetric({ id: "message-throughput", numericValue: 8, category: "performance" })],
        },
      ]
      const edges = [{ source: "msg-node", target: "node-1" }]
      const result = recalculateNode(
        "node-1",
        "compute",
        metrics,
        connected,
        edges,
      )
      const scalability = result.metrics.find(
        (m) => m.id === "horizontal-scalability",
      )
      expect(scalability!.numericValue).toBeLessThanOrEqual(10)
      expect(scalability!.numericValue).toBe(10) // clamped, not 12
    })

    it("derives value enum 'low' for numericValue 1-3", () => {
      const metrics = [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })]
      // caching→data-storage: read-latency adjustment=-2 → 5-2=3 → "low"
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "cache-node",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
      ]
      const edges = [{ source: "cache-node", target: "node-1" }]
      const result = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        connected,
        edges,
      )
      const readLatency = result.metrics.find((m) => m.id === "read-latency")
      if (readLatency && readLatency.numericValue <= 3) {
        expect(readLatency.value).toBe("low")
      }
    })

    it("derives value enum 'medium' for numericValue 4-7", () => {
      const metrics = [makeMetric({ id: "request-latency", numericValue: 6, category: "performance" })]
      const result = recalculateNode("node-1", "compute", metrics, [], [])
      expect(result.metrics[0].value).toBe("medium")
      expect(result.metrics[0].numericValue).toBe(6)
    })

    it("derives value enum 'high' for numericValue 8-10", () => {
      const metrics = [makeMetric({ id: "data-durability", numericValue: 9, category: "reliability" })]
      const result = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        [],
        [],
      )
      expect(result.metrics[0].value).toBe("high")
    })

    it("computes overallScore as average of all numericValues", () => {
      const metrics = [
        makeMetric({ id: "read-latency", numericValue: 4, category: "performance" }),
        makeMetric({ id: "write-throughput", numericValue: 6, category: "performance" }),
        makeMetric({ id: "data-durability", numericValue: 8, category: "reliability" }),
      ]
      const result = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        [],
        [],
      )
      expect(result.overallScore).toBe(6) // (4+6+8)/3 = 6
    })

    it("returns overallScore 0 for empty metrics", () => {
      const result = recalculateNode("node-1", "compute", [], [], [])
      expect(result.overallScore).toBe(0)
      expect(result.metrics).toEqual([])
    })

    it("is deterministic — same inputs produce same output", () => {
      const metrics = [
        makeMetric({ id: "read-latency", numericValue: 5, category: "performance" }),
        makeMetric({ id: "operational-complexity", numericValue: 5, category: "operational-complexity" }),
      ]
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "cache-node",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
      ]
      const edges = [{ source: "cache-node", target: "node-1" }]

      const result1 = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        connected,
        edges,
      )
      const result2 = recalculateNode(
        "node-1",
        "data-storage",
        metrics,
        connected,
        edges,
      )
      expect(result1).toEqual(result2)
    })

    it("checks both directions of the category pair for rules", () => {
      // When recalculating compute connected to data-storage:
      // check "data-storage→compute" AND "compute→data-storage"
      const metrics = [
        makeMetric({ id: "operational-complexity", numericValue: 5, category: "operational-complexity" }),
        makeMetric({ id: "data-durability", numericValue: 5, category: "reliability" }),
      ]
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "db-node",
          category: "data-storage",
          metrics: [makeMetric({ id: "read-latency", numericValue: 3, category: "performance" })],
        },
      ]
      const edges = [{ source: "node-1", target: "db-node" }]

      const result = recalculateNode(
        "node-1",
        "compute",
        metrics,
        connected,
        edges,
      )

      // "data-storage→compute" rule should fire
      const dsToComputeRule = INTERACTION_RULES["data-storage→compute"]
      if (dsToComputeRule) {
        // At least one adjustment should have been applied
        const hasAdjustedMetric = dsToComputeRule.some((adj) => {
          const resultMetric = result.metrics.find(
            (m) => m.id === adj.metricId,
          )
          const originalMetric = metrics.find((m) => m.id === adj.metricId)
          return (
            resultMetric &&
            originalMetric &&
            resultMetric.numericValue !== originalMetric.numericValue
          )
        })
        expect(hasAdjustedMetric).toBe(true)
      }
    })

    it("accumulates adjustments from multiple connected nodes", () => {
      // Connect a compute node to TWO caching nodes — adjustments should stack
      const metrics = [makeMetric({ id: "request-latency", numericValue: 8, category: "performance" })]
      const connected: ConnectedNodeInfo[] = [
        {
          nodeId: "cache-1",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
        {
          nodeId: "cache-2",
          category: "caching",
          metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
        },
      ]
      const edges = [
        { source: "cache-1", target: "node-1" },
        { source: "cache-2", target: "node-1" },
      ]

      const result = recalculateNode(
        "node-1",
        "compute",
        metrics,
        connected,
        edges,
      )

      // caching→compute has request-latency adjustment
      const cachingRule = INTERACTION_RULES["caching→compute"]
      if (cachingRule) {
        const reqLatAdj = cachingRule.find(
          (a) => a.metricId === "request-latency",
        )
        if (reqLatAdj) {
          // Two caching nodes means adjustment applied twice
          const expected = Math.max(
            1,
            Math.min(10, 8 + reqLatAdj.adjustment * 2),
          )
          const resultMetric = result.metrics.find(
            (m) => m.id === "request-latency",
          )
          expect(resultMetric!.numericValue).toBe(expected)
        }
      }
    })
  })

  describe("recalculateArchitecture", () => {
    it("returns empty map for empty graph", () => {
      const result = recalculateArchitecture([], [], () => [])
      expect(result.size).toBe(0)
    })

    it("computes metrics for all nodes in the graph", () => {
      const nodes = [
        { id: "node-1", category: "data-storage" },
        { id: "node-2", category: "caching" },
      ]
      const edges = [{ source: "node-1", target: "node-2" }]
      const getMetrics = (nodeId: string): MetricValue[] => {
        if (nodeId === "node-1")
          return [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })]
        if (nodeId === "node-2")
          return [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })]
        return []
      }

      const result = recalculateArchitecture(nodes, edges, getMetrics)
      expect(result.size).toBe(2)
      expect(result.has("node-1")).toBe(true)
      expect(result.has("node-2")).toBe(true)
    })

    it("each entry is a valid RecalculatedMetrics with nodeId, metrics, and overallScore", () => {
      const nodes = [{ id: "node-1", category: "compute" }]
      const getMetrics = (): MetricValue[] => [
        makeMetric({ id: "request-latency", numericValue: 4, category: "performance" }),
      ]

      const result = recalculateArchitecture(nodes, [], getMetrics)
      const entry = result.get("node-1")!
      expect(entry.nodeId).toBe("node-1")
      expect(entry.metrics).toHaveLength(1)
      expect(typeof entry.overallScore).toBe("number")
    })

    it("returns deterministic results for same inputs", () => {
      const nodes = [
        { id: "node-1", category: "data-storage" },
        { id: "node-2", category: "caching" },
      ]
      const edges = [{ source: "node-2", target: "node-1" }]
      const getMetrics = (nodeId: string): MetricValue[] => {
        if (nodeId === "node-1")
          return [makeMetric({ id: "read-latency", numericValue: 5, category: "performance" })]
        return [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })]
      }

      const result1 = recalculateArchitecture(nodes, edges, getMetrics)
      const result2 = recalculateArchitecture(nodes, edges, getMetrics)

      for (const [id, entry1] of result1) {
        const entry2 = result2.get(id)!
        expect(entry1).toEqual(entry2)
      }
    })

    it("handles single node with no connections", () => {
      const nodes = [{ id: "solo", category: "compute" }]
      const getMetrics = (): MetricValue[] => [
        makeMetric({ id: "request-latency", numericValue: 3, category: "performance" }),
      ]

      const result = recalculateArchitecture(nodes, [], getMetrics)
      expect(result.size).toBe(1)
      const entry = result.get("solo")!
      expect(entry.metrics[0].numericValue).toBe(3) // unchanged, no connections
    })
  })

  describe("category pair cache optimization", () => {
    it("correctly accumulates adjustments from 5+ connections of same category", () => {
      // 5 caching nodes connected to a compute node
      // caching→compute rule: request-latency adjustment = -2
      // 5 connections * -2 = -10 adjustment on base value 8 => clamped to 1
      const metrics = [makeMetric({ id: "request-latency", numericValue: 8, category: "performance" })]
      const connectedNodes: ConnectedNodeInfo[] = Array.from({ length: 5 }, (_, i) => ({
        nodeId: `cache-${i}`,
        category: "caching",
        metrics: [makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" })],
      }))
      const edges = connectedNodes.map((cn) => ({
        source: cn.nodeId,
        target: "node-1",
      }))

      const result = recalculateNode(
        "node-1",
        "compute",
        metrics,
        connectedNodes,
        edges,
      )

      const cachingRule = INTERACTION_RULES["caching→compute"]
      expect(cachingRule).toBeDefined()
      const reqLatAdj = cachingRule.find((a) => a.metricId === "request-latency")
      expect(reqLatAdj).toBeDefined()

      // 5 connections * adjustment, clamped to [1, 10]
      const expectedRaw = 8 + reqLatAdj!.adjustment * 5
      const expected = Math.max(1, Math.min(10, expectedRaw))
      const resultMetric = result.metrics.find((m) => m.id === "request-latency")
      expect(resultMetric!.numericValue).toBe(expected) // should be 1 (clamped from -2)
    })

    it("handles 20-node hub-and-spoke graph correctly", () => {
      const hubMetrics = [
        makeMetric({ id: "request-latency", numericValue: 5, category: "performance" }),
        makeMetric({ id: "horizontal-scalability", numericValue: 5, category: "scalability" }),
        makeMetric({ id: "operational-complexity", numericValue: 5, category: "operational-complexity" }),
        makeMetric({ id: "concurrent-connections", numericValue: 5, category: "performance" }),
        makeMetric({ id: "data-durability", numericValue: 5, category: "reliability" }),
      ]

      const categories = [
        "caching", "data-storage", "messaging", "delivery-network",
        "monitoring", "real-time", "caching", "data-storage",
        "messaging", "caching", "data-storage", "monitoring",
        "delivery-network", "real-time", "caching", "messaging",
        "data-storage", "caching", "monitoring",
      ]

      const connectedNodes: ConnectedNodeInfo[] = categories.map((cat, i) => ({
        nodeId: `spoke-${i}`,
        category: cat,
        metrics: [makeMetric({ id: "some-metric", numericValue: 5, category: "performance" })],
      }))

      const edges = categories.map((_, i) => ({
        source: `spoke-${i}`,
        target: "hub",
      }))

      const result = recalculateNode(
        "hub",
        "compute",
        hubMetrics,
        connectedNodes,
        edges,
      )

      // Should complete without error
      expect(result.nodeId).toBe("hub")
      expect(result.metrics).toHaveLength(5)
      // All metrics should be clamped within 1-10
      for (const m of result.metrics) {
        expect(m.numericValue).toBeGreaterThanOrEqual(1)
        expect(m.numericValue).toBeLessThanOrEqual(10)
      }
      // Determinism check: running again should produce identical results
      const result2 = recalculateNode(
        "hub",
        "compute",
        hubMetrics,
        connectedNodes,
        edges,
      )
      expect(result).toEqual(result2)
    })
  })

  describe("value enum boundary precision", () => {
    it("numericValue 3 derives 'low'", () => {
      const result = recalculateNode("n1", "compute", [makeMetric({ id: "m1", numericValue: 3, category: "perf" })], [], [])
      expect(result.metrics[0].value).toBe("low")
    })

    it("numericValue 4 derives 'medium'", () => {
      const result = recalculateNode("n1", "compute", [makeMetric({ id: "m1", numericValue: 4, category: "perf" })], [], [])
      expect(result.metrics[0].value).toBe("medium")
    })

    it("numericValue 7 derives 'medium'", () => {
      const result = recalculateNode("n1", "compute", [makeMetric({ id: "m1", numericValue: 7, category: "perf" })], [], [])
      expect(result.metrics[0].value).toBe("medium")
    })

    it("numericValue 8 derives 'high'", () => {
      const result = recalculateNode("n1", "compute", [makeMetric({ id: "m1", numericValue: 8, category: "perf" })], [], [])
      expect(result.metrics[0].value).toBe("high")
    })

    it("numericValue 1 derives 'low' (minimum)", () => {
      const result = recalculateNode("n1", "compute", [makeMetric({ id: "m1", numericValue: 1, category: "perf" })], [], [])
      expect(result.metrics[0].value).toBe("low")
    })

    it("numericValue 10 derives 'high' (maximum)", () => {
      const result = recalculateNode("n1", "compute", [makeMetric({ id: "m1", numericValue: 10, category: "perf" })], [], [])
      expect(result.metrics[0].value).toBe("high")
    })
  })
})
