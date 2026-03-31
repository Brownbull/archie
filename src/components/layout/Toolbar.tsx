import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { IssuesSummary } from "@/components/layout/IssuesSummary"
import { useImportAction } from "@/components/import-export/ImportDialog"
import { ExportButton } from "@/components/import-export/ExportButton"
import { ExportReportButton } from "@/components/toolbar/ExportReportButton"
import { PromptTemplateDialog } from "@/components/import-export/PromptTemplateDialog"
import { TOOLBAR_HEIGHT } from "@/lib/constants"
import { FileUp, BrainCircuit } from "lucide-react"

export function Toolbar() {
  const { user, signOut } = useAuth()
  const { triggerFilePicker, isImporting } = useImportAction()
  const [promptOpen, setPromptOpen] = useState(false)

  return (
    <header
      data-testid="toolbar"
      className="flex items-center justify-between border-b border-archie-border bg-panel px-4"
      style={{ height: `${TOOLBAR_HEIGHT}px` }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-text-primary">Archie</span>
        <Button
          data-testid="import-button"
          variant="ghost"
          size="sm"
          onClick={triggerFilePicker}
          disabled={isImporting}
          className="gap-1.5"
        >
          <FileUp className="h-3.5 w-3.5" />
          Import
        </Button>
        <ExportButton />
        <ExportReportButton />
        <Button
          data-testid="prompt-template-button"
          variant="ghost"
          size="sm"
          onClick={() => setPromptOpen(true)}
          className="gap-1.5"
        >
          <BrainCircuit className="h-3.5 w-3.5" />
          AI Prompt
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {user?.displayName && (
          <span className="text-sm text-text-secondary">
            {user.displayName}
          </span>
        )}
        <IssuesSummary />
        <SettingsMenu />
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <PromptTemplateDialog open={promptOpen} onOpenChange={setPromptOpen} />
    </header>
  )
}
