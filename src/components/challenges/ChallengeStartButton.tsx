import { Play, RefreshCw } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { launchChallengeAttempt } from "@/lib/simulationLaunch"

/**
 * "Start Challenge" trigger (Epic 16 Phase 4). Replaces RunSimulationButton while a challenge
 * is being built: marks the attempt running and starts the simulation with the challenge's own
 * traffic curve + scheduled events, so the run is scored against the rubric on completion.
 * Shown only in challenge mode, while building, with the canvas non-empty and no sim active.
 */
export function ChallengeStartButton() {
  const inChallenge = useChallengeStore(isChallengeMode)
  const attemptState = useChallengeStore((s) => s.attemptState)
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const simStatus = useSimulationStore((s) => s.status)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)

  if (!inChallenge || !challenge || attemptState !== "building" || nodeCount === 0) {
    return null
  }

  // P1/T6 → 2026-06-11 playtest: RERUN lives in the SAME floating slot the start button occupied —
  // after a run, this is the one place the player already knows to look. Re-arms the attempt
  // (selectChallenge → building) so startAttempt's anti-double-score guard is honored.
  if (simStatus === "done") {
    const onRerun = () => {
      useChallengeStore.getState().selectChallenge(challenge)
      launchChallengeAttempt(challenge)
    }
    return (
      <button
        type="button"
        data-testid="playback-rerun"
        title="Re-simulate the current canvas — re-grades the attempt"
        onClick={onRerun}
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-emerald-500"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Rerun Challenge
      </button>
    )
  }

  if (simStatus !== "idle") return null

  const onStart = () => launchChallengeAttempt(challenge)

  return (
    <button
      type="button"
      data-testid="start-challenge"
      onClick={onStart}
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-emerald-500"
    >
      <Play className="h-3.5 w-3.5" />
      Start Challenge
    </button>
  )
}
