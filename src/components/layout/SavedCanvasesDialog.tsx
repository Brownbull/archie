import { toast } from "sonner"
import { FolderOpen, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUiStore } from "@/stores/uiStore"
import { useUserCanvasesStore } from "@/stores/userCanvasesStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { restoreCanvasSnapshot } from "@/services/canvasSnapshot"

function when(savedAt: number): string {
  return new Date(savedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

/**
 * "Saved Canvases" manager — lists the user's 2 saved-canvas slots with Load + Delete. Loading
 * restores the snapshot into the canvas (replacing the current one, same path as YAML import).
 */
export function SavedCanvasesDialog() {
  const open = useUiStore((s) => s.savedCanvasesOpen)
  const setOpen = useUiStore((s) => s.setSavedCanvasesOpen)
  const slots = useUserCanvasesStore((s) => s.slots)
  const userId = useCurrentUserId()

  const onLoad = (index: number) => {
    const slot = slots[index]
    if (!slot) return
    restoreCanvasSnapshot(slot.canvas)
    toast.success(`Loaded "${slot.name}"`)
    setOpen(false)
  }

  const onDelete = (index: number) => {
    if (!userId) return
    void useUserCanvasesStore.getState().deleteSlot(userId, index)
    toast.success(`Deleted Slot ${index + 1}`)
  }

  const hasAny = slots.some((s) => s !== null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="saved-canvases-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Saved canvases</DialogTitle>
          <DialogDescription>
            {hasAny ? "Loading a canvas replaces what's currently on the canvas." : "You haven't saved any canvases yet."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {slots.map((slot, i) => (
            <div
              key={i}
              data-testid={`saved-canvas-slot-${i}`}
              className="flex items-center justify-between rounded-md border border-archie-border px-3 py-2 text-xs"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-medium text-text-primary">Slot {i + 1}</span>
                {slot ? (
                  <span className="truncate text-text-secondary">
                    {slot.name} · {when(slot.savedAt)}
                  </span>
                ) : (
                  <span className="text-text-secondary">Empty</span>
                )}
              </div>
              {slot && (
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="outline" data-testid={`saved-canvas-load-${i}`} className="h-7 gap-1" onClick={() => onLoad(i)}>
                    <FolderOpen className="h-3 w-3" /> Load
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`saved-canvas-delete-${i}`}
                    aria-label={`Delete Slot ${i + 1}`}
                    className="h-7 w-7 p-0 text-text-secondary hover:text-red-400"
                    onClick={() => onDelete(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
