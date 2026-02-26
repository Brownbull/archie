import { create } from "zustand"

export type ToolboxTab = "components" | "stacks" | "blueprints"

// NOTE: architectureStore.removeNode directly writes selectedNodeId and
// selectedEdgeId in this store to clear stale selection on node deletion.
// See architectureStore.ts cross-store coupling comment (TD-1-3a / TD-1-4a).
interface UiState {
  toolboxTab: ToolboxTab
  searchQuery: string
  commandPaletteOpen: boolean
  selectedNodeId: string | null
  selectedEdgeId: string | null
  inspectorCollapsed: boolean
  heatmapEnabled: boolean
  // NOTE: legendDismissed is intentionally in-memory only (not persisted to localStorage).
  // If persistence is needed in future, route through a store action — never raw storage calls (AC-ARCH-NO-4).
  legendDismissed: boolean
  pendingNavNodeId: string | null
  setToolboxTab: (tab: ToolboxTab) => void
  setSearchQuery: (query: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setInspectorCollapsed: (collapsed: boolean) => void
  toggleHeatmap: () => void
  setLegendDismissed: (dismissed: boolean) => void
  setPendingNavNodeId: (id: string | null) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  toolboxTab: "components",
  searchQuery: "",
  commandPaletteOpen: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  inspectorCollapsed: false,
  heatmapEnabled: true,
  legendDismissed: false,
  pendingNavNodeId: null,
  setToolboxTab: (tab) => set({ toolboxTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setInspectorCollapsed: (collapsed) => set({ inspectorCollapsed: collapsed }),
  toggleHeatmap: () => set((state) => ({
    heatmapEnabled: !state.heatmapEnabled,
    legendDismissed: !state.heatmapEnabled ? false : state.legendDismissed,
  })),
  setLegendDismissed: (dismissed) => set({ legendDismissed: dismissed }),
  setPendingNavNodeId: (id) => set({ pendingNavNodeId: id }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
}))
