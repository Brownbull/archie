import { Fragment, memo, useMemo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { ArchieNode as ArchieNodeType } from "@/stores/architectureStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { eventTargetMatches } from "@/engine/simulationEngine"
import { COMPONENT_CATEGORIES, HEATMAP_COLORS, NODE_MIN_WIDTH, NODE_MAX_WIDTH, MIN_REPLICAS, MAX_REPLICAS, getScalingRule, type ComponentCategoryId } from "@/lib/constants"
import { ComponentIcon } from "@/components/common/ComponentIcon"
import { NodeActionToolbar } from "@/components/canvas/NodeActionToolbar"
import { ConstraintViolationBadge } from "@/components/canvas/ConstraintViolationBadge"
import { SaveBlockDefaultButton } from "@/components/canvas/SaveBlockDefaultButton"
import { InlineMetricBar } from "@/components/canvas/InlineMetricBar"
import { StatusDot } from "@/components/canvas/StatusDot"
import { useNodeOverlay } from "@/hooks/useNodeOverlay"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useTopMetrics } from "@/hooks/useTopMetrics"
import { componentLibrary } from "@/services/componentLibrary"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import { getTypeIconUrl } from "@/lib/typeIcons"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { useNodePorts } from "@/hooks/useNodePorts"
import { useNodeSimTelemetry, simCapacityColorClass } from "@/hooks/useNodeSimTelemetry"
import { PORT_TYPES } from "@/lib/constants"
import { getNodeCost, getNodeComplexity, getNodeCategoryAverages, type ComplexityLevel } from "@/stores/architectureStoreHelpers"
import { computeWeightedNodeScore } from "@/engine/heatmapCalculator"
import { TypeIcon } from "@/components/common/TypeIcon"
import { TrafficNodeControls } from "@/components/canvas/TrafficNodeControls"
import { formatRps } from "@/lib/formatStats"
import { NodeProviderSelect } from "@/components/canvas/NodeProviderSelect"
import { NodeConfigSelect } from "@/components/canvas/NodeConfigSelect"
import { useDisclosureTier } from "@/hooks/useDisclosureTier"
import { Gauge } from "lucide-react"

const PORT_HEIGHT_PX = 20
const MIN_PORT_SECTION_HEIGHT = 0
const DYNAMIC_HEIGHT_THRESHOLD = 5

