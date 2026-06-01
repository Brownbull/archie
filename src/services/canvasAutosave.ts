import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"
import type { WeightProfile } from "@/lib/constants"

/**
 * Canvas autosave (UX safety net). The architecture store is intentionally NOT a persisted
 * Zustand store (it holds large derived Maps that shouldn't round-trip). Instead we snapshot just
 * the source-of-truth graph — nodes, edges, weight profile, and the active scenario/failure — to
 * localStorage so a refresh or accidental tab-close doesn't wipe the user's work. On next load the
 * canvas is restored and a dismissible "Start fresh" toast is offered.
 *
 * Constraints and data-context items are not yet snapshotted (advanced features); the graph itself
 * is what a refresh must not lose.
 */
export const AUTOSAVE_KEY = "archie-canvas-autosave"
const AUTOSAVE_VERSION = 1

export interface SavedCanvas {
  v: number
  nodes: ArchieNode[]
  edges: ArchieEdge[]
  weightProfile?: WeightProfile
  activeScenarioId: string | null
  activeFailureScenarioId: string | null
}

interface CanvasSnapshot {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
  weightProfile: WeightProfile
  activeScenarioId: string | null
  activeFailureScenarioId: string | null
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage
  } catch {
    return false
  }
}

/** Writes a graph snapshot to localStorage. Swallows quota/serialization errors (best-effort). */
export function writeSavedCanvas(snapshot: CanvasSnapshot): void {
  if (!hasLocalStorage()) return
  try {
    const payload: SavedCanvas = { v: AUTOSAVE_VERSION, ...snapshot }
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded or serialization failure — autosave is best-effort, never block the app.
  }
}

/**
 * Reads and validates a saved canvas. Returns null when absent, unparseable, the wrong version, or
 * structurally invalid — so corrupt storage can never crash startup.
 */
export function readSavedCanvas(): SavedCanvas | null {
  if (!hasLocalStorage()) return null
  let raw: string | null
  try {
    raw = window.localStorage.getItem(AUTOSAVE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const doc = parsed as Partial<SavedCanvas>
    if (doc.v !== AUTOSAVE_VERSION) return null
    if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return null
    return {
      v: AUTOSAVE_VERSION,
      nodes: doc.nodes as ArchieNode[],
      edges: doc.edges as ArchieEdge[],
      weightProfile: doc.weightProfile,
      activeScenarioId: doc.activeScenarioId ?? null,
      activeFailureScenarioId: doc.activeFailureScenarioId ?? null,
    }
  } catch {
    return null
  }
}

export function clearSavedCanvas(): void {
  if (!hasLocalStorage()) return
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY)
  } catch {
    // ignore
  }
}
