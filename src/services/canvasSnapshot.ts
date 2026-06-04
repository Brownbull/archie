import { useArchitectureStore } from "@/stores/architectureStore"
import type { SavedCanvas } from "@/services/canvasAutosave"

/**
 * Capture the JSON-serializable canvas source-of-truth — the same shape the localStorage autosave
 * snapshots (nodes, edges, weight profile, active scenario/failure). Deliberately excludes the
 * non-serializable `dataContextItems` Map and runtime constraints, matching autosave. Used by the
 * named-save slots (userCanvasesStore).
 */
export function captureCanvasSnapshot(): SavedCanvas {
  const s = useArchitectureStore.getState()
  return {
    v: 1,
    nodes: s.nodes,
    edges: s.edges,
    weightProfile: s.weightProfile,
    activeScenarioId: s.activeScenarioId,
    activeFailureScenarioId: s.activeFailureScenarioId,
  }
}

/** Restore a saved canvas snapshot into the live canvas (same call path as YAML import / autosave). */
export function restoreCanvasSnapshot(canvas: SavedCanvas): void {
  useArchitectureStore
    .getState()
    .loadArchitecture(
      canvas.nodes,
      canvas.edges,
      canvas.weightProfile,
      undefined,
      undefined,
      canvas.activeScenarioId,
      canvas.activeFailureScenarioId,
    )
}
