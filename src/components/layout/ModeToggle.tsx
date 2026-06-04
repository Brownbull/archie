import { useState } from "react"
import { Trophy } from "lucide-react"
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
import { useUiStore } from "@/stores/uiStore"

/**
 * Always-visible Quest/Free mode toggle for the toolbar's left section (F2). Mode is DERIVED
 * from challengeStore: Quest Mode === activeChallenge !== null.
 *
 * Entering Quest Mode opens the Quest Log (journey tree). Accepting a quest there starts it
 * (sets activeChallenge → quest mode); closing the log without accepting leaves activeChallenge
 * null, so the toggle stays on Free. The "build challenges" surface (provider grid, clone, create)
 * lives separately under Build → Challenges. Exiting Quest Mode IS destructive at this layer
 * (it abandons the active quest), so it routes through a local confirm dialog.
 */
export function ModeToggle() {
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const setQuestLogOpen = useUiStore((s) => s.setQuestLogOpen)
  const [exitPending, setExitPending] = useState(false)

  const isQuestMode = activeChallenge !== null

  const onQuestClick = () => {
    if (isQuestMode) return
    setQuestLogOpen(true)
  }

  const onFreeClick = () => {
    if (!isQuestMode) return
    setExitPending(true)
  }

  const onConfirm = () => {
    useChallengeStore.getState().reset()
    setExitPending(false)
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
          <Trophy className="h-3 w-3" /> Quest Mode
        </button>
      </div>

      <Dialog open={exitPending} onOpenChange={(open) => !open && setExitPending(false)}>
        <DialogContent data-testid="mode-toggle-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exit Quest Mode?</DialogTitle>
            <DialogDescription>
              Leave the current quest and return to free building.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExitPending(false)}>
              Cancel
            </Button>
            <Button size="sm" data-testid="mode-toggle-confirm" onClick={onConfirm}>
              Exit Quest Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
