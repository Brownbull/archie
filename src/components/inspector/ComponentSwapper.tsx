import { useLibrary } from "@/hooks/useLibrary"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ComponentSwapperProps {
  currentComponentId: string
  currentCategory: string
  onSwapComponent: (newComponentId: string) => void
}

export function ComponentSwapper({
  currentComponentId,
  currentCategory,
  onSwapComponent,
}: ComponentSwapperProps) {
  const { getComponentsByCategory } = useLibrary()
  const allInCategory = getComponentsByCategory(currentCategory)
  const alternatives = allInCategory.filter((c) => c.id !== currentComponentId)

  if (alternatives.length === 0) return null

  return (
    <div data-testid="component-swapper" className="space-y-1">
      <label
        id="component-swapper-label"
        className="text-xs font-medium text-text-secondary"
      >
        Component Type
      </label>
      <Select value={currentComponentId} onValueChange={onSwapComponent}>
        <SelectTrigger
          className="w-full"
          aria-labelledby="component-swapper-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allInCategory.map((comp) => (
            <SelectItem key={comp.id} value={comp.id}>
              {comp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
