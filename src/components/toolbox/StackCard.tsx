import type { DragEvent } from "react"
import { ChevronRight } from "lucide-react"
import type { StackDefinition } from "@/schemas/stackSchema"
import { METRIC_CATEGORIES, COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { sanitizeDisplayString } from "@/lib/sanitize"
import { CategoryBar } from "@/components/dashboard/CategoryBar"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

export interface ResolvedStackComponent {
  componentId: string
  variantId: string
  componentName: string
  variantName: string
  categoryId: string
}

interface StackCardProps {
  stack: StackDefinition
  resolvedComponents: ResolvedStackComponent[]
}

export function StackCard({ stack, resolvedComponents }: StackCardProps) {
  const connCount = stack.connections.length

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/archie-stack", stack.id)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div
      data-testid={`stack-card-${stack.id}`}
      aria-label={stack.name}
      className="rounded-md border border-border bg-surface-secondary p-3 space-y-2 cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
    >
      {/* Summary section — always visible */}
      <div>
        <p className="text-sm font-medium text-text-primary">{sanitizeDisplayString(stack.name, 200)}</p>
        <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{sanitizeDisplayString(stack.description, 500)}</p>
      </div>

      {/* Component list: icons + names */}
      <div className="flex flex-wrap gap-1.5">
        {resolvedComponents.map((rc) => {
          const category = COMPONENT_CATEGORIES[rc.categoryId as ComponentCategoryId]
          const color = category?.color ?? "var(--color-muted)"
          const IconComponent = category ? getCategoryIcon(category.iconName) : undefined
          return (
            <span key={rc.componentId} className="inline-flex items-center gap-1 text-xs text-text-primary">
              {IconComponent && <IconComponent className="h-3 w-3 shrink-0" style={{ color }} />}
              {sanitizeDisplayString(rc.componentName, 100)}
            </span>
          )
        })}
      </div>

      {/* Connection count */}
      <div className="text-xs text-text-secondary">
        {connCount} {connCount === 1 ? "connection" : "connections"}
      </div>

      {/* Mini trade-off profile bars */}
      <div className="space-y-0.5">
        {stack.tradeOffProfile.map((cat) => {
          const metricCat = METRIC_CATEGORIES.find((m) => m.id === cat.categoryId)
          if (!metricCat) return null
          return (
            <CategoryBar
              key={cat.categoryId}
              categoryId={cat.categoryId}
              shortName={metricCat.shortName}
              iconName={metricCat.iconName}
              categoryColor={metricCat.color}
              score={cat.score}
            />
          )
        })}
      </div>

      {/* Collapsible detail view */}
      <Collapsible>
        <CollapsibleTrigger
          data-testid={`stack-detail-trigger-${stack.id}`}
          className="flex w-full items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronRight className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-90" />
          Details
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div data-testid={`stack-detail-${stack.id}`} className="mt-2 space-y-3 border-t border-border pt-2">
            {/* Full component list with variants */}
            <div>
              <p className="text-[0.625rem] font-semibold uppercase text-text-secondary mb-1">Components</p>
              <ul className="space-y-0.5">
                {resolvedComponents.map((rc) => (
                  <li key={rc.componentId} className="text-xs text-text-primary">
                    {sanitizeDisplayString(rc.componentName, 100)} <span className="text-text-secondary">({sanitizeDisplayString(rc.variantName, 100)})</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Connection descriptions */}
            {stack.connections.length > 0 && (
              <div>
                <p className="text-[0.625rem] font-semibold uppercase text-text-secondary mb-1">Connections</p>
                <ul className="space-y-0.5">
                  {stack.connections.map((conn, idx) => {
                    const source = resolvedComponents[conn.sourceComponentIndex]
                    const target = resolvedComponents[conn.targetComponentIndex]
                    const sourceName = source?.componentName ?? `Component ${conn.sourceComponentIndex}`
                    const targetName = target?.componentName ?? `Component ${conn.targetComponentIndex}`
                    return (
                      <li key={`${idx}-${conn.sourceComponentIndex}-${conn.targetComponentIndex}-${conn.connectionType}`} className="text-xs text-text-primary">
                        {sanitizeDisplayString(sourceName, 100)} → {sanitizeDisplayString(targetName, 100)} <span className="text-text-secondary">({sanitizeDisplayString(conn.connectionType, 50)})</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
