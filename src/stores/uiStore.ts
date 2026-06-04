import { create } from "zustand"
import { INSPECTOR_DEFAULT_WIDTH, INSPECTOR_MIN_WIDTH, INSPECTOR_MAX_WIDTH, OVERLAY_MODES, type OverlayModeId } from "@/lib/constants"

export type ToolboxTab = "components" | "stacks" | "blueprints" | "history"

// NOTE: architectureStore.removeNode directly writes selectedNodeId and
// selectedEdgeId in this store to clear stale selection on node deletion.
// See architectureStore.ts cross-store coupling comment (TD-1-3a / TD-1-4a).

export type DragSource =
  | { kind: "toolbox"; componentId: string; componentCategory: string }
  | { kind: "connection"; sourceNodeId: string; sourceCategory: string; sourceHandle: string | null; sourceComponentId: string }

export interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface UiState {
  toolboxTab: ToolboxTab
  searchQuery: string
  commandPaletteOpen: boolean
  challengesOpen: boolean
  /** Quest Log (journey tree) dialog open? Lifted to uiStore so the Quest/Free mode toggle can
      open it — selecting a quest there starts it (enters quest mode); cancelling stays in Free. */
  questLogOpen: boolean
  /** AI-prompt template dialog open? Lifted to uiStore so the menu bar can open it (P95). */
  promptOpen: boolean
  /** Reset-canvas confirm dialog open? Lifted to uiStore so the menu bar can open it (P95). */
  resetCanvasOpen: boolean
  selectedNodeId: string | null
  selectedEdgeId: string | null
  inspectorCollapsed: boolean
  inspectorWidth: number
  inspectorOverlay: boolean
  heatmapEnabled: boolean
  legendDismissed: boolean
  pendingNavNodeId: string | null
  activeDrag: DragSource | null
  contextMenu: ContextMenuState | null
  overlayMode: OverlayModeId
  swapTargetNodeId: string | null
  setOverlayMode: (mode: OverlayModeId) => void
  cycleOverlayMode: () => void
  openSwapTarget: (nodeId: string) => void
  clearSwapTarget: () => void
  setToolboxTab: (tab: ToolboxTab) => void
  setSearchQuery: (query: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setChallengesOpen: (open: boolean) => void
  setQuestLogOpen: (open: boolean) => void
  setPromptOpen: (open: boolean) => void
  setResetCanvasOpen: (open: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setInspectorCollapsed: (collapsed: boolean) => void
  setInspectorWidth: (width: number) => void
  setInspectorOverlay: (overlay: boolean) => void
  toggleHeatmap: () => void
  setLegendDismissed: (dismissed: boolean) => void
  setPendingNavNodeId: (id: string | null) => void
  setActiveDrag: (drag: DragSource | null) => void
  openContextMenu: (menu: ContextMenuState) => void
  closeContextMenu: () => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  toolboxTab: "components",
  searchQuery: "",
  commandPaletteOpen: false,
  challengesOpen: false,
  questLogOpen: false,
  promptOpen: false,
  resetCanvasOpen: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  inspectorCollapsed: false,
  inspectorWidth: INSPECTOR_DEFAULT_WIDTH,
  inspectorOverlay: false,
  heatmapEnabled: true,
  legendDismissed: false,
  pendingNavNodeId: null,
  activeDrag: null,
  contextMenu: null,
  overlayMode: "none" as OverlayModeId,
  swapTargetNodeId: null,
  setOverlayMode: (mode) => set({ overlayMode: mode }),
  openSwapTarget: (nodeId) => set({ swapTargetNodeId: nodeId }),
  clearSwapTarget: () => set({ swapTargetNodeId: null }),
  cycleOverlayMode: () => set((state) => {
    const currentIndex = OVERLAY_MODES.findIndex((m) => m.id === state.overlayMode)
    const nextIndex = (currentIndex + 1) % OVERLAY_MODES.length
    return { overlayMode: OVERLAY_MODES[nextIndex].id }
  }),
  setToolboxTab: (tab) => set({ toolboxTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setChallengesOpen: (open) => set({ challengesOpen: open }),
  setQuestLogOpen: (open) => set({ questLogOpen: open }),
  setPromptOpen: (open) => set({ promptOpen: open }),
  setResetCanvasOpen: (open) => set({ resetCanvasOpen: open }),
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
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
}))
