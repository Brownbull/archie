import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/stores/uiStore"
import { useUserCanvasesStore, CANVAS_NAME_MAX } from "@/stores/userCanvasesStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { useArchitectureStore } from "@/stores/architectureStore"
import { captureCanvasSnapshot } from "@/services/canvasSnapshot"

function slotLabel(savedAt: number): string {
  return new Date(savedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

/**
 * "Save Canvas" slot picker — up to 2 named, per-user saved canvases. Reused by the File menu and
 * by the mode-switch "Save & continue" guard (which sets uiStore.pendingSaveAction; on a successful
 * save we run it, e.g. to proceed with the deferred Free/Quest switch).
 */
export function SaveCanvasDialog() {
  const open = useUiStore((s) => s.saveCanvasOpen)
  const setOpen = useUiStore((s) => s.setSaveCanvasOpen)
  const pendingSaveAction = useUiStore((s) => s.pendingSaveAction)
  const setPendingSaveAction = useUiStore((s) => s.setPendingSaveAction)
  const slots = useUserCanvasesStore((s) => s.slots)
  const userId = useCurrentUserId()
  const nodeCount = useArchitectureStore((s) => s.nodes.length)

  const [name, setName] = useState("")
  const [selected, setSelected] = useState(0)
  const [wasOpen, setWasOpen] = useState(false)

  // Initialize when the dialog transitions to open: select the first empty slot (or slot 0) and
  // prefill its name. Render-time reset (React's "adjust state on prop change" pattern) instead of
  // a setState-in-effect, which the react-compiler flags for cascading renders.
  if (open && !wasOpen) {
    setWasOpen(true)
    const firstEmpty = slots.findIndex((s) => s === null)
    const idx = firstEmpty === -1 ? 0 : firstEmpty
    setSelected(idx)
    setName(slots[idx]?.name ?? "")
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const close = (next: boolean) => {
    if (!next) setPendingSaveAction(null) // dropping the dialog cancels any pending guard action
    setOpen(next)
  }

  const onSave = async () => {
    if (!userId) {
      toast.error("Sign in to save canvases")
      return
    }
    const action = pendingSaveAction
    const ok = await useUserCanvasesStore.getState().saveToSlot(userId, selected, name, captureCanvasSnapshot())
    if (!ok) {
      toast.error(useUserCanvasesStore.getState().error ?? "Could not save your canvas")
      return
    }
    toast.success(`Canvas saved to Slot ${selected + 1}`)
    setPendingSaveAction(null)
    setOpen(false)
    action?.() // proceed with the deferred mode switch, if any
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent data-testid="save-canvas-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save canvas</DialogTitle>
          <DialogDescription>
            Store the current canvas ({nodeCount} block{nodeCount === 1 ? "" : "s"}) in one of your two slots.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {slots.map((slot, i) => (
            <button
              key={i}
              type="button"
              data-testid={`save-canvas-slot-${i}`}
              data-selected={selected === i || undefined}
              onClick={() => {
                setSelected(i)
                if (slot?.name) setName(slot.name)
              }}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors",
                selected === i
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-archie-border hover:border-blue-500/50",
              )}
            >
              <span className="font-medium text-text-primary">Slot {i + 1}</span>
              {slot ? (
                <span className="flex flex-col items-end">
                  <span className="text-text-primary">{slot.name}</span>
                  <span className="text-[0.625rem] text-text-secondary">{slotLabel(slot.savedAt)} · overwrite</span>
                </span>
              ) : (
                <span className="text-text-secondary">Empty</span>
              )}
            </button>
          ))}
          <Input
            data-testid="save-canvas-name"
            value={name}
            maxLength={CANVAS_NAME_MAX}
            placeholder="Name this canvas"
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-8 text-xs"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            data-testid="save-canvas-confirm"
            disabled={name.trim().length === 0 || nodeCount === 0}
            onClick={onSave}
          >
            Save to Slot {selected + 1}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
