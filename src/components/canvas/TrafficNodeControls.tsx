import { memo, useState } from "react"
import { Lock } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useArchitectureStore, type ArchieNodeData } from "@/stores/architectureStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { TRAFFIC_RPS_STEPS } from "@/lib/constants"
import { trafficKindEnvelope, type TrafficKind } from "@/engine/trafficPatterns"
import { formatRpsCompact } from "@/lib/formatStats"
import type { ChallengeTrafficWorkload, ChallengeTrafficOrigin } from "@/lib/challengeTypes"
import { TrafficPatternSelect } from "./TrafficPatternSelect"

const WORKLOADS: readonly { id: ChallengeTrafficWorkload; label: string; hint: string }[] = [
  { id: "read", label: "Read-heavy", hint: "Mostly cacheable reads" },
  { id: "write", label: "Write-heavy", hint: "Mostly writes — exercises the DB write path" },
  { id: "mixed", label: "Mixed R/W", hint: "Balanced read/write mix" },
]
const ORIGINS: readonly { id: ChallengeTrafficOrigin; label: string; hint: string }[] = [
  { id: "one-region", label: "One region", hint: "Traffic from a single region" },
  { id: "multi-region", label: "Multi-region", hint: "Traffic spread across regions (needs CDN / multi-region DB)" },
]

const FIRST_STEP = TRAFFIC_RPS_STEPS[0]
const LAST_STEP = TRAFFIC_RPS_STEPS[TRAFFIC_RPS_STEPS.length - 1]

/** Smallest step strictly above `rps` (or the ceiling). Robust to arbitrary (challenge-injected) values. */
function nextStep(rps: number): number {
  for (const s of TRAFFIC_RPS_STEPS) if (s > rps) return s
  return LAST_STEP
}
/** Largest step strictly below `rps` (or the floor). */
function prevStep(rps: number): number {
  let p: number = FIRST_STEP
  for (const s of TRAFFIC_RPS_STEPS) {
    if (s < rps) p = s
    else break
  }
  return p
}

const TRIGGER_CLASS =
  "h-7! w-full gap-1 rounded-md border-archie-border bg-surface px-2 py-0 text-[0.6875rem] text-text-secondary"

interface TrafficNodeControlsProps {
  nodeId: string
  data: ArchieNodeData
}

/**
 * On-node Traffic Source config (ISAPivot): peak-RPS stepper + shape (kind) + workload + origin,
 * with a derived min/avg/peak envelope caption. `rps` is the PEAK the architecture must survive
 * (D63); the stepper snaps through TRAFFIC_RPS_STEPS. Drag-safe inside React Flow.
 */
