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
  Z_INDEX,
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
  const activeScenarioId = useArchitectureStore((s) => s.activeScenarioId)
  const presets = useMemo(() => getAllFailurePresets(), [])

  const handleChange = (value: string) => {
    setActiveFailureScenario(value === NONE_VALUE ? null : value)
  }

  const activePreset = presets.find((p) => p.id === activeFailureScenarioId)

  // Dynamic positioning: shift down when demand scenario banner is visible
  const topOffset = activeScenarioId ? "top-[6.5rem]" : "top-16"
  const bannerTopOffset = activeScenarioId ? "top-[9.5rem]" : "top-[6.5rem]"

  return (
    <>
      <div
        data-testid={FAILURE_SELECTOR_TESTID}
        className={`pointer-events-auto absolute right-4 ${topOffset} ${Z_INDEX.DROPDOWN}`}
      >
        <Select
          value={activeFailureScenarioId ?? NONE_VALUE}
          onValueChange={handleChange}
          disabled={nodeCount === 0}
        >
          <SelectTrigger className="w-[200px] border-archie-border bg-panel/90 backdrop-blur-sm">
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
      </div>

      {activePreset && (
        <div
          data-testid={FAILURE_BANNER_TESTID}
          className={`pointer-events-none absolute right-4 ${bannerTopOffset} ${Z_INDEX.CANVAS_OVERLAY}`}
        >
          <div className="pointer-events-auto rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 backdrop-blur-sm">
            Failure: {activePreset.name}
          </div>
        </div>
      )}
    </>
  )
}
