import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import { NODE_TYPE_COMPONENT, EDGE_TYPE_CONNECTION } from "@/lib/constants"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => {
      if (id === "postgresql") {
        return {
          id: "postgresql",
          name: "PostgreSQL",
          category: "data-storage",
          description: "Relational database",
          is: "An open-source relational database",
          gain: ["ACID compliance"],
          cost: ["Higher memory usage"],
          tags: ["database"],
          baseMetrics: [
            { id: "read-latency", value: "medium", numericValue: 5, category: "performance" },
          ],
          configVariants: [{ id: "default", name: "Default", metrics: [] }],
        }
      }
      if (id === "redis") {
        return {
          id: "redis",
          name: "Redis",
          category: "caching",
          description: "In-memory cache",
          is: "An in-memory data store",
          gain: ["Low latency"],
          cost: ["Memory cost"],
          tags: ["cache"],
          baseMetrics: [
            { id: "cache-hit-latency", value: "low", numericValue: 2, category: "performance" },
          ],
          configVariants: [{ id: "default", name: "Default", metrics: [] }],
        }
      }
      return undefined
    }),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("sonner", () => ({
  toast: { warning: vi.fn() },
}))

let uuidCounter = 0
vi.stubGlobal("crypto", {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
})

describe("architectureStore - heatmap", () => {
  beforeEach(() => {
    uuidCounter = 0
    useArchitectureStore.setState({
      nodes: [],
      edges: [],
      computedMetrics: new Map(),
      previousMetrics: new Map(),
      heatmapColors: new Map(),
      edgeHeatmapColors: new Map(),
      rippleActiveNodeIds: new Set(),
      recalcGeneration: 0,
    })
    useUiStore.setState({ selectedNodeId: null, selectedEdgeId: null })
  })

  describe("initial state", () => {
    it("heatmapColors initialized as empty Map", () => {
      expect(useArchitectureStore.getState().heatmapColors).toBeInstanceOf(Map)
      expect(useArchitectureStore.getState().heatmapColors.size).toBe(0)
    })

    it("edgeHeatmapColors initialized as empty Map", () => {
      expect(useArchitectureStore.getState().edgeHeatmapColors).toBeInstanceOf(Map)
      expect(useArchitectureStore.getState().edgeHeatmapColors.size).toBe(0)
    })
  })

  describe("triggerRecalculation", () => {
    it("populates heatmapColors after recalculation", () => {
      // Set up a node with known component
      useArchitectureStore.setState({
        nodes: [
          {
            id: "n1",
            type: NODE_TYPE_COMPONENT,
            position: { x: 0, y: 0 },
            data: {
              archieComponentId: "postgresql",
              activeConfigVariantId: "default",
              componentName: "PostgreSQL",
              componentCategory: "data-storage",
            },
          },
        ],
        edges: [],
      })

      useArchitectureStore.getState().triggerRecalculation("n1")

      const heatmapColors = useArchitectureStore.getState().heatmapColors
      expect(heatmapColors.has("n1")).toBe(true)
      // PostgreSQL baseMetric has numericValue: 5, overallScore = 5
      // 5 >= 4 && 5 < 6 -> "warning"
      expect(heatmapColors.get("n1")).toBe("warning")
    })

    it("populates edgeHeatmapColors for connected nodes", () => {
      useArchitectureStore.setState({
        nodes: [
          {
            id: "n1",
            type: NODE_TYPE_COMPONENT,
            position: { x: 0, y: 0 },
            data: {
              archieComponentId: "postgresql",
              activeConfigVariantId: "default",
              componentName: "PostgreSQL",
              componentCategory: "data-storage",
            },
          },
          {
            id: "n2",
            type: NODE_TYPE_COMPONENT,
            position: { x: 200, y: 0 },
            data: {
              archieComponentId: "redis",
              activeConfigVariantId: "default",
              componentName: "Redis",
              componentCategory: "caching",
            },
          },
        ],
        edges: [
          {
            id: "e1",
            source: "n1",
            target: "n2",
            type: EDGE_TYPE_CONNECTION,
            data: {
              isIncompatible: false,
              incompatibilityReason: null,
              sourceArchieComponentId: "postgresql",
              targetArchieComponentId: "redis",
            },
          },
        ],
      })

      useArchitectureStore.getState().triggerRecalculation("n1")

      const edgeHeatmapColors = useArchitectureStore.getState().edgeHeatmapColors
      expect(edgeHeatmapColors.has("e1")).toBe(true)
      // Edge uses worst-case of endpoints
      const edgeStatus = edgeHeatmapColors.get("e1")
      // Worst-case of two endpoints: PostgreSQL (score ~5 → warning), Redis (score ~2 → bottleneck)
      expect(edgeStatus).toBe("bottleneck")
    })

    it("heatmapColors uses new Map instances (immutability)", () => {
      useArchitectureStore.setState({
        nodes: [
          {
            id: "n1",
            type: NODE_TYPE_COMPONENT,
            position: { x: 0, y: 0 },
            data: {
              archieComponentId: "postgresql",
              activeConfigVariantId: "default",
              componentName: "PostgreSQL",
              componentCategory: "data-storage",
            },
          },
        ],
        edges: [],
      })

      const beforeMap = useArchitectureStore.getState().heatmapColors

      useArchitectureStore.getState().triggerRecalculation("n1")

      const afterMap = useArchitectureStore.getState().heatmapColors
      // Reference must be different (new Map created)
      expect(afterMap).not.toBe(beforeMap)
    })
  })

  describe("removeNode", () => {
    it("cleans up heatmapColors for the removed node", () => {
      // Pre-populate heatmapColors
      const heatmapColors = new Map<string, HeatmapStatus>([
        ["n1", "warning"],
        ["n2", "healthy"],
      ])
      useArchitectureStore.setState({
        nodes: [
          {
            id: "n1",
            type: NODE_TYPE_COMPONENT,
            position: { x: 0, y: 0 },
            data: {
              archieComponentId: "postgresql",
              activeConfigVariantId: "default",
              componentName: "PostgreSQL",
              componentCategory: "data-storage",
            },
          },
          {
            id: "n2",
            type: NODE_TYPE_COMPONENT,
            position: { x: 200, y: 0 },
            data: {
              archieComponentId: "redis",
              activeConfigVariantId: "default",
              componentName: "Redis",
              componentCategory: "caching",
            },
          },
        ],
        edges: [],
        heatmapColors,
      })

      useArchitectureStore.getState().removeNode("n1")

      const updatedHeatmap = useArchitectureStore.getState().heatmapColors
      expect(updatedHeatmap.has("n1")).toBe(false)
      expect(updatedHeatmap.has("n2")).toBe(true)
    })
  })
})
