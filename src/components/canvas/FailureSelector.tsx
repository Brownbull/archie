import { useMemo } from "react"
import {
  AlertTriangle,
  WifiOff,
  DatabaseZap,
  TrendingUp,
  Globe,
  FileWarning,
  Layers,
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

  const handleChange = (value: string) => {
    setActiveFailureScenario(value === NONE_VALUE ? null : value)
  }

  const activePreset = presets.find((p) => p.id === activeFailureScenarioId)

  // Inline inside TestConditionsPanel's flex column (no absolute offsets) — stacks cleanly under
  // the scenario selector, so the scenario banner can no longer overlap this control.
  return (
    <div data-testid={FAILURE_SELECTOR_TESTID} className="pointer-events-auto">
      <Select
        value={activeFailureScenarioId ?? NONE_VALUE}
        onValueChange={handleChange}
        disabled={nodeCount === 0}
      >
        <SelectTrigger
          className="w-full border-archie-border bg-panel/90 backdrop-blur-sm"
          title="Failure injection — test resilience by simulating an outage (zone down, network partition, DB failure). Pick one, then Run Simulation."
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
            return (
              <SelectItem key={preset.id} value={preset.id}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {preset.name}
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
