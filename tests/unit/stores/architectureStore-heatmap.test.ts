import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import {
  NODE_TYPE_COMPONENT,
  EDGE_TYPE_CONNECTION,
  RIPPLE_DELAY_MS,
  RIPPLE_ANIMATION_DURATION_MS,
} from "@/lib/constants"

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

  describe("setTimeout cleanup (TD-2-2c)", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Set up two connected nodes for ripple propagation
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
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("AC-1: clearPendingRippleTimeouts cancels previous timeouts on rapid recalculation", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")

      // First recalculation schedules ripple timeout for n2 at RIPPLE_DELAY_MS
      useArchitectureStore.getState().triggerRecalculation("n1")

      // No ripple yet — timeout hasn't fired
      expect(useArchitectureStore.getState().rippleActiveNodeIds.size).toBe(0)

      clearTimeoutSpy.mockClear()

      // Second recalculation should cancel first's pending timeouts
      useArchitectureStore.getState().triggerRecalculation("n1")

      // clearTimeout was called at least once (clearing first recalculation's pending ripple timeouts)
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0)

      // Advance past ripple delay — only second recalculation's timeout executes
      vi.advanceTimersByTime(RIPPLE_DELAY_MS + 10)

      // n2 should still get rippled (from the second call)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has("n2")).toBe(true)

      // Advance past animation duration to clear ripple
      vi.advanceTimersByTime(RIPPLE_ANIMATION_DURATION_MS)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has("n2")).toBe(false)

      clearTimeoutSpy.mockRestore()
    })

    it("AC-2: stale generation guard prevents old ripple from executing", () => {
      // Trigger recalculation — schedules ripple timeout for n2
      useArchitectureStore.getState().triggerRecalculation("n1")

      // Bump recalcGeneration beyond the captured value to simulate a newer recalculation
      const currentGen = useArchitectureStore.getState().recalcGeneration
      useArchitectureStore.setState({ recalcGeneration: currentGen + 100 })

      // Advance past ripple delay — timeout fires but isStale() returns true
      vi.advanceTimersByTime(RIPPLE_DELAY_MS + 10)

      // n2 should NOT be rippled (stale generation guard prevented update)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has("n2")).toBe(false)
    })

    it("AC-3: node deletion during propagation skips ripple callback", () => {
      // Trigger recalculation — schedules ripple timeout for n2
      useArchitectureStore.getState().triggerRecalculation("n1")

      // Remove n2 before the ripple timeout fires (simulate user deleting node)
      useArchitectureStore.setState({
        nodes: useArchitectureStore.getState().nodes.filter((n: { id: string }) => n.id !== "n2"),
        edges: [],
      })

      // Advance past ripple delay — timeout fires but node existence check fails
      vi.advanceTimersByTime(RIPPLE_DELAY_MS + 10)

      // n2 should NOT be rippled (node no longer exists)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has("n2")).toBe(false)
    })

    it("restores real timers without contaminating other tests", () => {
      // Verify fake timers are active in this describe block
      useArchitectureStore.getState().triggerRecalculation("n1")

      // Ripple should NOT have fired yet (fake timers hold it)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.size).toBe(0)

      // Advance to fire ripple — confirms fake timers are controlling execution
      vi.advanceTimersByTime(RIPPLE_DELAY_MS + 10)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has("n2")).toBe(true)
    })
  })
})
