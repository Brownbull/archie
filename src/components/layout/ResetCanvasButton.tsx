import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useUiStore } from "@/stores/uiStore"
import { clearSavedCanvas } from "@/services/canvasAutosave"

/**
 * Clears the whole canvas to start from scratch (confirmed — it's destructive and resets the
 * undo history). Also stops any running simulation, drops the selection, and wipes the autosave so
 * a reload doesn't restore the cleared diagram.
 */
export function ResetCanvasButton() {
  const [open, setOpen] = useState(false)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)

  const onConfirm = () => {
    useArchitectureStore.getState().loadArchitecture([], [])
    useSimulationStore.getState().reset()
    useUiStore.getState().setSelectedNodeId(null)
    clearSavedCanvas()
    setOpen(false)
  }

  return (
    <>
      <Button
        data-testid="reset-canvas-button"
        variant="ghost"
        size="sm"
        disabled={nodeCount === 0}
        onClick={() => setOpen(true)}
        title="Clear the canvas and start from scratch"
        className="gap-1.5"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="reset-canvas-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset the canvas?</DialogTitle>
            <DialogDescription>
              This removes all {nodeCount} component{nodeCount === 1 ? "" : "s"} and their
              connections so you can start fresh. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" data-testid="reset-canvas-confirm" onClick={onConfirm}>
              Reset canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
