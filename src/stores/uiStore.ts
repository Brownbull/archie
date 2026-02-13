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
  setToolboxTab: (tab: ToolboxTab) => void
  setSearchQuery: (query: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setInspectorCollapsed: (collapsed: boolean) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  toolboxTab: "components",
  searchQuery: "",
  commandPaletteOpen: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  inspectorCollapsed: false,
  setToolboxTab: (tab) => set({ toolboxTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setInspectorCollapsed: (collapsed) => set({ inspectorCollapsed: collapsed }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
}))
