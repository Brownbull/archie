import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { TOOLBAR_HEIGHT } from "@/lib/constants"

export function Toolbar() {
  const { user, signOut } = useAuth()

  return (
    <header
      data-testid="toolbar"
      className="flex items-center justify-between border-b border-archie-border bg-panel px-4"
      style={{ height: `${TOOLBAR_HEIGHT}px` }}
    >
      <span className="text-sm font-semibold text-text-primary">Archie</span>

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
