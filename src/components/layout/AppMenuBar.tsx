import { useState } from "react"
import { FileUp, RotateCcw, Undo2, Redo2, BrainCircuit, Trophy, Save, FolderOpen } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useImportAction } from "@/components/import-export/ImportDialog"
import { ExportButton } from "@/components/import-export/ExportButton"
import { ExportReportButton } from "@/components/toolbar/ExportReportButton"
import { useHistoryStore, undo, redo } from "@/services/canvasHistory"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { useAuth } from "@/hooks/useAuth"

const TRIGGER_CLASS =
  "rounded px-2 py-1 text-sm text-text-secondary hover:bg-surface hover:text-text-primary data-[state=open]:bg-surface data-[state=open]:text-text-primary"

/**
 * Top menu bar (P95) — groups the former toolbar actions under File / Edit / Build dropdowns so the
 * top bar stays clean. Dialog-backed actions (Reset, AI Prompt, Challenges) open via uiStore flags;
 * the dialogs themselves are rendered once in the Toolbar. The two export actions reuse their
 * existing button components (wrapped to close the menu on click), preserving their tested logic.
 */
export function AppMenuBar() {
  const { triggerFilePicker } = useImportAction()
  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const setPromptOpen = useUiStore((s) => s.setPromptOpen)
  const setChallengesOpen = useUiStore((s) => s.setChallengesOpen)
  const setResetCanvasOpen = useUiStore((s) => s.setResetCanvasOpen)
  const setSaveCanvasOpen = useUiStore((s) => s.setSaveCanvasOpen)
  const setSavedCanvasesOpen = useUiStore((s) => s.setSavedCanvasesOpen)
  const { user } = useAuth()
  const [fileOpen, setFileOpen] = useState(false)

  return (
    <div className="flex items-center gap-0.5" data-testid="app-menu-bar">
      <DropdownMenu open={fileOpen} onOpenChange={setFileOpen}>
        <DropdownMenuTrigger asChild>
          <button type="button" data-testid="menu-file" className={TRIGGER_CLASS}>File</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" data-testid="menu-file-content">
          <DropdownMenuItem data-testid="menu-import" onSelect={() => triggerFilePicker()}>
            <FileUp className="mr-2 h-3.5 w-3.5" /> Import YAML…
          </DropdownMenuItem>
          {/* Reuse the existing export buttons; the wrapper closes the menu after their click. */}
          <div onClick={() => setFileOpen(false)} className="flex flex-col">
            <ExportButton />
            <ExportReportButton />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-testid="menu-save-canvas"
            disabled={nodeCount === 0 || !user}
            onSelect={() => setSaveCanvasOpen(true)}
          >
            <Save className="mr-2 h-3.5 w-3.5" /> Save Canvas…
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid="menu-saved-canvases"
            disabled={!user}
            onSelect={() => setSavedCanvasesOpen(true)}
          >
            <FolderOpen className="mr-2 h-3.5 w-3.5" /> Saved Canvases…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-testid="menu-reset"
            disabled={nodeCount === 0}
            onSelect={() => setResetCanvasOpen(true)}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset Canvas…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" data-testid="menu-edit" className={TRIGGER_CLASS}>Edit</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" data-testid="menu-edit-content">
          <DropdownMenuItem data-testid="menu-undo" disabled={!canUndo} onSelect={() => undo()}>
            <Undo2 className="mr-2 h-3.5 w-3.5" /> Undo
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-redo" disabled={!canRedo} onSelect={() => redo()}>
            <Redo2 className="mr-2 h-3.5 w-3.5" /> Redo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" data-testid="menu-build" className={TRIGGER_CLASS}>Build</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" data-testid="menu-build-content">
          <DropdownMenuItem data-testid="menu-ai-prompt" onSelect={() => setPromptOpen(true)}>
            <BrainCircuit className="mr-2 h-3.5 w-3.5" /> AI Prompt…
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-challenges" onSelect={() => setChallengesOpen(true)}>
            <Trophy className="mr-2 h-3.5 w-3.5" /> Challenges…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
