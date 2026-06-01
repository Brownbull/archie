import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useUiStore } from "@/stores/uiStore"
import { clearSavedCanvas } from "@/services/canvasAutosave"

/**
 * Reset-canvas confirm dialog (P95). Controlled by uiStore so the File menu can open it — the
 * inline toolbar trigger was removed when the toolbar became a menu bar. Confirming clears the
 * whole canvas (destructive, resets undo history), stops any running sim, drops the selection,
 * and wipes the autosave so a reload doesn't restore the cleared diagram.
 */
export function ResetCanvasDialog() {
  const open = useUiStore((s) => s.resetCanvasOpen)
  const setOpen = useUiStore((s) => s.setResetCanvasOpen)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)

  const onConfirm = () => {
    useArchitectureStore.getState().loadArchitecture([], [])
    useSimulationStore.getState().reset()
    useUiStore.getState().setSelectedNodeId(null)
    clearSavedCanvas()
    setOpen(false)
  }

  return (
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
  )
}
