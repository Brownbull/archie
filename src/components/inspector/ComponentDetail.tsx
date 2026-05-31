import { useState, useMemo, useCallback } from "react"
import type { Component, MetricValue } from "@/types"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { providersForComponent } from "@/lib/componentTypes"
import { useLibrary } from "@/hooks/useLibrary"
import { useArchitectureStore } from "@/stores/architectureStore"
import { computeRecommendations } from "@/engine/recommendationEngine"
import { getNodeCost } from "@/stores/architectureStoreHelpers"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ComponentSwapper } from "@/components/inspector/ComponentSwapper"
import { ConfigSelector } from "@/components/inspector/ConfigSelector"
import { EconomicsSection } from "@/components/inspector/EconomicsSection"
import { MetricCard } from "@/components/inspector/MetricCard"
import { MetricFilter } from "@/components/inspector/MetricFilter"
import { VariantRecommendation } from "@/components/inspector/VariantRecommendation"
import { CodeSnippetViewer } from "@/components/inspector/CodeSnippetViewer"
import { DataContextPanel } from "@/components/inspector/DataContextPanel"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { InspectorDisclosure } from "@/components/inspector/InspectorDisclosure"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"

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
  onSwapComponent,
  nodeId,
}: ComponentDetailProps) {
  // P5: alternatives are same-TYPE providers (e.g. Redis ↔ Memcached), not just same category.
  // providersForComponent falls back to same-category when the component has no typeId (pre-seed).
  const { components } = useLibrary()
  const alternatives = providersForComponent(component, components)

  // Use computed metrics from recalculation engine when available (AC-7),
  // fall back to library variant metrics for nodes not yet recalculated.
  // No useShallow needed: Map.get() returns the same object ref until the Map is replaced.
  const computedMetrics = useArchitectureStore(
    (s) => (nodeId ? s.computedMetrics.get(nodeId) : undefined),
  )

  // Read previous metrics for delta computation (Story 4-2a, AC-ARCH-PATTERN-2).
  // No useShallow needed: same Map.get() reference-stability reasoning as above.
  const previousMetrics = useArchitectureStore(
    (s) => (nodeId ? s.previousMetrics.get(nodeId) : undefined),
  )

  // Epic 14: node replica count drives effective (scaled) economics display.
  const replicaCount = useArchitectureStore(
    (s) => (nodeId ? (s.nodes.find((n) => n.id === nodeId)?.data.replicaCount ?? 1) : 1),
  )
  const removeNode = useArchitectureStore((s) => s.removeNode)

  const activeVariant = component.configVariants.find(
    (v) => v.id === activeVariantId,
  )

  const currentEconomics = useMemo(
    () => getNodeCost(component.id, activeVariantId, replicaCount),
    [component.id, activeVariantId, replicaCount],
  )
  // Cost delta: snapshot the displayed economics so a before→after shows on BOTH a provider
  // swap AND a config-variant switch (the config identity = component + variant). Replica-only
  // changes refresh the baseline without a delta; switching the inspected node resets it so a
  // stale cross-node delta never shows. "Adjust state during render" pattern (no effect/ref).
  const configKey = `${component.id}:${activeVariantId}`
  const [econState, setEconState] = useState<{
    nodeId: string | null
    configKey: string
    shown: typeof currentEconomics
    previous: typeof currentEconomics | undefined
  }>({ nodeId: nodeId ?? null, configKey, shown: currentEconomics, previous: undefined })

  let previousEconomics = econState.previous
  if (econState.nodeId !== (nodeId ?? null)) {
    setEconState({ nodeId: nodeId ?? null, configKey, shown: currentEconomics, previous: undefined })
    previousEconomics = undefined
  } else if (econState.configKey !== configKey) {
    // provider or variant changed on the same node → show the before→after delta
    setEconState({ nodeId: nodeId ?? null, configKey, shown: currentEconomics, previous: econState.shown })
    previousEconomics = econState.shown
  } else if (econState.shown !== currentEconomics) {
    // replica-only change → keep the baseline current, no delta
    setEconState({ ...econState, shown: currentEconomics })
  }

  const { metricsByCategory, allMetricIds } = useMemo(() => {
    // Prefer computed metrics from recalculation engine over static variant metrics
    const metricsSource = computedMetrics?.metrics ?? activeVariant?.metrics
    if (!metricsSource) {
      return {
        metricsByCategory: new Map<string, MetricValue[]>(),
        allMetricIds: [] as { id: string; name: string }[],
      }
    }

    const grouped = new Map<string, MetricValue[]>()
    const ids: { id: string; name: string }[] = []
    for (const metric of metricsSource) {
      if (!grouped.has(metric.category)) {
        grouped.set(metric.category, [])
      }
      grouped.get(metric.category)!.push(metric)
      ids.push({ id: metric.id, name: metric.name ?? metric.id })
    }
    return { metricsByCategory: grouped, allMetricIds: ids }
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
        map.set(current.id, Math.round(current.numericValue - prevMetric.numericValue))
      }
    }
    return map
  }, [computedMetrics, previousMetrics])

  // --- Metric filter state (AC-ARCH-PATTERN-3, AC-ARCH-NO-1: local useState, NOT Zustand) ---
  const [hiddenMetricIds, setHiddenMetricIds] = useState<Set<string>>(new Set())
  const [dataContextOpen, setDataContextOpen] = useState(true)

  // Reset the metric filter when inspecting a different component (AC-FUNC-3) — done during render
  // (React's "reset state on prop change" pattern) rather than a setState-in-effect, which the
  // react-compiler flags for cascading renders.
  const [filterNodeId, setFilterNodeId] = useState(nodeId)
  if (nodeId !== filterNodeId) {
    setFilterNodeId(nodeId)
    setHiddenMetricIds(new Set())
  }

  const handleToggleMetric = useCallback((metricId: string) => {
    setHiddenMetricIds((prev) => {
      const next = new Set(prev)
      if (next.has(metricId)) {
        next.delete(metricId)
      } else {
        next.add(metricId)
      }
      return next
    })
  }, [])

  // --- Variant recommendations (AC-FUNC-1, AC-FUNC-2) ---
  const recommendations = useMemo(() => {
    if (component.configVariants.length < 2) return []
    return computeRecommendations(component, activeVariantId)
  }, [component, activeVariantId])

  const categoryMeta = component.category in COMPONENT_CATEGORIES
    ? COMPONENT_CATEGORIES[component.category as ComponentCategoryId]
    : null

  return (
    <ScrollArea className="h-full">
      <div className="min-w-0 space-y-3 p-3">
        {/* Header: name + Remove + compact summary (variant · $/mo) — P3 density */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 text-sm font-semibold text-text-primary">
              {component.name}
            </h2>
            {nodeId && (
              <button
                type="button"
                data-testid="inspector-remove-node"
                aria-label="Remove from canvas"
                title="Remove from canvas"
                onClick={() => removeNode(nodeId)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:bg-red-500/15 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-text-secondary">
            {categoryMeta && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: categoryMeta.color, color: categoryMeta.color }}
              >
                {categoryMeta.label}
              </Badge>
            )}
            {activeVariant?.name && <span data-testid="inspector-summary-variant">{activeVariant.name}</span>}
            <span data-testid="inspector-summary-cost" className="font-medium text-emerald-400">
              {currentEconomics.monthlyCost === 0 ? "Free" : `$${currentEconomics.monthlyCost}/mo`}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary">{component.description}</p>

        {/* Component Type Swapper */}
        <ComponentSwapper
          currentComponentId={component.id}
          alternatives={alternatives}
          onSwapComponent={onSwapComponent}
          label="Provider"
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

        {/* Economics (Epic 13 Phase 4) */}
        <EconomicsSection current={currentEconomics} previous={previousEconomics} />

        {/* Code Snippet */}
        {activeVariant?.codeSnippet && (
          <div data-section="code">
            <CodeSnippetViewer codeSnippet={activeVariant.codeSnippet} />
          </div>
        )}

        <Separator />

        {/* IS section (collapse-by-default — P3 density) */}
        <div data-section="details">
          <InspectorDisclosure title="What it is" testId="disclosure-is">
            <p className="pt-0.5 text-xs text-text-secondary">{component.is}</p>
          </InspectorDisclosure>
        </div>

        {/* Gain section */}
        <InspectorDisclosure title="Gains" testId="disclosure-gains" titleClassName="text-green-600">
          <ul className="space-y-0.5 pt-0.5">
            {component.gain.map((item, index) => (
              <li key={`gain-${index}`} className="flex items-start gap-1 text-xs wrap-break-word text-text-secondary">
                <span className="mt-0.5 shrink-0 text-green-500">+</span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </InspectorDisclosure>

        {/* Cost section */}
        <InspectorDisclosure title="Costs" testId="disclosure-costs" titleClassName="text-red-600">
          <ul className="space-y-0.5 pt-0.5">
            {component.cost.map((item, index) => (
              <li key={`cost-${index}`} className="flex items-start gap-1 text-xs wrap-break-word text-text-secondary">
                <span className="mt-0.5 shrink-0 text-red-500">-</span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </InspectorDisclosure>

        {/* Recommendations (Story 4-2b, AC-FUNC-1/2) */}
        {recommendations.length > 0 && (
          <div data-testid="recommendations-section">
            <InspectorDisclosure title="Recommendations" testId="disclosure-recommendations">
              <div className="space-y-1.5 pt-0.5">
                {recommendations.map((rec) => (
                  <VariantRecommendation
                    key={`${rec.weakMetricId}-${rec.improvedVariantId}`}
                    recommendation={rec}
                  />
                ))}
              </div>
            </InspectorDisclosure>
          </div>
        )}

        {/* Metrics by category (collapse-by-default — the heaviest section) */}
        {metricsByCategory.size > 0 && (
          <>
            <Separator />
            <div data-section="metrics">
              <InspectorDisclosure title="Metrics" testId="disclosure-metrics">
              <div className="space-y-2 pt-0.5">
              <MetricFilter
                allMetricIds={allMetricIds}
                hiddenMetricIds={hiddenMetricIds}
                onToggleMetric={handleToggleMetric}
              />
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
                    hiddenMetricIds={hiddenMetricIds}
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
                    hiddenMetricIds={hiddenMetricIds}
                  />
                ))}
              </div>
              </InspectorDisclosure>
            </div>
          </>
        )}
        {/* Data Context (Story 7-2, AC-1 through AC-5) */}
        {nodeId && (
          <div data-section="data">
            <Separator />
            <Collapsible open={dataContextOpen} onOpenChange={setDataContextOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  data-testid="data-context-section-trigger"
                  className="flex w-full items-center justify-between py-1 text-xs font-medium text-text-primary"
                >
                  Data Context
                  {dataContextOpen
                    ? <ChevronDown className="h-3 w-3 text-text-secondary" />
                    : <ChevronRight className="h-3 w-3 text-text-secondary" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <DataContextPanel
                  nodeId={nodeId}
                  dataFitProfile={activeVariant?.dataFitProfile}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
