import { ChevronDown } from "lucide-react"
import { SettingsMenu } from "@/components/layout/SettingsMenu"
import { ExperienceLevelControl } from "@/components/layout/ExperienceLevelControl"
import { AppMenuBar } from "@/components/layout/AppMenuBar"
import { ModeToggle } from "@/components/layout/ModeToggle"
import { AccountMenu } from "@/components/layout/AccountMenu"
import { CurrencyCluster } from "@/components/layout/CurrencyCluster"
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
          {/* The quest title is the switch-quest affordance: clicking it opens the quest menu (same tree
              the Quest Mode toggle opens) so you can jump to another quest mid-flight without first
              exiting to Free Mode. Submitted runs are already persisted; the in-progress build is
              discarded on switch (the tree's start flow confirms the canvas clear). */}
          <button
            type="button"
            data-testid="switch-quest"
            onClick={() => setQuestLogOpen(true)}
            title="Switch quest — open the quest menu"
            aria-label={`Active quest: ${activeChallenge.title}. Open the quest menu to switch.`}
            className="group flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/30 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
          >
            {activeChallenge.title}
            <ChevronDown className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
          </button>
          <span className="text-[0.625rem] text-text-secondary">
            {attemptState === "building" ? "Building…" : attemptState === "running" ? "Running…" : attemptState === "scored" ? "Scored" : ""}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!(activeChallenge && attemptState !== "idle") && <ExperienceLevelControl />}
        <CurrencyCluster />
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
