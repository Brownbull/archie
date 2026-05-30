import { type DragEvent, type MouseEvent, useMemo } from "react"
import { Plus } from "lucide-react"
import type { Component } from "@/schemas/componentSchema"
import { Badge } from "@/components/ui/badge"
import { ComponentIcon } from "@/components/common/ComponentIcon"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"

interface ComponentCardProps {
  component: Component
  dimmed?: boolean
}

export function ComponentCard({ component, dimmed }: ComponentCardProps) {
  const addNodeSmartPosition = useArchitectureStore((s) => s.addNodeSmartPosition)
  const category = COMPONENT_CATEGORIES[component.category as ComponentCategoryId]
  const color = category?.color ?? "var(--color-muted)"

  const costRange = useMemo(() => {
    const costs = component.configVariants
      .map((v) => v.monthlyCost)
      .filter((c): c is number => c !== undefined)
    if (costs.length === 0) return null
    const min = Math.min(...costs)
    const max = Math.max(...costs)
    if (min === max) return min === 0 ? "Free" : `$${min}/mo`
    return min === 0 ? `Free–$${max}/mo` : `$${min}–$${max}/mo`
  }, [component.configVariants])

  const setActiveDrag = useUiStore((s) => s.setActiveDrag)

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/archie-component", component.id)
    event.dataTransfer.effectAllowed = "move"
    setActiveDrag({ kind: "toolbox", componentId: component.id, componentCategory: component.category })
  }

  const handleDragEnd = () => {
    setActiveDrag(null)
  }

  const handleAddToCanvas = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    addNodeSmartPosition(component.id)
  }

  return (
    <div
      data-testid={`component-card-${component.id}`}
      className={`relative cursor-grab rounded-md border border-archie-border bg-panel p-3 pl-5 pr-8 transition-opacity duration-200 active:cursor-grabbing ${
        dimmed ? "opacity-40 grayscale" : "opacity-100"
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={dimmed ? "Incompatible with selected component" : undefined}
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5 rounded-l-md"
        style={{ backgroundColor: color }}
      />

      <button
        data-testid={`add-to-canvas-${component.id}`}
        type="button"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-text-secondary opacity-60 transition-opacity hover:bg-archie-border hover:opacity-100"
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
        onClick={handleAddToCanvas}
        title="Add to canvas"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-1.5">
        <ComponentIcon
          componentId={component.id}
          category={component.category as ComponentCategoryId}
          className="h-5 w-5 shrink-0"
        />
        <h4 className="text-xs font-semibold text-text-primary">{component.name}</h4>
      </div>

      <div className="mt-1.5 space-y-1.5">
        <div>
          <span className="text-[0.625rem] font-semibold uppercase text-text-secondary">IS</span>
          <p className="text-[0.8125rem] leading-tight text-text-primary">{component.is}</p>
        </div>

        <div>
          <span className="text-[0.625rem] font-semibold uppercase text-text-secondary">GAIN</span>
          <ul className="ml-3 list-disc text-[0.8125rem] leading-tight text-text-primary">
            {component.gain.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>

        <div>
          <span className="text-[0.625rem] font-semibold uppercase text-text-secondary">COST</span>
          <ul className="ml-3 list-disc text-[0.8125rem] leading-tight text-text-primary">
            {component.cost.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          {component.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[0.625rem]">
              {tag}
            </Badge>
          ))}
        </div>

        {costRange && (
          <div data-testid={`cost-range-${component.id}`} className="pt-1 text-[0.625rem] font-medium text-emerald-400">
            {costRange}
          </div>
        )}
      </div>
    </div>
  )
}
