import type { Component } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ComponentSwapperProps {
  currentComponentId: string
  alternatives: Component[]
  onSwapComponent: (newComponentId: string) => void
  /** Field label. P5 scopes alternatives to same-type providers, so callers pass "Provider". */
  label?: string
}

/**
 * Monthly-cost range across a provider's config variants, shown next to each option so the
 * architect can compare cost across providers WITHOUT swapping each one in turn.
 */
function costRangeLabel(comp: Component): string | null {
  const costs = comp.configVariants?.map((v) => v.monthlyCost).filter((c): c is number => typeof c === "number")
  if (!costs || costs.length === 0) return null
  const min = Math.min(...costs)
  const max = Math.max(...costs)
  if (min === 0 && max === 0) return "Free"
  return min === max ? `$${min}/mo` : `$${min}–$${max}/mo`
}

export function ComponentSwapper({
  currentComponentId,
  alternatives,
  onSwapComponent,
  label = "Component Type",
}: ComponentSwapperProps) {
  const filtered = alternatives.filter((c) => c.id !== currentComponentId)

  if (filtered.length === 0) return null

  return (
    <div data-testid="component-swapper" className="space-y-1">
      <label
        id="component-swapper-label"
        className="text-xs font-medium text-text-secondary"
      >
        {label}
      </label>
      <Select value={currentComponentId} onValueChange={onSwapComponent}>
        <SelectTrigger
          className="w-full"
          aria-labelledby="component-swapper-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {alternatives.map((comp) => {
            const cost = costRangeLabel(comp)
            return (
              <SelectItem key={comp.id} value={comp.id}>
                <span className="flex w-full items-center justify-between gap-4">
                  <span>{comp.name}</span>
                  {cost && (
                    <span data-testid={`swap-cost-${comp.id}`} className="text-[10px] text-text-secondary">
                      {cost}
                    </span>
                  )}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
