import { useEffect } from "react"
import { toast } from "sonner"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { getChallenge } from "@/services/challengeLoader"
import { readSavedCanvas, writeSavedCanvas, clearSavedCanvas } from "@/services/canvasAutosave"
import { readSavedChallenge, clearSavedChallenge } from "@/services/challengeAutosave"

const AUTOSAVE_DEBOUNCE_MS = 700

// Module-scoped so the restore/toast fires exactly once per page load even when React StrictMode
// double-invokes the effect in dev. Reset naturally on a real page reload (module re-imports).
let restoredThisLoad = false

/**
 * Restores the last autosaved canvas on first mount (into an empty canvas only), then debounce-saves
 * the graph on every store change so a refresh or tab-close never silently loses work. Offers a
 * dismissible "Start fresh" action on the restore toast. Mounted once from AppLayout.
 */
export function useCanvasAutosave(libraryReady: boolean): void {
  useEffect(() => {
    if (!libraryReady) return
    // Restore once per page load, but only AFTER the component library has loaded so
    // nodes can hydrate with their provider data (name, RPS, stats, icons).
    if (!restoredThisLoad) {
      restoredThisLoad = true
      const store = useArchitectureStore.getState()
      const saved = readSavedCanvas()
      if (saved && saved.nodes.length > 0 && store.nodes.length === 0) {
        store.loadArchitecture(
          saved.nodes,
          saved.edges,
          saved.weightProfile,
          undefined,
          undefined,
          saved.activeScenarioId,
          saved.activeFailureScenarioId,
        )
        const count = saved.nodes.length
        toast(`Restored your last diagram (${count} component${count === 1 ? "" : "s"})`, {
          description: "Picked up where you left off.",
          action: {
            label: "Start fresh",
            onClick: () => {
              useArchitectureStore.getState().loadArchitecture([], [])
              clearSavedCanvas()
            },
          },
        })
      }

      // Restore active challenge if one was saved (user refreshed mid-challenge).
      const savedChallenge = readSavedChallenge()
      if (savedChallenge && useChallengeStore.getState().attemptState === "idle") {
        const challenge = getChallenge(savedChallenge.challengeId)
        if (challenge) {
          useChallengeStore.getState().selectChallenge(challenge)
          toast("Restored challenge: " + challenge.title, { description: "Continue where you left off." })
        } else {
          clearSavedChallenge()
        }
      }
    }

    // Debounced autosave on every store change.
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsub = useArchitectureStore.subscribe((s) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        writeSavedCanvas({
          nodes: s.nodes,
          edges: s.edges,
          weightProfile: s.weightProfile,
          activeScenarioId: s.activeScenarioId,
          activeFailureScenarioId: s.activeFailureScenarioId,
        })
      }, AUTOSAVE_DEBOUNCE_MS)
    })

    return () => {
      if (timer) clearTimeout(timer)
      unsub()
    }
  }, [libraryReady])
}
