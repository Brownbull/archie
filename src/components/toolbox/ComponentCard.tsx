import type { Component } from "@/schemas/componentSchema"
import { Badge } from "@/components/ui/badge"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"

interface ComponentCardProps {
  component: Component
}

export function ComponentCard({ component }: ComponentCardProps) {
  const category = COMPONENT_CATEGORIES[component.category as ComponentCategoryId]
  const color = category?.color ?? "var(--color-muted)"

  return (
    <div
      data-testid={`component-card-${component.id}`}
      className="relative rounded-md border border-archie-border bg-panel p-3 pl-5"
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5 rounded-l-md"
        style={{ backgroundColor: color }}
      />

      <h4 className="text-xs font-semibold text-text-primary">{component.name}</h4>

      <div className="mt-1.5 space-y-1.5">
        <div>
          <span className="text-[10px] font-semibold uppercase text-text-secondary">IS</span>
          <p className="text-[13px] leading-tight text-text-primary">{component.is}</p>
        </div>

        <div>
          <span className="text-[10px] font-semibold uppercase text-text-secondary">GAIN</span>
          <ul className="ml-3 list-disc text-[13px] leading-tight text-text-primary">
            {component.gain.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>

        <div>
          <span className="text-[10px] font-semibold uppercase text-text-secondary">COST</span>
          <ul className="ml-3 list-disc text-[13px] leading-tight text-text-primary">
            {component.cost.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          {component.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
