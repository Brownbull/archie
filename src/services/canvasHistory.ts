import { create } from "zustand"
import { useArchitectureStore, type ArchieNode, type ArchieEdge } from "@/stores/architectureStore"

/**
 * Undo/redo for the canvas graph. Snapshot-based and non-invasive: instead of threading history
 * into every store action, we watch the store and record a {nodes, edges} snapshot whenever those
 * array refs change (the store mutates immutably, so ref-equality cleanly detects real changes and
 * coalesces a drag into one entry via debounce). Undo/redo re-apply a snapshot with setNodes/
 * setEdges (same array refs → not re-recorded) then recalc. A load/import/blueprint/restore resets
 * the baseline, so "open" isn't itself undoable — matching how most design tools behave.
 */
interface Snapshot {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
}

const MAX_HISTORY = 60

let past: Snapshot[] = []
let future: Snapshot[] = []
let committed: Snapshot | null = null

/** Reactive flags for toolbar buttons; the data itself lives in module state above. */
export const useHistoryStore = create<{ canUndo: boolean; canRedo: boolean }>(() => ({
  canUndo: false,
  canRedo: false,
}))

function syncFlags(): void {
  useHistoryStore.setState({ canUndo: past.length > 0, canRedo: future.length > 0 })
}

function snapshot(): Snapshot {
  const s = useArchitectureStore.getState()
  return { nodes: s.nodes, edges: s.edges }
}

/** (Re)sets the baseline to the current graph and clears both stacks. */
export function resetHistory(): void {
  committed = snapshot()
  past = []
  future = []
  syncFlags()
}

/** Records the prior committed snapshot if the graph arrays actually changed. */
export function recordIfChanged(): void {
  const next = snapshot()
  if (committed && next.nodes === committed.nodes && next.edges === committed.edges) return
  if (committed) {
    past.push(committed)
    if (past.length > MAX_HISTORY) past.shift()
  }
  future = []
  committed = next
  syncFlags()
}

function apply(snap: Snapshot): void {
  const s = useArchitectureStore.getState()
  s.setNodes(snap.nodes)
  s.setEdges(snap.edges)
  // setNodes doesn't recalc on its own; refresh metrics/heatmap from the restored graph.
  // Guarded: a recalc hiccup must never leave undo/redo in a broken state.
  try {
    s.triggerRecalculation(snap.nodes[0]?.id ?? "")
  } catch {
    // metrics will refresh on the next interaction
  }
  committed = snap // store now holds these exact refs → recordIfChanged will no-op
  syncFlags()
}

export function undo(): void {
  if (past.length === 0 || committed === null) return
  future.push(committed)
  const prev = past.pop() as Snapshot
  apply(prev)
}

export function redo(): void {
  if (future.length === 0 || committed === null) return
  past.push(committed)
  const next = future.pop() as Snapshot
  apply(next)
}

let recordTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Wires the store → history recorder (debounced) plus a baseline reset on load. Returns a cleanup.
 * Called once from a hook mounted in the app shell.
 */
export function installHistoryRecorder(): () => void {
  resetHistory()
  let prevLoadNonce = useArchitectureStore.getState().loadNonce

  const unsub = useArchitectureStore.subscribe((s) => {
    // A load/import/blueprint/restore (loadNonce bump) is a new baseline, not an undo step.
    if (s.loadNonce !== prevLoadNonce) {
      prevLoadNonce = s.loadNonce
      if (recordTimer) clearTimeout(recordTimer)
      resetHistory()
      return
    }
    if (recordTimer) clearTimeout(recordTimer)
    recordTimer = setTimeout(recordIfChanged, 350)
  })

  return () => {
    if (recordTimer) clearTimeout(recordTimer)
    unsub()
  }
}
