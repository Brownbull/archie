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
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"

/**
 * D105b — change the auto-assigned nickname (profile menu). Uniqueness enforced via the
 * nicknames claim collection: a taken name errors "Name is occupied. Please use another one."
 */
export function NicknameDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const userId = useCurrentUserId()
  const current = useUserProgressStore((s) => s.nickname)
  const changeNickname = useUserProgressStore((s) => s.changeNickname)
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    if (!userId || saving) return
    setSaving(true)
    setError(null)
    const err = await changeNickname(userId, value)
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    toast.success("Nickname updated.")
    setValue("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setValue(""); setError(null) } onOpenChange(o) }}>
      <DialogContent data-testid="nickname-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change nickname</DialogTitle>
          <DialogDescription>
            Your public name on the leaderboard. Currently:{" "}
            <span className="font-semibold text-text-primary">{current ?? "—"}</span>
          </DialogDescription>
        </DialogHeader>
        <input
          data-testid="nickname-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void onSave() }}
          placeholder="3–20 characters: letters, numbers, _ or -"
          className="w-full rounded-md border border-archie-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-blue-500/60"
        />
        {error && (
          <p data-testid="nickname-error" className="text-xs text-red-400">{error}</p>
        )}
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-testid="nickname-save" size="sm" disabled={saving || value.trim().length === 0} onClick={() => void onSave()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
