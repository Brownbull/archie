import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useShortcutsDialog } from "@/components/help/shortcutsDialogStore"

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl"

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: `${mod} Z`, label: "Undo" },
  { keys: `${mod} ⇧ Z`, label: "Redo" },
  { keys: "Del / Backspace", label: "Delete selected node(s) or edge" },
  { keys: "Shift + drag", label: "Box-select multiple nodes" },
  { keys: `Shift / ${mod} + click`, label: "Add a node to the selection" },
  { keys: `${mod} C`, label: "Copy the selected node" },
  { keys: `${mod} V`, label: "Paste a copy onto the canvas" },
  { keys: "Alt + 1–5", label: "Switch overlay mode (cost, perf, tier…)" },
  { keys: "?", label: "Show this shortcuts list" },
]

/** Keyboard shortcuts reference. Opened with `?` or from the Settings menu. */
export function KeyboardShortcutsDialog() {
  const open = useShortcutsDialog((s) => s.open)
  const setOpen = useShortcutsDialog((s) => s.setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="shortcuts-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Speed up building and editing on the canvas.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-text-secondary">{s.label}</span>
              <kbd className="shrink-0 rounded border border-archie-border bg-surface px-1.5 py-0.5 font-mono text-[0.6875rem] text-text-primary">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
