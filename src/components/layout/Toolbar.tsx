import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { ExperienceLevelControl } from "@/components/layout/ExperienceLevelControl"
import { AppMenuBar } from "@/components/layout/AppMenuBar"
import { AccountMenu } from "@/components/layout/AccountMenu"
import { IssuesSummary } from "@/components/layout/IssuesSummary"
import { ResetCanvasDialog } from "@/components/layout/ResetCanvasDialog"
import { PromptTemplateDialog } from "@/components/import-export/PromptTemplateDialog"
import { ChallengeSelector } from "@/components/challenges/ChallengeSelector"
import { useUiStore } from "@/stores/uiStore"
import { TOOLBAR_HEIGHT } from "@/lib/constants"

/**
 * Top bar (P95) — a clean menu bar. Brand + File/Edit/Build menus on the left; the global
 * experience-level dropdown, issues, settings and account menu on the right. The dialogs the
 * menus open (Reset, AI Prompt, Challenges) are rendered here once, controlled via uiStore.
 */
export function Toolbar() {
  const promptOpen = useUiStore((s) => s.promptOpen)
  const setPromptOpen = useUiStore((s) => s.setPromptOpen)

  return (
    <header
      data-testid="toolbar"
      className="flex items-center justify-between border-b border-archie-border bg-panel px-4"
      style={{ height: `${TOOLBAR_HEIGHT}px` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary">Archie</span>
        <AppMenuBar />
      </div>

      <div className="flex items-center gap-2">
        <ExperienceLevelControl />
        <IssuesSummary />
        <SettingsMenu />
        <AccountMenu />
      </div>

      {/* Dialogs opened from the menu bar — open state lives in uiStore. */}
      <PromptTemplateDialog open={promptOpen} onOpenChange={setPromptOpen} />
      <ChallengeSelector hideTrigger />
      <ResetCanvasDialog />
    </header>
  )
}
