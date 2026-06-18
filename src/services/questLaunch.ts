import { getAllChallenges } from "@/services/challengeLoader"
import { makeChallengeCanvas } from "@/services/challengeCanvasSeed"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { usePreferencesStore } from "@/stores/preferencesStore"

export const FIRST_QUEST_ID = "first-service"

/**
 * Launch the First Service quest: seed its starter canvas, set the experience level, and enter Quest
 * Mode — identical to picking First Service by hand. Shared by the first-run fork (FirstRunFork) and
 * the guest auto-launch (useGuestQuestLaunch) so both behave the same. Requires the component library
 * to be initialized first (makeChallengeCanvas resolves components); callers gate on libraryReady.
 *
 * @returns true if the quest was launched, false if First Service wasn't found (defensive).
 */
export function launchFirstServiceQuest(): boolean {
  const firstService = getAllChallenges().find((c) => c.id === FIRST_QUEST_ID)
  if (!firstService) return false // defensive — curriculum always ships First Service
  try {
    useSimulationStore.getState().reset()
    const seeded = makeChallengeCanvas(firstService)
    useArchitectureStore.getState().loadArchitecture(seeded.nodes, seeded.edges)
  } catch {
    /* canvas seeding is best-effort; selectChallenge still enters Quest Mode */
  }
  usePreferencesStore.getState().setExperienceLevel(firstService.difficulty)
  useChallengeStore.getState().selectChallenge(firstService)
  return true
}
