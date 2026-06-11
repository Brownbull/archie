import { useMemo } from "react"
import {
  AlertTriangle,
  WifiOff,
  DatabaseZap,
  TrendingUp,
  Globe,
  FileWarning,
  Layers,
  Lock,
  Hammer,
  type LucideIcon,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { useFailureImpacts } from "@/hooks/useFailureImpacts"
import { getAllFailurePresets } from "@/services/failureLoader"
import {
  FAILURE_NONE_LABEL,
  FAILURE_SELECTOR_TESTID,
  FAILURE_BANNER_TESTID,
} from "@/lib/constants"

// Map icon name strings from YAML to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle,
  WifiOff,
  DatabaseZap,
  TrendingUp,
  Globe,
  FileWarning,
}

// Sentinel value for "no failure" in the Select component
const NONE_VALUE = "__none__"

export function FailureSelector() {
  const activeFailureScenarioId = useArchitectureStore((s) => s.activeFailureScenarioId)
  const setActiveFailureScenario = useArchitectureStore((s) => s.setActiveFailureScenario)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const presets = useMemo(() => getAllFailurePresets(), [])

  // Break-it loop (P4-S4, D94): in quest mode the failure axis follows the SAME D20 unlock as the
  // traffic dials — the quest's demand is the fixed problem statement until 3★; only then does
  // stress-testing the build become the lesson. Free play stays unrestricted.
  const locked = useChallengeStore((s) => isChallengeMode(s) && (s.bestStars[s.activeChallenge?.id ?? ""] ?? 0) < 3)
  // Post-3★ glow: the presets the metric probe says would fell THIS build (null outside the loop).
  const breaking = useFailureImpacts()

  const handleChange = (value: string) => {
    setActiveFailureScenario(value === NONE_VALUE ? null : value)
  }

  const activePreset = presets.find((p) => p.id === activeFailureScenarioId)

  // Inline inside TestConditionsPanel's flex column (no absolute offsets) — stacks cleanly under
  // the scenario selector, so the scenario banner can no longer overlap this control.
  return (
    <div data-testid={FAILURE_SELECTOR_TESTID} className="pointer-events-auto">
      {locked && (
        <div
          data-testid="failure-locked-badge"
          className="mb-1.5 flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium leading-tight text-amber-300"
          title="Failure injection is part of the post-clear lesson — reach 3★ first, then stress-test your build"
        >
          <Lock className="h-2.5 w-2.5 shrink-0" />
          <span>Reach 3★ to unlock</span>
        </div>
      )}
      {breaking && breaking.size > 0 && (
        <div
          data-testid="failure-breaking-hint"
          className="mb-1.5 flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[0.5625rem] font-medium leading-tight text-orange-300"
          title="The metric probe ran every condition against your live build — the marked ones would push a tier into the red"
        >
          <Hammer className="h-2.5 w-2.5 shrink-0" />
          <span>{breaking.size} condition{breaking.size === 1 ? "" : "s"} would break this build</span>
        </div>
      )}
      <Select
        value={activeFailureScenarioId ?? NONE_VALUE}
        onValueChange={handleChange}
        disabled={nodeCount === 0 || locked}
      >
        <SelectTrigger
          data-testid="failure-selector-trigger"
          aria-disabled={locked || nodeCount === 0}
          className="w-full border-archie-border bg-panel/90 backdrop-blur-sm"
          title={locked
            ? "Locked until 3★ — the demand and conditions are the quest's fixed problem statement"
            : "Failure injection — test resilience by simulating an outage (zone down, network partition, DB failure). Pick one, then Run Simulation."}
        >
          <SelectValue placeholder={FAILURE_NONE_LABEL} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-text-secondary" />
              {FAILURE_NONE_LABEL}
            </span>
          </SelectItem>
          {presets.map((preset) => {
            const Icon = ICON_MAP[preset.icon] ?? AlertTriangle
            const wouldBreak = !!breaking?.has(preset.id)
            return (
              <SelectItem key={preset.id} value={preset.id} data-breaking={wouldBreak || undefined}>
                <span className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${wouldBreak ? "text-orange-400" : ""}`} />
                  {preset.name}
                  {wouldBreak && (
                    <Hammer
                      className="h-3 w-3 text-orange-400"
                      aria-label="would break this build"
                    />
                  )}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {activePreset && (
        <div
          data-testid={FAILURE_BANNER_TESTID}
          className="mt-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-200 backdrop-blur-sm"
        >
          <div className="text-xs font-medium">Failure: {activePreset.name}</div>
          <p className="mt-0.5 text-[0.625rem] font-normal leading-snug text-red-200/80">{activePreset.description}</p>
        </div>
      )}
    </div>
  )
}
