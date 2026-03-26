import {
  TrendingUp,
  DollarSign,
  Building,
  HeartPulse,
  Shield,
  Rocket,
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
import { getAllScenarioPresets } from "@/services/scenarioLoader"
import {
  SCENARIO_NONE_LABEL,
  SCENARIO_SELECTOR_TESTID,
  SCENARIO_BANNER_TESTID,
  Z_INDEX,
} from "@/lib/constants"

// Map icon name strings from YAML to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  DollarSign,
  Building,
  HeartPulse,
  Shield,
  Rocket,
}

// Sentinel value for "no scenario" in the Select component. Valid per SCENARIO_ID_FORMAT
// but safe: AC-ARCH-NO-2 guarantees no custom scenario creation — presets are static YAML.
const NONE_VALUE = "__none__"

export function ScenarioSelector() {
  const activeScenarioId = useArchitectureStore((s) => s.activeScenarioId)
  const setActiveScenario = useArchitectureStore((s) => s.setActiveScenario)
  const nodes = useArchitectureStore((s) => s.nodes)
  // Stable module-level array from import.meta.glob — not memoized intentionally (O(1) lookup)
  const presets = getAllScenarioPresets()

  const handleChange = (value: string) => {
    setActiveScenario(value === NONE_VALUE ? null : value)
  }

  const activePreset = presets.find((p) => p.id === activeScenarioId)

  return (
    <>
      <div
        data-testid={SCENARIO_SELECTOR_TESTID}
        className={`pointer-events-auto absolute right-4 top-4 ${Z_INDEX.DROPDOWN}`}
      >
        <Select
          value={activeScenarioId ?? NONE_VALUE}
          onValueChange={handleChange}
          disabled={nodes.length === 0}
        >
          <SelectTrigger className="w-[200px] border-archie-border bg-panel/90 backdrop-blur-sm">
            <SelectValue placeholder={SCENARIO_NONE_LABEL} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-text-secondary" />
                {SCENARIO_NONE_LABEL}
              </span>
            </SelectItem>
            {presets.map((preset) => {
              const Icon = ICON_MAP[preset.icon] ?? Layers
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
      </div>

      {activePreset && (
        <div
          data-testid={SCENARIO_BANNER_TESTID}
          className={`pointer-events-none absolute right-4 top-16 ${Z_INDEX.CANVAS_OVERLAY}`}
        >
          <div className="pointer-events-auto rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-200 backdrop-blur-sm">
            Simulating: {activePreset.name}
          </div>
        </div>
      )}
    </>
  )
}