function TrafficNodeControlsBase({ nodeId, data }: TrafficNodeControlsProps) {
  const setNodeTrafficRps = useArchitectureStore((s) => s.setNodeTrafficRps)
  const setNodeWorkload = useArchitectureStore((s) => s.setNodeWorkload)
  const setNodeOrigin = useArchitectureStore((s) => s.setNodeOrigin)

  // D20 (D74): the demand is the challenge's fixed problem statement until the player 3★s it — then the
  // node unlocks for sandbox experimentation. While locked, the controls are disabled (the sim uses the
  // challenge's authored workload regardless, so editing here would only mislead).
  const locked = useChallengeStore((s) => isChallengeMode(s) && (s.bestStars[s.activeChallenge?.id ?? ""] ?? 0) < 3)

  const rps = data.trafficRps ?? FIRST_STEP
  // 2026-06-11 (D101 UI gap): the stepper's floor is 3k — far above small quests' failure
  // boundaries (first-service: ≈1055, pays ≤2110). The readout doubles as a free input so any
  // exact value is reachable; the steppers stay for coarse jumps.
  const [editing, setEditing] = useState(false)
  const commitRps = (raw: string) => {
    setEditing(false)
    const v = Math.round(Number(raw))
    if (Number.isFinite(v) && v >= 1 && v <= LAST_STEP && v !== rps) setNodeTrafficRps(nodeId, v)
  }
  const kind = (data.trafficKind ?? "steady") as TrafficKind
  const workload = (data.trafficWorkload ?? "mixed") as ChallengeTrafficWorkload
  const origin = (data.trafficOrigin ?? "one-region") as ChallengeTrafficOrigin
  const env = trafficKindEnvelope(kind, rps)

  return (
    <div
      className="nodrag flex w-full flex-col gap-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {locked && (
        <div data-testid="traffic-locked-badge" className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium leading-tight text-amber-300" title="Demand is fixed by the challenge — reach 3★ to experiment freely">
          <Lock className="h-2.5 w-2.5 shrink-0" />
          <span>Reach 3★ to unlock</span>
        </div>
      )}
      <div className={locked ? "pointer-events-none flex flex-col gap-1 opacity-50" : "flex flex-col gap-1"} aria-disabled={locked}>
      <div className="flex items-stretch gap-1.5">
        {/* Peak-RPS stepper — snaps through TRAFFIC_RPS_STEPS (3k → 10M) */}
        <div
          className="flex h-7 flex-1 items-center justify-between overflow-hidden rounded-md border border-archie-border bg-surface"
          title="Peak requests/sec this source reaches (3k → 10M). The shape on the right sets how often it sits near the peak."
        >
          <button
            type="button"
            data-testid="rps-decrement"
            aria-label="Lower peak RPS"
            disabled={rps <= FIRST_STEP}
            onClick={(e) => {
              e.stopPropagation()
              setNodeTrafficRps(nodeId, prevStep(rps))
            }}
            className="flex h-full items-center px-2 text-[0.8125rem] leading-none text-text-secondary hover:text-text-primary disabled:opacity-30"
          >
            −
          </button>
          {editing ? (
            <input
              data-testid="rps-input"
              type="number"
              min={1}
              max={LAST_STEP}
              defaultValue={rps}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === "Enter") commitRps((e.target as HTMLInputElement).value)
                if (e.key === "Escape") setEditing(false)
              }}
              onBlur={(e) => commitRps(e.target.value)}
              className="nodrag h-full w-full flex-1 bg-transparent text-center text-[0.6875rem] font-semibold text-text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          ) : (
          <button
            type="button"
            data-testid="rps-stepper-value"
            title="Click to type an exact peak RPS — the break-it boundary hunt wants precise values"
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="nodrag flex-1 whitespace-nowrap text-center text-[0.6875rem] font-semibold text-text-primary hover:text-blue-300"
          >
            {formatRpsCompact(rps)} peak
          </button>
          )}
          <button
            type="button"
            data-testid="rps-increment"
            aria-label="Raise peak RPS"
            disabled={rps >= LAST_STEP}
            onClick={(e) => {
              e.stopPropagation()
              setNodeTrafficRps(nodeId, nextStep(rps))
            }}
            className="flex h-full items-center px-2 text-[0.8125rem] leading-none text-text-secondary hover:text-text-primary disabled:opacity-30"
          >
            +
          </button>
        </div>
        <TrafficPatternSelect nodeId={nodeId} kind={kind} />
      </div>

      <div className="flex items-stretch gap-1.5">
        <div className="nodrag flex-1">
          <Select value={workload} onValueChange={(v) => setNodeWorkload(nodeId, v as ChallengeTrafficWorkload)}>
            <SelectTrigger data-testid="traffic-workload-select" size="sm" title="Read/write mix — write-heavy stresses the DB write path" className={TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[11rem]">
              {WORKLOADS.map((w) => (
                <SelectItem key={w.id} value={w.id} className="py-1 text-[0.75rem]" title={w.hint}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="nodrag flex-1">
          <Select value={origin} onValueChange={(v) => setNodeOrigin(nodeId, v as ChallengeTrafficOrigin)}>
            <SelectTrigger data-testid="traffic-origin-select" size="sm" title="One region or multi-region (multi-region is graded as an architecture requirement)" className={TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[11rem]">
              {ORIGINS.map((o) => (
                <SelectItem key={o.id} value={o.id} className="py-1 text-[0.75rem]" title={o.hint}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div data-testid="traffic-envelope" className="px-0.5 text-[0.5625rem] leading-tight text-text-secondary">
        {kind === "steady"
          ? `${formatRpsCompact(rps)} steady`
          : `~${formatRpsCompact(env.min)}–${formatRpsCompact(env.peak)} · avg ~${formatRpsCompact(env.avg)}`}
      </div>
      </div>
    </div>
  )
}

export const TrafficNodeControls = memo(TrafficNodeControlsBase)
