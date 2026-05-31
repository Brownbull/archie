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
          {alternatives.map((comp) => (
            <SelectItem key={comp.id} value={comp.id}>
              {comp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
