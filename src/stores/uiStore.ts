import { create } from "zustand"
import { INSPECTOR_DEFAULT_WIDTH, INSPECTOR_MIN_WIDTH, INSPECTOR_MAX_WIDTH } from "@/lib/constants"

export type ToolboxTab = "components" | "stacks" | "blueprints"

// NOTE: architectureStore.removeNode directly writes selectedNodeId and
// selectedEdgeId in this store to clear stale selection on node deletion.
// See architectureStore.ts cross-store coupling comment (TD-1-3a / TD-1-4a).

export type DragSource =
  | { kind: "toolbox"; componentId: string; componentCategory: string }
  | { kind: "connection"; sourceNodeId: string; sourceCategory: string }

interface UiState {
  toolboxTab: ToolboxTab
  searchQuery: string
  commandPaletteOpen: boolean
  selectedNodeId: string | null
  selectedEdgeId: string | null
  inspectorCollapsed: boolean
  inspectorWidth: number
  inspectorOverlay: boolean
  heatmapEnabled: boolean
  legendDismissed: boolean
  pendingNavNodeId: string | null
  activeDrag: DragSource | null
  setToolboxTab: (tab: ToolboxTab) => void
  setSearchQuery: (query: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setInspectorCollapsed: (collapsed: boolean) => void
  setInspectorWidth: (width: number) => void
  setInspectorOverlay: (overlay: boolean) => void
  toggleHeatmap: () => void
  setLegendDismissed: (dismissed: boolean) => void
  setPendingNavNodeId: (id: string | null) => void
  setActiveDrag: (drag: DragSource | null) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  toolboxTab: "components",
  searchQuery: "",
  commandPaletteOpen: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  inspectorCollapsed: false,
  inspectorWidth: INSPECTOR_DEFAULT_WIDTH,
  inspectorOverlay: false,
  heatmapEnabled: true,
  legendDismissed: false,
  pendingNavNodeId: null,
  activeDrag: null,
  setToolboxTab: (tab) => set({ toolboxTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setInspectorCollapsed: (collapsed) => set({ inspectorCollapsed: collapsed }),
  setInspectorWidth: (width) => set({
    inspectorWidth: Math.max(INSPECTOR_MIN_WIDTH, Math.min(INSPECTOR_MAX_WIDTH, width)),
  }),
  setInspectorOverlay: (overlay) => set({ inspectorOverlay: overlay }),
  toggleHeatmap: () => set((state) => ({
    heatmapEnabled: !state.heatmapEnabled,
    legendDismissed: !state.heatmapEnabled ? false : state.legendDismissed,
  })),
  setLegendDismissed: (dismissed) => set({ legendDismissed: dismissed }),
  setPendingNavNodeId: (id) => set({ pendingNavNodeId: id }),
  setActiveDrag: (drag) => set({ activeDrag: drag }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
}))
