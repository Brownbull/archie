import { useCallback, useRef, useEffect } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import {
  METRIC_CATEGORIES,
  DEFAULT_WEIGHT_PROFILE,
  type MetricCategoryId,
  type WeightProfile,
} from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"

const SLIDER_MIN = 0.1
const SLIDER_MAX = 1.0
const SLIDER_STEP = 0.1
const DEBOUNCE_MS = 100

export function WeightSliders() {
  const weightProfile = useArchitectureStore((s) => s.weightProfile)
  const setWeightProfile = useArchitectureStore((s) => s.setWeightProfile)
  const setWeightAndRecalculate = useArchitectureStore(
    (s) => s.setWeightAndRecalculate,
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (categoryId: string, value: number) => {
      const rounded = Math.round(value * 10) / 10
      const clamped = Number.isNaN(rounded)
        ? SLIDER_MIN
        : Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, rounded))
      const current = useArchitectureStore.getState().weightProfile
      const newProfile: WeightProfile = {
        ...current,
        [categoryId]: clamped,
      }

      // Immediate visual update (no recalculation)
      setWeightProfile(newProfile)

      // Debounced recalculation uses fresh state to capture all slider changes
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setWeightAndRecalculate(
          useArchitectureStore.getState().weightProfile,
        )
      }, DEBOUNCE_MS)
    },
    [setWeightProfile, setWeightAndRecalculate],
  )

  const handleReset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setWeightAndRecalculate({ ...DEFAULT_WEIGHT_PROFILE })
  }, [setWeightAndRecalculate])

  return (
    <div data-testid="weight-sliders-section" className="space-y-3">
      {METRIC_CATEGORIES.map((cat) => {
        const IconComponent =
          CATEGORY_ICONS[cat.iconName as keyof typeof CATEGORY_ICONS]
        const weight = weightProfile[cat.id as MetricCategoryId] ?? 1.0

        return (
          <div key={cat.id} className="flex items-center gap-3">
            {IconComponent && (
              <IconComponent
                className="h-4 w-4 shrink-0"
                style={{ color: cat.color }}
              />
            )}
            <span className="w-12 text-xs text-text-secondary">
              {cat.shortName}
            </span>
            <Slider
              data-testid={`weight-slider-${cat.id}`}
              value={[weight]}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              onValueChange={([v]) => handleChange(cat.id, v)}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs font-medium text-text-primary">
              {weight.toFixed(1)}
            </span>
          </div>
        )
      })}

      <Button
        data-testid="weight-reset-button"
        variant="outline"
        size="sm"
        onClick={handleReset}
        className="w-full"
      >
        Reset Weights
      </Button>
    </div>
  )
}
