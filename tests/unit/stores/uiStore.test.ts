import { describe, it, expect, beforeEach } from "vitest"
import { useUiStore } from "@/stores/uiStore"

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      toolboxTab: "components",
      searchQuery: "",
      commandPaletteOpen: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      inspectorCollapsed: false,
      heatmapEnabled: true,
    })
  })

  it("has correct default toolboxTab", () => {
    expect(useUiStore.getState().toolboxTab).toBe("components")
  })

  it("has correct default searchQuery", () => {
    expect(useUiStore.getState().searchQuery).toBe("")
  })

  it("has correct default commandPaletteOpen", () => {
    expect(useUiStore.getState().commandPaletteOpen).toBe(false)
  })

  it("setToolboxTab updates tab", () => {
    useUiStore.getState().setToolboxTab("stacks")
    expect(useUiStore.getState().toolboxTab).toBe("stacks")
  })

  it("setSearchQuery updates query", () => {
    useUiStore.getState().setSearchQuery("redis")
    expect(useUiStore.getState().searchQuery).toBe("redis")
  })

  it("setCommandPaletteOpen toggles open state", () => {
    useUiStore.getState().setCommandPaletteOpen(true)
    expect(useUiStore.getState().commandPaletteOpen).toBe(true)
    useUiStore.getState().setCommandPaletteOpen(false)
    expect(useUiStore.getState().commandPaletteOpen).toBe(false)
  })

  it("has correct default selectedNodeId", () => {
    expect(useUiStore.getState().selectedNodeId).toBeNull()
  })

  it("setSelectedNodeId updates selectedNodeId", () => {
    useUiStore.getState().setSelectedNodeId("node-1")
    expect(useUiStore.getState().selectedNodeId).toBe("node-1")
  })

  it("setSelectedNodeId can clear selection", () => {
    useUiStore.getState().setSelectedNodeId("node-1")
    useUiStore.getState().setSelectedNodeId(null)
    expect(useUiStore.getState().selectedNodeId).toBeNull()
  })

  describe("selectedEdgeId", () => {
    it("has correct default selectedEdgeId", () => {
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })

    it("setSelectedEdgeId updates selectedEdgeId", () => {
      useUiStore.getState().setSelectedEdgeId("edge-1")
      expect(useUiStore.getState().selectedEdgeId).toBe("edge-1")
    })

    it("setSelectedEdgeId can clear selection", () => {
      useUiStore.getState().setSelectedEdgeId("edge-1")
      useUiStore.getState().setSelectedEdgeId(null)
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })
  })

  describe("mutual exclusion", () => {
    it("setSelectedEdgeId clears selectedNodeId", () => {
      useUiStore.getState().setSelectedNodeId("node-1")
      expect(useUiStore.getState().selectedNodeId).toBe("node-1")

      useUiStore.getState().setSelectedEdgeId("edge-1")
      expect(useUiStore.getState().selectedEdgeId).toBe("edge-1")
      expect(useUiStore.getState().selectedNodeId).toBeNull()
    })

    it("setSelectedNodeId clears selectedEdgeId", () => {
      useUiStore.getState().setSelectedEdgeId("edge-1")
      expect(useUiStore.getState().selectedEdgeId).toBe("edge-1")

      useUiStore.getState().setSelectedNodeId("node-1")
      expect(useUiStore.getState().selectedNodeId).toBe("node-1")
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })
  })

  describe("inspectorCollapsed", () => {
    it("has correct default inspectorCollapsed (false)", () => {
      expect(useUiStore.getState().inspectorCollapsed).toBe(false)
    })

    it("setInspectorCollapsed sets to true", () => {
      useUiStore.getState().setInspectorCollapsed(true)
      expect(useUiStore.getState().inspectorCollapsed).toBe(true)
    })

    it("setInspectorCollapsed sets back to false", () => {
      useUiStore.getState().setInspectorCollapsed(true)
      useUiStore.getState().setInspectorCollapsed(false)
      expect(useUiStore.getState().inspectorCollapsed).toBe(false)
    })
  })

  describe("heatmapEnabled", () => {
    it("defaults to true", () => {
      expect(useUiStore.getState().heatmapEnabled).toBe(true)
    })

    it("toggleHeatmap toggles from true to false", () => {
      useUiStore.getState().toggleHeatmap()
      expect(useUiStore.getState().heatmapEnabled).toBe(false)
    })

    it("toggleHeatmap toggles from false to true", () => {
      useUiStore.setState({ heatmapEnabled: false })
      useUiStore.getState().toggleHeatmap()
      expect(useUiStore.getState().heatmapEnabled).toBe(true)
    })

    it("toggleHeatmap twice returns to original state", () => {
      useUiStore.getState().toggleHeatmap()
      useUiStore.getState().toggleHeatmap()
      expect(useUiStore.getState().heatmapEnabled).toBe(true)
    })
  })

  describe("clearSelection", () => {
    it("clears both selectedNodeId and selectedEdgeId", () => {
      useUiStore.getState().setSelectedNodeId("node-1")
      useUiStore.getState().clearSelection()
      expect(useUiStore.getState().selectedNodeId).toBeNull()
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })

    it("clears selectedEdgeId when edge is selected", () => {
      useUiStore.getState().setSelectedEdgeId("edge-1")
      useUiStore.getState().clearSelection()
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
      expect(useUiStore.getState().selectedNodeId).toBeNull()
    })

    it("is safe to call when nothing is selected", () => {
      useUiStore.getState().clearSelection()
      expect(useUiStore.getState().selectedNodeId).toBeNull()
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })
  })
})
