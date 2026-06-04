import { memo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useArchitectureStore } from "@/stores/architectureStore"
import { TRAFFIC_KINDS, type TrafficKind } from "@/engine/trafficPatterns"

interface TrafficPatternSelectProps {
  nodeId: string
  kind: TrafficKind
}

/**
 * On-node traffic-shape picker for a Traffic Source: how its load varies over the simulation
 * (Steady, Realistic Gaussian wobble, Periodic spikes, or bursty Search). The rate stepper sets the
 * AVERAGE; this sets the SHAPE the sim plays. Drag-safe inside React Flow.
 * (ISAPivot: the file/testid keep the legacy "pattern" name until the Phase 1 inspector rework.)
 */
function TrafficPatternSelectBase({ nodeId, kind }: TrafficPatternSelectProps) {
  const setNodeTrafficKind = useArchitectureStore((s) => s.setNodeTrafficKind)
  return (
    <div
      className="nodrag flex-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select value={kind} onValueChange={(v) => setNodeTrafficKind(nodeId, v as TrafficKind)}>
        <SelectTrigger
          data-testid="traffic-pattern-select"
          size="sm"
          title="How this source's load varies over the simulation — steady, realistic wobble, periodic spikes, or bursty search"
          className="h-7! w-full gap-1 rounded-md border-archie-border bg-surface px-2 py-0 text-[0.6875rem] text-text-secondary"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[13rem]">
          {TRAFFIC_KINDS.map((k) => (
            <SelectItem key={k.id} value={k.id} className="py-1 text-[0.75rem]" title={k.hint}>
              {k.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export const TrafficPatternSelect = memo(TrafficPatternSelectBase)
