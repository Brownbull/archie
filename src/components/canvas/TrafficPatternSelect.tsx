import { memo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useArchitectureStore } from "@/stores/architectureStore"
import { TRAFFIC_PATTERNS, type TrafficPattern } from "@/engine/trafficPatterns"

interface TrafficPatternSelectProps {
  nodeId: string
  pattern: TrafficPattern
}

/**
 * On-node burst-pattern picker for a Traffic Source: how its load varies over the simulation
 * (Steady, Realistic Gaussian wobble, Periodic spikes, or one Big surge). The rate stepper sets the
 * AVERAGE; this sets the SHAPE the sim plays. Drag-safe inside React Flow.
 */
function TrafficPatternSelectBase({ nodeId, pattern }: TrafficPatternSelectProps) {
  const setNodeTrafficPattern = useArchitectureStore((s) => s.setNodeTrafficPattern)
  return (
    <div
      className="nodrag"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select value={pattern} onValueChange={(v) => setNodeTrafficPattern(nodeId, v as TrafficPattern)}>
        <SelectTrigger
          data-testid="traffic-pattern-select"
          title="How this source's load varies over the simulation — steady, realistic wobble, periodic spikes, or one big surge (Black Friday)"
          className="h-6 gap-1 border-archie-border bg-surface px-1.5 py-0 text-[0.625rem] text-text-secondary"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[13rem]">
          {TRAFFIC_PATTERNS.map((p) => (
            <SelectItem key={p.id} value={p.id} className="py-1 text-[0.75rem]" title={p.hint}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export const TrafficPatternSelect = memo(TrafficPatternSelectBase)
