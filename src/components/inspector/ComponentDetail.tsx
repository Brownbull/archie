import { useMemo } from "react"
import type { Component, MetricValue } from "@/types"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { useLibrary } from "@/hooks/useLibrary"
import { useArchitectureStore } from "@/stores/architectureStore"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ComponentSwapper } from "@/components/inspector/ComponentSwapper"
import { ConfigSelector } from "@/components/inspector/ConfigSelector"
import { MetricCard } from "@/components/inspector/MetricCard"
import { CodeSnippetViewer } from "@/components/inspector/CodeSnippetViewer"

interface ComponentDetailProps {
  component: Component
  activeVariantId: string
  onVariantChange: (variantId: string) => void
  currentCategory: string
  onSwapComponent: (newComponentId: string) => void
  nodeId?: string
}

export function ComponentDetail({
  component,
  activeVariantId,
  onVariantChange,
  currentCategory,
  onSwapComponent,
  nodeId,
}: ComponentDetailProps) {
  const { getComponentsByCategory } = useLibrary()
  const alternatives = getComponentsByCategory(currentCategory)

  // Use computed metrics from recalculation engine when available (AC-7),
  // fall back to library variant metrics for nodes not yet recalculated
  const computedMetrics = useArchitectureStore(
    (s) => (nodeId ? s.computedMetrics.get(nodeId) : undefined),
  )

  // Read previous metrics for delta computation (Story 4-2a, AC-ARCH-PATTERN-2)
  const previousMetrics = useArchitectureStore(
    (s) => (nodeId ? s.previousMetrics.get(nodeId) : undefined),
  )

  const activeVariant = component.configVariants.find(
    (v) => v.id === activeVariantId,
  )

  const metricsByCategory = useMemo(() => {
    // Prefer computed metrics from recalculation engine
    const metricsSource = computedMetrics?.metrics ?? activeVariant?.metrics
    if (!metricsSource) return new Map<string, MetricValue[]>()

    const grouped = new Map<string, MetricValue[]>()
    for (const metric of metricsSource) {
      if (!grouped.has(metric.category)) {
        grouped.set(metric.category, [])
      }
      grouped.get(metric.category)!.push(metric)
    }
    return grouped
  }, [computedMetrics, activeVariant])

  // Compute delta map: current - previous metric values (AC-ARCH-NO-4).
  // Only populated when previousMetrics exists for this node.
  const deltaMap = useMemo(() => {
    if (!previousMetrics || !computedMetrics) return undefined

    const previousMetricMap = new Map(
      previousMetrics.metrics.map((m) => [m.id, m]),
    )

    const map = new Map<string, number>()
    for (const current of computedMetrics.metrics) {
      const prevMetric = previousMetricMap.get(current.id)
      if (prevMetric !== undefined) {
        map.set(current.id, current.numericValue - prevMetric.numericValue)
      }
    }
    return map
  }, [computedMetrics, previousMetrics])

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
          alternatives={alternatives}
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

        {/* Code Snippet */}
        {activeVariant?.codeSnippet && (
          <CodeSnippetViewer codeSnippet={activeVariant.codeSnippet} />
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
                    metricExplanations={activeVariant?.metricExplanations}
                    deltaMap={deltaMap}
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
                    metricExplanations={activeVariant?.metricExplanations}
                    deltaMap={deltaMap}
                  />
                ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
