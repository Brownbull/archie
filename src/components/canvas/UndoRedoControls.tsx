import { Undo2, Redo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useHistoryStore, undo, redo } from "@/services/canvasHistory"

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl"

/** Undo / Redo buttons for the toolbar, reflecting the canvas history stacks. */
export function UndoRedoControls() {
  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)
  return (
    <div className="flex items-center">
      <Button
        data-testid="undo-button"
        variant="ghost"
        size="sm"
        onClick={() => undo()}
        disabled={!canUndo}
        title={`Undo (${mod}Z)`}
        aria-label="Undo"
        className="px-1.5"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        data-testid="redo-button"
        variant="ghost"
        size="sm"
        onClick={() => redo()}
        disabled={!canRedo}
        title={`Redo (${mod}⇧Z)`}
        aria-label="Redo"
        className="px-1.5"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
