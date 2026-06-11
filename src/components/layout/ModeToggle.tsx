import { useState } from "react"
import { Scroll } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"

/**
 * Always-visible Quest/Free mode toggle. Mode is DERIVED from challengeStore: Quest Mode ===
 * activeChallenge !== null.
 *
 * Switching modes is guarded: if the canvas has blocks, we ask whether to save the current canvas
 * to a slot before switching (Save & continue / Don't save / Cancel). Entering Quest Mode opens the
 * Quest Log (accept a quest there to actually start it); exiting Quest Mode clears the challenge
 * state via challengeStore.reset(). An empty canvas switches with no prompt.
 */
export function ModeToggle() {
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const setQuestLogOpen = useUiStore((s) => s.setQuestLogOpen)
  const setSaveCanvasOpen = useUiStore((s) => s.setSaveCanvasOpen)
  const setPendingSaveAction = useUiStore((s) => s.setPendingSaveAction)

  // The deferred mode switch awaiting the save/discard/cancel decision (null = no prompt open).
  const [guard, setGuard] = useState<{ proceed: () => void; target: "quest" | "free" } | null>(null)

  const isQuestMode = activeChallenge !== null

  const guardThenRun = (proceed: () => void, target: "quest" | "free") => {
    if (nodeCount === 0) proceed()
    else setGuard({ proceed, target })
  }

  const onQuestClick = () => {
    if (isQuestMode) return
    guardThenRun(() => setQuestLogOpen(true), "quest")
  }

  const onFreeClick = () => {
    if (!isQuestMode) return
    guardThenRun(() => useChallengeStore.getState().reset(), "free")
  }

  const proceedWithoutSaving = () => {
    const proceed = guard?.proceed
    setGuard(null)
    proceed?.()
  }

  const saveThenProceed = () => {
    if (guard) setPendingSaveAction(guard.proceed)
    setGuard(null)
    setSaveCanvasOpen(true)
  }

  return (
    <>
      <div
        data-testid="mode-toggle"
        role="group"
        aria-label="Build mode"
        className="flex items-center rounded-md border border-archie-border bg-background p-0.5"
      >
        <button
          type="button"
          data-testid="mode-toggle-free"
          aria-pressed={!isQuestMode}
          onClick={onFreeClick}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            !isQuestMode
              ? "bg-primary text-primary-foreground"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Free Mode
        </button>
        <button
          type="button"
          data-testid="mode-toggle-quest"
          aria-pressed={isQuestMode}
          onClick={onQuestClick}
          className={cn(
            "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
            isQuestMode
              ? "bg-primary text-primary-foreground"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <Scroll className="h-3 w-3" /> Quest Mode
        </button>
      </div>

      <Dialog open={guard !== null} onOpenChange={(open) => !open && setGuard(null)}>
        <DialogContent data-testid="mode-toggle-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{guard?.target === "free" ? "Leave Quest Mode?" : "Switch to Quest Mode?"}</DialogTitle>
            <DialogDescription>
              You have {nodeCount} block{nodeCount === 1 ? "" : "s"} on the canvas. Save them to a
              slot before switching?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1 sm:gap-1">
            <Button variant="outline" size="sm" data-testid="mode-toggle-cancel" onClick={() => setGuard(null)}>
              Cancel
            </Button>
            <Button variant="ghost" size="sm" data-testid="mode-toggle-confirm" onClick={proceedWithoutSaving}>
              Don&apos;t save
            </Button>
            <Button size="sm" data-testid="mode-toggle-save" onClick={saveThenProceed}>
              Save &amp; continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
