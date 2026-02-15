import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { useImportAction } from "@/components/import-export/ImportDialog"
import { TOOLBAR_HEIGHT } from "@/lib/constants"
import { FileUp } from "lucide-react"

export function Toolbar() {
  const { user, signOut } = useAuth()
  const { triggerFilePicker, isImporting } = useImportAction()

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
      </div>

      <div className="flex items-center gap-3">
        {user?.displayName && (
          <span className="text-sm text-text-secondary">
            {user.displayName}
          </span>
        )}
        <SettingsMenu />
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
