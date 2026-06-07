import { useState, useMemo, useCallback } from "react"
import type { Component, MetricValue } from "@/types"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { COMPONENT_TYPES, levelRank } from "@/lib/componentTypes"
import { useArchitectureStore } from "@/stores/architectureStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { computeRecommendations } from "@/engine/recommendationEngine"
import { getNodeCost } from "@/stores/architectureStoreHelpers"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EconomicsSection } from "@/components/inspector/EconomicsSection"
import { MetricCard } from "@/components/inspector/MetricCard"
import { MetricFilter } from "@/components/inspector/MetricFilter"
import { VariantRecommendation } from "@/components/inspector/VariantRecommendation"
import { CodeSnippetViewer } from "@/components/inspector/CodeSnippetViewer"
import { DataContextPanel } from "@/components/inspector/DataContextPanel"
import { DataSourceNote } from "@/components/common/DataSourceNote"
import { BlockConceptLoop } from "@/components/common/BlockConceptLoop"
import { PanelInfoButton } from "@/components/help/PanelInfoButton"
import { formatRps, formatLatencyMs } from "@/lib/formatStats"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { InspectorDisclosure } from "@/components/inspector/InspectorDisclosure"
import { ChevronDown, ChevronRight, ExternalLink, Trash2 } from "lucide-react"

interface ComponentDetailProps {
  component: Component
  activeVariantId: string
  nodeId?: string
  // Fluidity P1: tuning moved to the canvas block; the inspector is read-only learning/inspection.
  // These remain as optional/ignored props so existing callers keep type-checking during the migration.
  onVariantChange?: (variantId: string) => void
  currentCategory?: string
  onSwapComponent?: (newComponentId: string) => void
}

export function ComponentDetail({
  component,
  activeVariantId,
  nodeId,
}: ComponentDetailProps) {

  // Progressive disclosure by experience level (P89/Phase C). Beginners get the decision-relevant
  // essentials (what it is, swap/tier, cost·RPS·latency); trade-offs (description, gains, costs,
  // recommendations) appear at intermediate; the heaviest technical sections (code, full metrics,
  // data context) appear at advanced. The ⓘ explainer points users to the level control.
  const experienceLevel = usePreferencesStore((s) => s.experienceLevel)
  const showTradeoffs = levelRank(experienceLevel) >= levelRank("intermediate")
  const showTechnical = levelRank(experienceLevel) >= levelRank("advanced")

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
  const trafficRps = useArchitectureStore(
    (s) => (nodeId ? s.nodes.find((n) => n.id === nodeId)?.data.trafficRps : undefined),
  )
  const removeNode = useArchitectureStore((s) => s.removeNode)

  const activeVariant = component.configVariants.find(
    (v) => v.id === activeVariantId,
  )

  const currentEconomics = useMemo(
    () => getNodeCost(component.id, activeVariantId, replicaCount, trafficRps),
    [component.id, activeVariantId, replicaCount, trafficRps],
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

  // Type-first heading (matches the canvas node): show the logical type as the title and the
  // chosen vendor in the summary line. Falls back to the vendor name for pre-P5 components.
  const typeLabel = component.typeId ? COMPONENT_TYPES.get(component.typeId)?.label : undefined
  const headingLabel = typeLabel ?? component.name

  return (
    <ScrollArea className="h-full">
      <div className="min-w-0 space-y-3 p-3">
        {/* Header: type-first title + Remove. Summary line carries the chosen vendor · variant · $/mo. */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 data-testid="inspector-heading" className="min-w-0 text-sm font-semibold text-text-primary">
              {headingLabel}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              <PanelInfoButton guideId="inspector" side="left" />
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
            {/* Vendor lives here now that the heading is the logical type. */}
            {typeLabel && <span data-testid="inspector-summary-provider" className="font-medium text-text-primary">{component.name}</span>}
            {component.vendorUrl && (
              <a
                href={component.vendorUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="inspector-vendor-link"
                className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
                title={`Visit ${component.name}`}
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {activeVariant?.name && <span data-testid="inspector-summary-variant">{activeVariant.name}</span>}
            <span data-testid="inspector-summary-cost" className="font-medium text-emerald-400">
              {currentEconomics.monthlyCost === 0 ? "Free" : `$${currentEconomics.monthlyCost}/mo`}
            </span>
            {/* Throughput + latency alongside cost, so the summary carries all three at a glance. */}
            {formatRps(currentEconomics.maxRPS) && (
              <span data-testid="inspector-summary-rps">{formatRps(currentEconomics.maxRPS)}</span>
            )}
            {formatLatencyMs(currentEconomics.baseLatencyMs) && (
              <span data-testid="inspector-summary-latency">{formatLatencyMs(currentEconomics.baseLatencyMs)}</span>
            )}
          </div>
        </div>

        {/* Hero concept loop — a larger animated "what this block does" that reinforces the
            type at a glance (matches the toolbox card / canvas node motion). */}
        {component.typeId && (
          <div className="flex justify-center rounded-md border border-archie-border bg-surface/40 py-2">
            <BlockConceptLoop
              typeId={component.typeId}
              size="lg"
              color={categoryMeta?.color ?? "currentColor"}
              title={`${headingLabel} concept`}
            />
          </div>
        )}

        {/* Orientation headline — the one-line "what it is", the first thing a junior reads.
            The longer description is one click away in the "What it is" disclosure below. */}
        <p data-testid="inspector-headline" className="text-xs leading-snug text-text-primary">{component.is}</p>

        {/* Fluidity P1 — the inspector is read-only learning/inspection. Vendor, config tier, replicas
            and traffic are all tuned on the canvas block now (one tuning surface); the economics below
            still reflect those changes live (it reads the store regardless of where the edit happened). */}

        {/* Economics (Epic 13 Phase 4) */}
        <EconomicsSection current={currentEconomics} previous={previousEconomics} />

        {/* Code Snippet — collapse-by-default (P3 density): the snippet is the heaviest
            single block, so it lives behind a disclosure and the inspector leads with the
            decision-relevant summary, scores, and economics. */}
        {showTechnical && activeVariant?.codeSnippet && (
          <div data-section="code">
            <InspectorDisclosure title="Code example" testId="disclosure-code">
              <div className="pt-0.5">
                <CodeSnippetViewer codeSnippet={activeVariant.codeSnippet} />
              </div>
            </InspectorDisclosure>
          </div>
        )}

        {/* Provenance: the figures above are AI-compiled directional estimates, not benchmarks. */}
        <div data-section="data-source">
          <DataSourceNote kind="block" />
        </div>

        {showTradeoffs && (
          <>
        <Separator />

        {/* IS section (collapse-by-default — P3 density) */}
        <div data-section="details">
          <InspectorDisclosure title="What it is" testId="disclosure-is">
            <p className="pt-0.5 text-xs text-text-secondary">{component.description}</p>
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
          </>
        )}

        {/* Metrics by category (collapse-by-default — the heaviest section) */}
        {showTechnical && metricsByCategory.size > 0 && (
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
        {showTechnical && nodeId && (
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

        {/* Progressive-disclosure hint: tell lower levels where the rest went (P89/Phase C). */}
        {!showTechnical && (
          <p data-testid="inspector-level-hint" className="px-1 pt-1 text-[0.625rem] leading-snug text-text-secondary/70">
            {showTradeoffs
              ? "Code and full metrics appear at the Advanced level."
              : "Trade-offs, metrics and code appear at higher experience levels — raise it in the top bar."}
          </p>
        )}
      </div>
    </ScrollArea>
  )
}
