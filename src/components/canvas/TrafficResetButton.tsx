import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { plannedTrafficReset } from "@/services/trafficSourceInjection"
import { diffTrafficAttributes } from "@/engine/breakDetection"

/**
 * The traffic-source twin of SaveBlockDefaultButton's slot (2026-06-11 playtest): traffic sources
 * never save defaults (P1/T3 — demand is the quest's problem statement), but post-3★ the dials are
 * the break-it playground — this button resets the demand back to the quest's AUTHORED spec so a
 * deep experiment chain can return to baseline and start iterating on another dial. Highlights
 * (orange) when the dials deviate from the spec; resets in place — no re-run, no rescoring.
 */
export function TrafficResetButton() {
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const nodes = useArchitectureStore((s) => s.nodes)
  const deviates = challenge
    ? diffTrafficAttributes(nodes, challenge.trafficSources ?? []).size > 0
    : false

  if (!challenge?.trafficSources?.length) return null

  const onReset = () => {
    const arch = useArchitectureStore.getState()
    for (const u of plannedTrafficReset(arch.nodes, challenge.trafficSources ?? [])) {
      arch.setNodeTrafficRps(u.nodeId, u.rps)
      arch.setNodeTrafficKind(u.nodeId, u.kind)
      arch.setNodeWorkload(u.nodeId, u.workload)
      arch.setNodeOrigin(u.nodeId, u.origin)
    }
    toast.success("Demand reset to the quest's authored spec.")
  }

  return (
    <button
      type="button"
      data-testid="traffic-reset"
      data-dirty={deviates || undefined}
      aria-label="Reset demand to the quest's authored spec"
      title={
        deviates
          ? "Reset the traffic dials to the quest's authored spec — back to baseline, iterate on another dial"
          : "Demand matches the quest's authored spec"
      }
      onClick={(e) => {
        e.stopPropagation()
        if (deviates) onReset()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "nodrag absolute right-1 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded transition-colors",
        deviates
          ? "text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
          : "cursor-default text-text-secondary/40",
      )}
    >
      <RotateCcw className="h-3 w-3" />
    </button>
  )
}
