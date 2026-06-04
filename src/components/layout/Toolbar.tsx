import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { ExperienceLevelControl } from "@/components/layout/ExperienceLevelControl"
import { AppMenuBar } from "@/components/layout/AppMenuBar"
import { ModeToggle } from "@/components/layout/ModeToggle"
import { AccountMenu } from "@/components/layout/AccountMenu"
import { IssuesSummary } from "@/components/layout/IssuesSummary"
import { ResetCanvasDialog } from "@/components/layout/ResetCanvasDialog"
import { PromptTemplateDialog } from "@/components/import-export/PromptTemplateDialog"
import { ChallengeSelector } from "@/components/challenges/ChallengeSelector"
import { ChallengeTreeView } from "@/components/challenges/ChallengeTreeView"
import { SaveCanvasDialog } from "@/components/layout/SaveCanvasDialog"
import { SavedCanvasesDialog } from "@/components/layout/SavedCanvasesDialog"
import { useChallengeStore } from "@/stores/challengeStore"
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
  const questLogOpen = useUiStore((s) => s.questLogOpen)
  const setQuestLogOpen = useUiStore((s) => s.setQuestLogOpen)
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const attemptState = useChallengeStore((s) => s.attemptState)

  return (
    <header
      data-testid="toolbar"
      className="relative flex items-center justify-between border-b border-archie-border bg-panel px-4"
      style={{ height: `${TOOLBAR_HEIGHT}px` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary">Archie</span>
        <AppMenuBar />
        <ModeToggle />
      </div>

      {activeChallenge && attemptState !== "idle" && (
        <div data-testid="challenge-active-indicator" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-semibold text-blue-300">
            {activeChallenge.title}
          </span>
          <span className="text-[0.625rem] text-text-secondary">
            {attemptState === "building" ? "Building…" : attemptState === "running" ? "Running…" : attemptState === "scored" ? "Scored" : ""}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!(activeChallenge && attemptState !== "idle") && <ExperienceLevelControl />}
        <IssuesSummary />
        <SettingsMenu />
        <AccountMenu />
      </div>

      {/* Dialogs opened from the menu bar — open state lives in uiStore. */}
      <PromptTemplateDialog open={promptOpen} onOpenChange={setPromptOpen} />
      <ChallengeSelector hideTrigger />
      <ChallengeTreeView open={questLogOpen} onOpenChange={setQuestLogOpen} />
      <SaveCanvasDialog />
      <SavedCanvasesDialog />
      <ResetCanvasDialog />
    </header>
  )
}
