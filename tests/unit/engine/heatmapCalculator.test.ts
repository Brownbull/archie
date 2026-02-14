import { describe, it, expect } from "vitest"
import {
  computeHeatmapStatus,
  computeArchitectureHeatmap,
  computeEdgeHeatmapStatus,
} from "@/engine/heatmapCalculator"

describe("heatmapCalculator", () => {
  describe("computeHeatmapStatus", () => {
    it("returns healthy for score 10", () => {
      expect(computeHeatmapStatus(10)).toBe("healthy")
    })

    it("returns healthy for score 8", () => {
      expect(computeHeatmapStatus(8)).toBe("healthy")
    })

    it("returns healthy for score 6 (boundary)", () => {
      expect(computeHeatmapStatus(6)).toBe("healthy")
    })

    it("returns warning for score 5.9 (just below warning threshold)", () => {
      expect(computeHeatmapStatus(5.9)).toBe("warning")
    })

    it("returns warning for score 5", () => {
      expect(computeHeatmapStatus(5)).toBe("warning")
    })

    it("returns warning for score 4 (boundary)", () => {
      expect(computeHeatmapStatus(4)).toBe("warning")
    })

    it("returns bottleneck for score 3.9 (just below bottleneck threshold)", () => {
      expect(computeHeatmapStatus(3.9)).toBe("bottleneck")
    })

    it("returns bottleneck for score 1", () => {
      expect(computeHeatmapStatus(1)).toBe("bottleneck")
    })

    it("returns bottleneck for score 0", () => {
      expect(computeHeatmapStatus(0)).toBe("bottleneck")
    })

    it("returns bottleneck for negative score", () => {
      expect(computeHeatmapStatus(-5)).toBe("bottleneck")
    })

    it("returns healthy for score above 10", () => {
      expect(computeHeatmapStatus(15)).toBe("healthy")
    })
  })

  describe("computeArchitectureHeatmap", () => {
    it("returns empty map for empty input", () => {
      const result = computeArchitectureHeatmap(new Map())
      expect(result.size).toBe(0)
    })

    it("computes correct status for single node", () => {
      const metrics = new Map([["node-1", { overallScore: 8 }]])
      const result = computeArchitectureHeatmap(metrics)
      expect(result.get("node-1")).toBe("healthy")
    })

    it("computes correct statuses for three nodes with mixed scores", () => {
      const metrics = new Map([
        ["node-1", { overallScore: 8 }],
        ["node-2", { overallScore: 5 }],
        ["node-3", { overallScore: 2 }],
      ])
      const result = computeArchitectureHeatmap(metrics)
      expect(result.get("node-1")).toBe("healthy")
      expect(result.get("node-2")).toBe("warning")
      expect(result.get("node-3")).toBe("bottleneck")
    })

    it("preserves all nodeIds from input map", () => {
      const metrics = new Map([
        ["a", { overallScore: 7 }],
        ["b", { overallScore: 3 }],
        ["c", { overallScore: 5 }],
      ])
      const result = computeArchitectureHeatmap(metrics)
      expect(result.size).toBe(3)
      expect(result.has("a")).toBe(true)
      expect(result.has("b")).toBe(true)
      expect(result.has("c")).toBe(true)
    })
  })

  describe("computeEdgeHeatmapStatus", () => {
    it("returns healthy when both endpoints are healthy", () => {
      expect(computeEdgeHeatmapStatus("healthy", "healthy")).toBe("healthy")
    })

    it("returns warning when one healthy and one warning", () => {
      expect(computeEdgeHeatmapStatus("healthy", "warning")).toBe("warning")
      expect(computeEdgeHeatmapStatus("warning", "healthy")).toBe("warning")
    })

    it("returns bottleneck when one healthy and one bottleneck", () => {
      expect(computeEdgeHeatmapStatus("healthy", "bottleneck")).toBe("bottleneck")
      expect(computeEdgeHeatmapStatus("bottleneck", "healthy")).toBe("bottleneck")
    })

    it("returns warning when both are warning", () => {
      expect(computeEdgeHeatmapStatus("warning", "warning")).toBe("warning")
    })

    it("returns bottleneck when one warning and one bottleneck", () => {
      expect(computeEdgeHeatmapStatus("warning", "bottleneck")).toBe("bottleneck")
      expect(computeEdgeHeatmapStatus("bottleneck", "warning")).toBe("bottleneck")
    })

    it("returns bottleneck when both are bottleneck", () => {
      expect(computeEdgeHeatmapStatus("bottleneck", "bottleneck")).toBe("bottleneck")
    })

    it("defaults source undefined to healthy", () => {
      expect(computeEdgeHeatmapStatus(undefined, "warning")).toBe("warning")
      expect(computeEdgeHeatmapStatus(undefined, "healthy")).toBe("healthy")
    })

    it("defaults target undefined to healthy", () => {
      expect(computeEdgeHeatmapStatus("warning", undefined)).toBe("warning")
      expect(computeEdgeHeatmapStatus("healthy", undefined)).toBe("healthy")
    })

    it("returns healthy when both are undefined", () => {
      expect(computeEdgeHeatmapStatus(undefined, undefined)).toBe("healthy")
    })
  })
})
