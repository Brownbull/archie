import { memo, useMemo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { ArchieNode as ArchieNodeType } from "@/stores/architectureStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { COMPONENT_CATEGORIES, HEATMAP_COLORS, NODE_WIDTH, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { ConstraintViolationBadge } from "@/components/canvas/ConstraintViolationBadge"
import { InlineMetricBar } from "@/components/canvas/InlineMetricBar"
import { StatusDot } from "@/components/canvas/StatusDot"
import { useNodeOverlay } from "@/hooks/useNodeOverlay"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useTopMetrics } from "@/hooks/useTopMetrics"
import { componentLibrary } from "@/services/componentLibrary"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { useNodePorts } from "@/hooks/useNodePorts"
import { PORT_TYPES } from "@/lib/constants"
import { getNodeCost } from "@/stores/architectureStoreHelpers"

const PORT_HEIGHT_PX = 20
const MIN_PORT_SECTION_HEIGHT = 0
const DYNAMIC_HEIGHT_THRESHOLD = 5

function getPortOffset(index: number, total: number): number {
  if (total <= 1) return 50
  const padding = 15
  const range = 100 - 2 * padding
  return padding + (index / (total - 1)) * range
}

function getMinHeight(portCount: number): number | undefined {
  if (portCount <= DYNAMIC_HEIGHT_THRESHOLD) return undefined
  return MIN_PORT_SECTION_HEIGHT + portCount * PORT_HEIGHT_PX
}

