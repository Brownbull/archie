import { GraduationCap, Wrench } from "lucide-react"
import { getAllChallenges } from "@/services/challengeLoader"
import { makeChallengeCanvas } from "@/services/challengeCanvasSeed"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { Z_INDEX } from "@/lib/constants"

const FIRST_QUEST_ID = "first-service"

/**
 * S1 (Kane QA) — the novice on-ramp. On a brand-new user's first visit (empty canvas, no prior
 * fork choice), present a clear fork instead of dropping them into the expert sandbox:
 *   - "New to architecture?" → launch Quest Mode at First Service (the guided curriculum)
 *   - "I know architecture"  → stay in Free Mode (the normal empty-state options)
 *
 * The choice persists in preferencesStore.firstRunChoice (like tourSeen), so the fork appears once.
 * Rendered by EmptyCanvasState when firstRunChoice === null. The quest path replicates
 * ChallengeTreeView.startChallenge so the behavior is identical to picking First Service by hand.
 */
export function FirstRunFork() {
  const setFirstRunChoice = usePreferencesStore((s) => s.setFirstRunChoice)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)

  const chooseQuest = () => {
    setFirstRunChoice("quest")
    const firstService = getAllChallenges().find((c) => c.id === FIRST_QUEST_ID)
    if (!firstService) return // defensive — curriculum always ships First Service
    try {
      useSimulationStore.getState().reset()
      const seeded = makeChallengeCanvas(firstService)
      useArchitectureStore.getState().loadArchitecture(seeded.nodes, seeded.edges)
    } catch {
      /* canvas seeding is best-effort; selectChallenge still enters Quest Mode */
    }
    usePreferencesStore.getState().setExperienceLevel(firstService.difficulty)
    selectChallenge(firstService)
  }

  const chooseFree = () => setFirstRunChoice("free")

  return (
    <div
      data-testid="first-run-fork"
      className={`pointer-events-none absolute inset-0 ${Z_INDEX.CANVAS_OVERLAY} flex items-center justify-center`}
    >
      <div className="pointer-events-auto w-full max-w-lg rounded-lg border border-archie-border bg-panel/90 p-6 shadow-lg backdrop-blur-sm">
        <h3 className="mb-1 text-center text-base font-semibold text-text-primary">
          Welcome to Archie
        </h3>
        <p className="mb-5 text-center text-xs text-text-secondary">
          How would you like to start?
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-testid="first-run-quest"
            onClick={chooseQuest}
            className="flex flex-col items-start gap-2 rounded-md border-2 border-archie-accent/50 bg-archie-accent/5 p-4 text-left transition-colors hover:border-archie-accent hover:bg-archie-accent/10"
          >
            <GraduationCap className="h-6 w-6 text-archie-accent" />
            <span className="text-sm font-semibold text-text-primary">New to architecture?</span>
            <span className="text-xs text-text-secondary">
              Learn by solving real problems. Start guided with First Service and unlock the rest.
            </span>
          </button>
          <button
            type="button"
            data-testid="first-run-free"
            onClick={chooseFree}
            className="flex flex-col items-start gap-2 rounded-md border border-archie-border bg-surface p-4 text-left transition-colors hover:border-archie-accent/50 hover:bg-surface/80"
          >
            <Wrench className="h-6 w-6 text-text-secondary" />
            <span className="text-sm font-semibold text-text-primary">I know architecture</span>
            <span className="text-xs text-text-secondary">
              Jump into the sandbox. Build from scratch, drop a stack, or load a blueprint.
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
