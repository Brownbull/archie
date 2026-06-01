import { useEffect } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { installHistoryRecorder, undo, redo } from "@/services/canvasHistory"
import { useShortcutsDialog } from "@/components/help/shortcutsDialogStore"

// Last-copied node id (copy-once, paste-many). Module-scoped, cleared on a fresh page load.
let clipboardNodeId: string | null = null

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node) return false
  const tag = node.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable
}

/**
 * Canvas keyboard shortcuts + history recorder. Installs the undo/redo recorder and binds
 * Undo (⌘/Ctrl+Z), Redo (⌘/Ctrl+⇧Z or Ctrl+Y), Copy/Paste a node (⌘/Ctrl+C / V), and `?` for the
 * shortcuts help. Ignores events while typing in inputs so it never hijacks text editing.
 * Mounted once from the app shell. (Delete and multi-select are handled natively by React Flow.)
 */
export function useCanvasShortcuts(): void {
  useEffect(() => {
    const uninstallHistory = installHistoryRecorder()

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (mod && key === "z") {
        if (isTypingTarget(e.target)) return
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && key === "y") {
        if (isTypingTarget(e.target)) return
        e.preventDefault()
        redo()
        return
      }
      // "?" — some layouts/headless browsers report this as "/" with Shift held.
      if ((e.key === "?" || (e.key === "/" && e.shiftKey)) && !isTypingTarget(e.target)) {
        e.preventDefault()
        useShortcutsDialog.getState().toggle()
        return
      }
      if (isTypingTarget(e.target)) return
      if (mod && key === "c") {
        const selected = useUiStore.getState().selectedNodeId
        if (selected) clipboardNodeId = selected
        return
      }
      if (mod && key === "v") {
        if (!clipboardNodeId) return
        e.preventDefault()
        const newId = useArchitectureStore.getState().duplicateNode(clipboardNodeId)
        if (newId) useUiStore.getState().setSelectedNodeId(newId)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      uninstallHistory()
    }
  }, [])
}