function ArchieNodeComponent({ id, data }: NodeProps<ArchieNodeType>) {
  const category = COMPONENT_CATEGORIES[data.componentCategory as ComponentCategoryId]
  const color = category?.color ?? "var(--color-muted)"
  const IconComponent = category ? CATEGORY_ICONS[category.iconName] : undefined

  // Heatmap state — targeted selectors (AC-ARCH-PATTERN-5, AC-ARCH-NO-6)
  const heatmapStatus = useArchitectureStore((s) => s.heatmapColors.get(id))
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)

  // Constraint violations — O(1) per-node selector via derived Map (TD-6-3a AC-2)
  // violationsByNodeId.get(id) avoids O(n) filter on every node; constraints subscription
  // is shared but only changes on user CRUD actions (not recalculation).
  // NOTE: buildViolationsByNodeId creates new array refs on each evaluation, so the
  // useMemo below re-runs whenever violations are re-evaluated — acceptable at CRUD frequency.
  const nodeViolations = useArchitectureStore((s) => s.violationsByNodeId.get(id))
  const constraints = useArchitectureStore((s) => s.constraints)
  const violationCount = nodeViolations?.length ?? 0
  const tooltipText = useMemo(() => {
    if (!nodeViolations || nodeViolations.length === 0) return undefined
    const constraintMap = new Map(constraints.map((c) => [c.id, c]))
    return nodeViolations
      .map((v) => constraintMap.get(v.constraintId)?.label ?? `${v.categoryId} constraint`)
      .join(", ")
  }, [nodeViolations, constraints])

  const animationsEnabled = usePreferencesStore((s) => s.animationsEnabled)
  const isRippling = useArchitectureStore((s) => s.rippleActiveNodeIds.has(id))
  const overlayInfo = useNodeOverlay(id, data.archieComponentId)

  // Inline metrics: top 2 by weight (Story 10-1)
  const topMetrics = useTopMetrics(id)
  // Variant name sourced from static component library (bundled YAML, not user-controlled)
  const variantName = useMemo(() => {
    const comp = componentLibrary.getComponent(data.archieComponentId)
    return comp?.configVariants.find((v) => v.id === data.activeConfigVariantId)?.name ?? null
  }, [data.archieComponentId, data.activeConfigVariantId])

  const nodeCost = useMemo(
    () => getNodeCost(data.archieComponentId, data.activeConfigVariantId),
    [data.archieComponentId, data.activeConfigVariantId],
  )

  const { inputs, outputs, hasPorts } = useNodePorts(data.archieComponentId)
  const maxPortSide = Math.max(inputs.length, outputs.length)
  const dynamicMinHeight = getMinHeight(maxPortSide)

  // Compatibility dimming during active drag (Phase 1 — Factorio-fy)
  const activeDrag = useUiStore((s) => s.activeDrag)
  const compatStatus = useMemo(() => {
    if (!activeDrag) return null
    if (activeDrag.kind === "connection" && activeDrag.sourceNodeId === id) {
      return { isDragSource: true, isCompatible: true, reason: "" }
    }
    const dragComponentId = activeDrag.kind === "toolbox"
      ? activeDrag.componentId
      : activeDrag.sourceComponentId
    const dragComponent = componentLibrary.getComponent(dragComponentId)
    const nodeComponent = componentLibrary.getComponent(data.archieComponentId)

    if (activeDrag.kind === "connection" && activeDrag.sourceHandle && nodeComponent?.ports) {
      const sourcePort = dragComponent?.ports?.find((p) => p.id === activeDrag.sourceHandle)
      if (sourcePort) {
        const hasMatch = nodeComponent.ports.some(
          (p) => p.direction === "in" && p.type === sourcePort.type,
        )
        if (!hasMatch) {
          const label = PORT_TYPES[sourcePort.type]?.label ?? sourcePort.type
          return { isDragSource: false, isCompatible: false, reason: `No ${label} input port` }
        }
        return { isDragSource: false, isCompatible: true, reason: "" }
      }
    }

    const result = checkCompatibility(
      dragComponent ? { category: dragComponent.category, compatibility: dragComponent.compatibility } : undefined,
      nodeComponent ? { category: nodeComponent.category, compatibility: nodeComponent.compatibility } : undefined,
    )
    return { isDragSource: false, isCompatible: result.isCompatible, reason: result.reason }
  }, [activeDrag, id, data.archieComponentId])

  const isDimmed = activeDrag !== null && compatStatus !== null && !compatStatus.isDragSource && !compatStatus.isCompatible
  const isHighlighted = activeDrag !== null && compatStatus !== null && !compatStatus.isDragSource && compatStatus.isCompatible

  // Box-shadow glow for heatmap (AC-ARCH-PATTERN-6) — separate from category stripe
  const boxShadow = (() => {
    if (isHighlighted) return "0 0 12px 3px var(--color-heatmap-green)"
    if (heatmapEnabled && heatmapStatus) return `0 0 8px 2px ${HEATMAP_COLORS[heatmapStatus]}`
    return undefined
  })()

  // Accessibility: include heatmap status in aria-label for screen readers (TD-2-2b)
  const ariaLabel =
    heatmapEnabled && heatmapStatus
      ? `${data.componentName} \u2014 ${heatmapStatus}`
      : data.componentName

  return (
    <div
      data-testid="archie-node"
      data-compat-dimmed={isDimmed || undefined}
      data-compat-highlighted={isHighlighted || undefined}
      className={`relative rounded-md border bg-panel shadow-sm transition-all duration-200 ${
        isDimmed
          ? "border-archie-border/40 opacity-35 grayscale"
          : isHighlighted
            ? "border-green-400 ring-2 ring-green-400/50 opacity-100"
            : "border-archie-border opacity-100"
      }${animationsEnabled && isRippling ? " archie-ripple" : ""}`}
      style={{
        width: `${NODE_WIDTH}px`,
        minHeight: dynamicMinHeight,
        boxShadow,
        "--ripple-color": heatmapStatus ? HEATMAP_COLORS[heatmapStatus] : undefined,
      } as React.CSSProperties}
      aria-label={ariaLabel}
      title={isDimmed && compatStatus?.reason ? `⚠ ${compatStatus.reason}` : undefined}
    >
      <ConstraintViolationBadge violationCount={violationCount} tooltipText={tooltipText} />

      {/* Category stripe — identity, never heatmap (UX18, AC-ARCH-NO-9) */}
      <div
        className="h-1 w-full rounded-t-md"
        style={{ backgroundColor: color }}
        data-testid="archie-node-stripe"
      />

      <div className="flex items-center gap-2 px-3 py-2">
        {IconComponent && (
          <IconComponent
            className="h-4 w-4 shrink-0"
            style={{ color }}
          />
        )}
        <span className="truncate text-xs font-medium text-text-primary">
          {data.componentName}
        </span>
      </div>

      {variantName && (
        <div data-testid="archie-node-variant" className="px-3 pb-0.5 text-[10px] text-text-secondary truncate">
          {variantName}
        </div>
      )}

      {nodeCost.monthlyCost !== undefined && (
        <div data-testid="archie-node-cost" className="px-3 pb-1 text-[10px] font-medium text-emerald-400 truncate">
          {nodeCost.monthlyCost === 0 ? "Free" : `$${nodeCost.monthlyCost}/mo`}
        </div>
      )}

      {topMetrics.length > 0 && (
        <div className="pb-1.5">
          {topMetrics.map((m) => (
            <InlineMetricBar
              key={m.categoryId}
              abbreviation={m.shortName}
              value={m.value}
              color={m.color}
            />
          ))}
        </div>
      )}

      {overlayInfo && (
        <div
          data-testid="overlay-badge"
          className="absolute -top-2.5 -right-2.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-sm"
          style={{ backgroundColor: overlayInfo.color, color: "#fff" }}
        >
          <span>{overlayInfo.value}</span>
        </div>
      )}

      {heatmapEnabled && heatmapStatus && (
        <StatusDot status={heatmapStatus} animate={animationsEnabled} />
      )}

      {hasPorts ? (
        <>
          {inputs.map((port, i) => (
            <Handle
              key={port.id}
              id={port.id}
              type="target"
              position={Position.Left}
              data-testid={`port-handle-${port.id}`}
              data-port-type={port.type}
              title={`${port.label} In`}
              className="!h-3 !w-3 !border-2 !border-white/80"
              style={{
                backgroundColor: port.color,
                top: `${getPortOffset(i, inputs.length)}%`,
              }}
            />
          ))}
          {outputs.map((port, i) => (
            <Handle
              key={port.id}
              id={port.id}
              type="source"
              position={Position.Right}
              data-testid={`port-handle-${port.id}`}
              data-port-type={port.type}
              title={`${port.label} Out`}
              className="!h-3 !w-3 !border-2 !border-white/80"
              style={{
                backgroundColor: port.color,
                top: `${getPortOffset(i, outputs.length)}%`,
              }}
            />
          ))}
        </>
      ) : (
        <>
          <Handle
            type="target"
            position={Position.Left}
            data-testid="archie-node-handle-target"
            className="!h-2.5 !w-2.5 !border-2 !border-archie-border !bg-surface"
          />
          <Handle
            type="source"
            position={Position.Right}
            data-testid="archie-node-handle-source"
            className="!h-2.5 !w-2.5 !border-2 !border-archie-border !bg-surface"
          />
        </>
      )}
    </div>
  )
}

export const ArchieNode = memo(ArchieNodeComponent)
