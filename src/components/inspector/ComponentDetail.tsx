import { useMemo } from "react"
import type { Component, MetricValue } from "@/types"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ComponentSwapper } from "@/components/inspector/ComponentSwapper"
import { ConfigSelector } from "@/components/inspector/ConfigSelector"
import { MetricCard } from "@/components/inspector/MetricCard"

interface ComponentDetailProps {
  component: Component
  activeVariantId: string
  onVariantChange: (variantId: string) => void
  currentCategory: string
  onSwapComponent: (newComponentId: string) => void
}

export function ComponentDetail({
  component,
  activeVariantId,
  onVariantChange,
  currentCategory,
  onSwapComponent,
}: ComponentDetailProps) {
  const activeVariant = component.configVariants.find(
    (v) => v.id === activeVariantId,
  )

  const metricsByCategory = useMemo(() => {
    if (!activeVariant) return new Map<string, MetricValue[]>()

    const grouped = new Map<string, MetricValue[]>()
    for (const metric of activeVariant.metrics) {
      if (!grouped.has(metric.category)) {
        grouped.set(metric.category, [])
      }
      grouped.get(metric.category)!.push(metric)
    }
    return grouped
  }, [activeVariant])

  const categoryMeta = component.category in COMPONENT_CATEGORIES
    ? COMPONENT_CATEGORIES[component.category as ComponentCategoryId]
    : null

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        {/* Header: name + category badge */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {component.name}
          </h2>
          {categoryMeta && (
            <Badge
              variant="outline"
              className="mt-1 text-xs"
              style={{ borderColor: categoryMeta.color, color: categoryMeta.color }}
            >
              {categoryMeta.label}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary">{component.description}</p>

        {/* Component Type Swapper */}
        <ComponentSwapper
          currentComponentId={component.id}
          currentCategory={currentCategory}
          onSwapComponent={onSwapComponent}
        />

        <Separator />

        {/* Config Selector */}
        {component.configVariants.length > 0 && (
          <ConfigSelector
            variants={component.configVariants}
            activeVariantId={activeVariantId}
            onVariantChange={onVariantChange}
          />
        )}

        <Separator />

        {/* IS section */}
        <div>
          <h3 className="mb-1 text-xs font-medium text-text-primary">What it is</h3>
          <p className="text-xs text-text-secondary">{component.is}</p>
        </div>

        {/* Gain section */}
        <div>
          <h3 className="mb-1 text-xs font-medium text-green-600">Gains</h3>
          <ul className="space-y-0.5">
            {component.gain.map((item, index) => (
              <li key={`gain-${index}`} className="flex items-start gap-1 text-xs text-text-secondary">
                <span className="mt-0.5 text-green-500">+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Cost section */}
        <div>
          <h3 className="mb-1 text-xs font-medium text-red-600">Costs</h3>
          <ul className="space-y-0.5">
            {component.cost.map((item, index) => (
              <li key={`cost-${index}`} className="flex items-start gap-1 text-xs text-text-secondary">
                <span className="mt-0.5 text-red-500">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Metrics by category */}
        {metricsByCategory.size > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-text-primary">Metrics</h3>
              {Object.entries(COMPONENT_CATEGORIES).map(([catId, catMeta]) => {
                const metrics = metricsByCategory.get(catId)
                if (!metrics || metrics.length === 0) return null
                return (
                  <MetricCard
                    key={catId}
                    categoryId={catId}
                    categoryLabel={catMeta.label}
                    categoryColor={catMeta.color}
                    categoryIconName={catMeta.iconName}
                    metrics={metrics}
                  />
                )
              })}
              {/* Render metrics whose category doesn't match COMPONENT_CATEGORIES */}
              {Array.from(metricsByCategory.entries())
                .filter(([catId]) => !(catId in COMPONENT_CATEGORIES))
                .map(([catId, metrics]) => (
                  <MetricCard
                    key={catId}
                    categoryId={catId}
                    categoryLabel={catId}
                    categoryColor="var(--color-text-secondary)"
                    categoryIconName=""
                    metrics={metrics}
                  />
                ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