// On-node operational-complexity badge: label + colour per level. Switch (not a lookup map)
// to keep the access static for the object-injection lint rule. Low ops cost reads green.
function complexityMeta(level: ComplexityLevel): { label: string; cls: string } {
  switch (level) {
    case "low":
      return { label: "Low", cls: "bg-[#ff8a3d]/20 text-[#ff8a3d]" }
    case "medium":
      return { label: "Med", cls: "bg-[#3b9dff]/20 text-[#3b9dff]" }
    case "high":
      return { label: "High", cls: "bg-[#9aa3b0]/20 text-[#9aa3b0]" }
  }
}

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

  // Heatmap state — targeted selectors (AC-ARCH-PATTERN-5, AC-ARCH-NO-6)
  const heatmapStatus = useArchitectureStore((s) => s.heatmapColors.get(id))
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)

  // Numeric weighted health score for the heatmap hover (the same value the status is derived
  // from) — surfaces the actual number behind the colour. Computed locally from this node's
  // metrics + the weight profile; null until the node has been recalculated.
  const nodeMetrics = useArchitectureStore((s) => s.computedMetrics.get(id))
  const weightProfile = useArchitectureStore((s) => s.weightProfile)
  const heatmapScore = useMemo(
    () => (nodeMetrics ? computeWeightedNodeScore(getNodeCategoryAverages(nodeMetrics), weightProfile) : null),
    [nodeMetrics, weightProfile],
  )

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
  const iconSet = usePreferencesStore((s) => s.iconSet)
  const isRippling = useArchitectureStore((s) => s.rippleActiveNodeIds.has(id))
  const overlayInfo = useNodeOverlay(id, data.archieComponentId)

  // Inline metrics: top 2 by weight (Story 10-1)
  const topMetrics = useTopMetrics(id)
  // Variant name sourced from static component library (bundled YAML, not user-controlled)
  const variantName = useMemo(() => {
    const comp = componentLibrary.getComponent(data.archieComponentId)
    return comp?.configVariants.find((v) => v.id === data.activeConfigVariantId)?.name ?? null
  }, [data.archieComponentId, data.activeConfigVariantId])

  // Type-first presentation: the node reads as a logical block. Title = the type label
  // ("Cache"), subtitle = the chosen vendor (+ variant), e.g. "Redis · Standard". Falls back to
  // the vendor name as the title for pre-P5 components that carry no typeId.
  const typeInfo = useMemo(() => {
    const comp = componentLibrary.getComponent(data.archieComponentId)
    const typeId = comp?.typeId
    const typeLabel = typeId ? COMPONENT_TYPES.get(typeId)?.label : undefined
    return { typeId, typeLabel, iconUrl: typeId ? getTypeIconUrl(typeId) : null }
  }, [data.archieComponentId])

  const nodeTitle = typeInfo.typeLabel ?? data.componentName
  const nodeSubtitle = typeInfo.typeLabel
    ? `${data.componentName}${variantName ? ` · ${variantName}` : ""}`
    : variantName

  const nodeCost = useMemo(
    () => getNodeCost(data.archieComponentId, data.activeConfigVariantId, data.replicaCount, data.trafficRps),
    [data.archieComponentId, data.activeConfigVariantId, data.replicaCount, data.trafficRps],
  )

  // Throughput (requests/sec) + base latency shown on the left of the stats row; cost on the right.
  const rpsLabel = useMemo(() => formatRps(nodeCost.maxRPS), [nodeCost.maxRPS])
  // Compact RPS figure (no "rps" suffix) for the traffic-source stepper readout — handles k and M.
  const latencyLabel = nodeCost.baseLatencyMs !== undefined ? `${nodeCost.baseLatencyMs}ms` : null

  // Operational-complexity level for the active variant — drives the badge on the right of the
  // scaling row (below the price). Tells a junior architect how much effort this block is to run.
  const complexity = useMemo(
    () => getNodeComplexity(data.archieComponentId, data.activeConfigVariantId),
    [data.archieComponentId, data.activeConfigVariantId],
  )

  // --- Replica scaling (Epic 14) ---
  const replicaCount = data.replicaCount ?? 1
  const scalingRule = getScalingRule(data.componentCategory)
  // Traffic sources aren't "scaled" with replicas — instead the stepper sets their emitted rps
  // (data.trafficRps, the source's peak; legacy nodes fall back to the TRAFFIC_RPS_STEPS index).
  const isTraffic = data.componentCategory === "traffic"
  // D20: a challenge traffic source is the fixed problem statement until 3★ — gate the in-node vendor
  // switcher too (the demand controls already lock in TrafficNodeControls), so it can't be swapped while locked.
  const trafficLocked = useChallengeStore((st) => isChallengeMode(st) && (st.bestStars[st.activeChallenge?.id ?? ""] ?? 0) < 3)
  // Fluidity P3c (D84): vendor/config/replica controls disclose progressively in quests.
  const { showOnNodeConfig } = useDisclosureTier()
  const setNodeReplicaCount = useArchitectureStore((s) => s.setNodeReplicaCount)
  const needsLB = useArchitectureStore((s) =>
    (s.topologyIssuesByNodeId.get(id) ?? []).some((iss) => iss.issueType === "replicas-without-lb"),
  )
  // Connectivity status (D74) — a node disconnected from the request path is dead weight: it no longer
  // bills toward the budget star and never participates in the sim. Surfacing it on the node itself (not
  // just the results modal) makes "I disconnected this and forgot" obvious at a glance. orphan = no edges
  // at all; unreachable = wired into a stranded subgraph the traffic can't reach.
  const topologyStatus = useArchitectureStore((s) => {
    const issues = s.topologyIssuesByNodeId.get(id) ?? []
    if (issues.some((iss) => iss.issueType === "orphan")) return "orphan"
    if (issues.some((iss) => iss.issueType === "unreachable")) return "unreachable"
    return "healthy"
  })
  // "N backends" — only meaningful on a load-balancer-capable node; count its downstream targets.
  const backendCount = useArchitectureStore((s) =>
    scalingRule.actsAsLoadBalancer ? s.edges.filter((e) => e.source === id).length : 0,
  )

  // P5-S3 (D95): chaos-target visibility — the feedback's "we don't have visibility of where it is
  // failing". While BUILDING a quest, a block matched by an authored scheduled event (id ∪ category
  // ∪ typeId — the sim's own matcher) wears a "may fail" badge, so the player plans around the blast
  // instead of discovering it mid-run.
  const chaosEvent = useChallengeStore((st) => {
    if (!st.activeChallenge || st.attemptState !== "building") return null
    return st.activeChallenge.scheduledEvents.find((e) =>
      eventTargetMatches(e.target, { id, category: data.componentCategory, typeId: typeInfo.typeId ?? undefined }),
    ) ?? null
  })

  // Live simulation telemetry for this node at the current playback tick (Epic 15).
  const simTelemetry = useNodeSimTelemetry(id)

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

  // Health readout (status + the numeric score behind the colour) shown on hover when heatmap is
  // on; also folded into the aria-label so screen-reader users get the same non-colour information.
  const healthText =
    heatmapEnabled && heatmapStatus
      ? `Health: ${heatmapStatus}${heatmapScore != null ? ` \u00b7 score ${heatmapScore.toFixed(1)}/10` : ""}`
      : undefined

  // Accessibility: include heatmap status + score in aria-label for screen readers (TD-2-2b)
  const ariaLabel = healthText ? `${data.componentName} \u2014 ${healthText}` : data.componentName

  return (
    <div
      data-testid="archie-node"
      data-topology-status={topologyStatus}
      data-compat-dimmed={isDimmed || undefined}
      data-compat-highlighted={isHighlighted || undefined}
      className={`group relative rounded-md border bg-panel shadow-sm transition-all duration-200 ${
        isDimmed
          ? "border-archie-border/40 opacity-35 grayscale"
          : isHighlighted
            ? "border-green-400 ring-2 ring-green-400/50 opacity-100"
            : "border-archie-border opacity-100"
      }${animationsEnabled && isRippling ? " archie-ripple" : ""}`}
      style={{
        minWidth: `${NODE_MIN_WIDTH}px`,
        maxWidth: `${NODE_MAX_WIDTH}px`,
        width: "fit-content",
        whiteSpace: "nowrap",
        minHeight: dynamicMinHeight,
        boxShadow,
        "--ripple-color": heatmapStatus ? HEATMAP_COLORS[heatmapStatus] : undefined,
      } as React.CSSProperties}
      aria-label={ariaLabel}
      title={isDimmed && compatStatus?.reason ? `⚠ ${compatStatus.reason}` : healthText}
    >
      <NodeActionToolbar nodeId={id} />

      <ConstraintViolationBadge violationCount={violationCount} tooltipText={tooltipText} />

      {topologyStatus !== "healthy" && (
        <span
          data-testid="node-topology-status"
          data-status={topologyStatus}
          title={topologyStatus === "orphan"
            ? "Disconnected — no edges. It won't run or count toward cost until you wire it into the path."
            : "Unreachable — stranded in a subgraph the traffic source can't reach. It won't run or count toward cost."}
          className="absolute -top-2 left-2 z-10 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[0.5625rem] font-bold text-white shadow"
        >
          {topologyStatus === "orphan" ? "disconnected" : "unreachable"}
        </span>
      )}

      {chaosEvent && (
        <span
          data-testid="node-chaos-target"
          title={`A ${chaosEvent.type === "az_outage" ? "zone outage" : chaosEvent.type === "latency_spike" ? "latency spike" : "failure"} hits this block at t=${chaosEvent.t}s${chaosEvent.durationS ? ` for ${chaosEvent.durationS}s` : ""} — plan for the blast (redundancy, monitoring)`}
          className="absolute -top-2 right-2 z-10 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[0.5625rem] font-bold text-[#1a1410] shadow"
        >
          ⚡ t={chaosEvent.t}s
        </span>
      )}

      {/* Save-as-default button (top-right, inside the card). Only for typed blocks — it persists
          a per-user provider+tier default for this block type. Hidden for pre-P5 typeless blocks.
          Hidden for traffic sources (P1/T3): demand is the challenge's problem statement — a saved
          traffic default would leak into quests (and could double a one-per-type traffic kind). */}
      {typeInfo.typeId && !isTraffic && (
        <SaveBlockDefaultButton
          typeId={typeInfo.typeId}
          providerId={data.archieComponentId}
          variantId={data.activeConfigVariantId}
        />
      )}

      {/* Category stripe — identity, never heatmap (UX18, AC-ARCH-NO-9) */}
      <div
        className="h-1 w-full rounded-t-md"
        style={{ backgroundColor: color }}
        data-testid="archie-node-stripe"
      />

      <div className="flex items-center gap-2 py-2 pl-3 pr-8">
        {typeInfo.typeId ? (
          <TypeIcon typeId={typeInfo.typeId} size="sm" color={color} className="shrink-0" />
        ) : iconSet === "pixel" && typeInfo.iconUrl ? (
          <img src={typeInfo.iconUrl} alt="" className="h-4 w-4 shrink-0" />
        ) : (
          <ComponentIcon
            componentId={data.archieComponentId}
            category={data.componentCategory as ComponentCategoryId}
            className="h-4 w-4 shrink-0"
          />
        )}
        <span className="whitespace-nowrap text-xs font-medium text-text-primary">
          {nodeTitle}
        </span>
      </div>

      {/* Vendor switcher in the diagram — swap provider + compare cost/rps/latency inline.
          Falls back to a static vendor label for single-provider types. */}
      {typeInfo.typeId && !(isTraffic && trafficLocked) ? (
        <NodeProviderSelect
          nodeId={id}
          componentId={data.archieComponentId}
          category={data.componentCategory as ComponentCategoryId}
          variantName={variantName}
        />
      ) : (
        nodeSubtitle && (
          <div data-testid="archie-node-variant" className="flex items-center gap-1 px-3 pb-0.5">
            <ComponentIcon
              componentId={data.archieComponentId}
              category={data.componentCategory as ComponentCategoryId}
              className="h-3 w-3 shrink-0"
            />
            <span className="whitespace-nowrap text-[0.625rem] text-text-secondary">{nodeSubtitle}</span>
          </div>
        )
      )}

      {/* Config-tier picker on the block (Fluidity P1) — the second half of the single tuning surface,
          alongside the vendor switch. Hidden for a challenge-locked traffic source (same D20 gate). */}
      {typeInfo.typeId && !(isTraffic && trafficLocked) && (
        <NodeConfigSelect nodeId={id} componentId={data.archieComponentId} activeVariantId={data.activeConfigVariantId} />
      )}

      {/* A traffic source is a load origin, not infrastructure — its cost/latency/throughput stats
          are noise. RPS lives in the stepper below; everything else is hidden for traffic. */}
      {!isTraffic && (rpsLabel || latencyLabel || nodeCost.monthlyCost !== undefined) && (
        <div className="flex items-center justify-between gap-2 px-3 pb-1 text-[0.625rem] font-medium">
          {/* Throughput · latency on the left … */}
          <span data-testid="archie-node-rps" className="whitespace-nowrap text-text-secondary">
            {[rpsLabel, latencyLabel].filter(Boolean).join(" · ")}
          </span>
          {/* … monthly cost on the right. */}
          {nodeCost.monthlyCost !== undefined && (
            <span data-testid="archie-node-cost" className="shrink-0 text-emerald-400">
              {nodeCost.monthlyCost === 0 ? "Free" : `$${nodeCost.monthlyCost}/mo`}
            </span>
          )}
        </div>
      )}

      {(isTraffic || scalingRule.scalable || replicaCount > 1 || needsLB || backendCount > 0 || complexity) && (
        <div
          data-testid="archie-node-scaling"
          className="nodrag flex flex-wrap items-center gap-1 px-3 pb-1.5"
        >
          {isTraffic ? (
            <TrafficNodeControls nodeId={id} data={data} />
          ) : scalingRule.scalable && showOnNodeConfig ? (
            <div
              className="flex items-center overflow-hidden rounded border border-archie-border bg-surface"
              onClick={(e) => e.stopPropagation()}
              title="Horizontal replicas — identical copies that share load (multiple replicas need a load balancer upstream)."
            >
              <button
                type="button"
                data-testid="replica-decrement"
                aria-label="Decrease replicas"
                disabled={replicaCount <= MIN_REPLICAS}
                onClick={(e) => {
                  e.stopPropagation()
                  setNodeReplicaCount(id, replicaCount - 1)
                }}
                className="px-1.5 text-[0.6875rem] leading-none text-text-secondary hover:text-text-primary disabled:opacity-30"
              >
                −
              </button>
              <span data-testid="replica-count" className="min-w-[22px] text-center text-[0.625rem] font-semibold text-text-primary">
                {replicaCount}×
              </span>
              <button
                type="button"
                data-testid="replica-increment"
                aria-label="Increase replicas"
                disabled={replicaCount >= MAX_REPLICAS}
                onClick={(e) => {
                  e.stopPropagation()
                  setNodeReplicaCount(id, replicaCount + 1)
                }}
                className="px-1.5 text-[0.6875rem] leading-none text-text-secondary hover:text-text-primary disabled:opacity-30"
              >
                +
              </button>
            </div>
          ) : (
            replicaCount > 1 && (
              <span data-testid="replica-badge" className="rounded-full bg-archie-border px-1.5 py-0.5 text-[0.5625rem] font-bold text-text-primary">
                {replicaCount}×
              </span>
            )
          )}
          {scalingRule.replicaType === "read-only" && replicaCount > 1 && (
            <span data-testid="replica-readonly" className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[0.5625rem] font-medium text-violet-300">
              reads only
            </span>
          )}
          {needsLB && (
            <span
              data-testid="replica-needs-lb"
              title="Replicas need an upstream load balancer"
              className="rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[0.5625rem] font-bold text-white"
            >
              needs LB
            </span>
          )}
          {backendCount > 0 && (
            <span data-testid="replica-backends" className="rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[0.5625rem] font-medium text-teal-300">
              {backendCount} backend{backendCount === 1 ? "" : "s"}
            </span>
          )}
          {/* Operational-complexity badge — pushed to the right (below the price). Not for traffic. */}
          {!isTraffic && complexity && (
            <span
              data-testid="archie-node-complexity"
              data-complexity={complexity}
              title={`Operational complexity: ${complexityMeta(complexity).label}`}
              className={`ml-auto flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-medium ${complexityMeta(complexity).cls}`}
            >
              <Gauge className="h-2.5 w-2.5" aria-hidden />
              {complexityMeta(complexity).label}
            </span>
          )}
        </div>
      )}

      {simTelemetry && (
        <div data-testid="sim-telemetry" className="px-3 pb-1.5">
          <div className="flex items-center justify-between text-[0.5625rem] text-text-secondary">
            <span data-testid="sim-rps">{Math.round(simTelemetry.incomingRps)} rps</span>
            <span
              data-testid="sim-utilization"
              data-overloaded={simTelemetry.overloaded || undefined}
              className={`font-semibold ${simTelemetry.overloaded ? "text-red-400" : simTelemetry.capacityPercent >= 0.7 ? "text-yellow-400" : "text-text-secondary"}`}
            >
              {Math.round(simTelemetry.capacityPercent * 100)}%
            </span>
            <span data-testid="sim-latency">{Math.round(simTelemetry.latencyMs)}ms</span>
          </div>
          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-archie-border">
            <div
              data-testid="sim-capacity-bar"
              data-overloaded={simTelemetry.overloaded || undefined}
              className={`h-full transition-all ${simCapacityColorClass(simTelemetry.capacityPercent)}`}
              style={{ width: `${Math.min(100, Math.round(simTelemetry.capacityPercent * 100))}%` }}
            />
          </div>
        </div>
      )}

      {!isTraffic && topMetrics.length > 0 && (
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
          className="absolute -top-2.5 -right-2.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold shadow-sm"
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
          {inputs.map((port, i) => {
            const offset = getPortOffset(i, inputs.length)
            return (
              <Fragment key={port.id}>
                <Handle
                  id={port.id}
                  type="target"
                  position={Position.Left}
                  data-testid={`port-handle-${port.id}`}
                  data-port-type={port.type}
                  title={`${port.label} In`}
                  className="!h-3 !w-3 !border-2 !border-white/80"
                  style={{ backgroundColor: port.color, top: `${offset}%` }}
                />
                {/* Hover-revealed label so the architect knows what each connector accepts. */}
                <span
                  data-testid={`port-label-${port.id}`}
                  className="pointer-events-none absolute right-full mr-2 -translate-y-1/2 whitespace-nowrap rounded border border-archie-border bg-panel/95 px-1 py-0.5 text-[0.5625rem] font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  style={{ top: `${offset}%`, color: port.color }}
                >
                  {port.label} in
                </span>
              </Fragment>
            )
          })}
          {outputs.map((port, i) => {
            const offset = getPortOffset(i, outputs.length)
            return (
              <Fragment key={port.id}>
                <Handle
                  id={port.id}
                  type="source"
                  position={Position.Right}
                  data-testid={`port-handle-${port.id}`}
                  data-port-type={port.type}
                  title={`${port.label} Out`}
                  className="!h-3 !w-3 !border-2 !border-white/80"
                  style={{ backgroundColor: port.color, top: `${offset}%` }}
                />
                <span
                  data-testid={`port-label-${port.id}`}
                  className="pointer-events-none absolute left-full ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-archie-border bg-panel/95 px-1 py-0.5 text-[0.5625rem] font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  style={{ top: `${offset}%`, color: port.color }}
                >
                  {port.label} out
                </span>
              </Fragment>
            )
          })}
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
