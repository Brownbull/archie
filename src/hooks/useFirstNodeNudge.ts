import { useEffect } from "react"
import { toast } from "sonner"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { usePreferencesStore } from "@/stores/preferencesStore"

// Module-scoped so the nudge fires once per page load even under StrictMode's double-effect in dev.
let nudgedThisLoad = false

/**
 * First-node momentum (onboarding): the very first time a user places a single node, auto-select it
 * (which opens the inspector) and show a one-time hint to configure it and drag the handles to
 * connect. Gated on the persisted `firstNodeHintSeen` flag so it never repeats for returning users
 * and never fires on an autosave restore (those users have already seen it).
 */
export function useFirstNodeNudge(): void {
  useEffect(() => {
    let prevCount = useArchitectureStore.getState().nodes.length
    const unsub = useArchitectureStore.subscribe((s) => {
      const count = s.nodes.length
      const wentZeroToOne = prevCount === 0 && count === 1
      prevCount = count
      if (!wentZeroToOne) return
      if (nudgedThisLoad) return
      if (usePreferencesStore.getState().firstNodeHintSeen) return

      nudgedThisLoad = true
      usePreferencesStore.getState().setFirstNodeHintSeen(true)
      const firstNode = s.nodes[0]
      if (firstNode) useUiStore.getState().setSelectedNodeId(firstNode.id)
      toast("Nice — your first block is on the canvas", {
        description: "It's selected: pick a provider and tier in the inspector. Drag from its side handles to connect it to others.",
      })
    })
    return unsub
  }, [])
}
