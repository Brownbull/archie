import { useState } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import type { ArchieEdge as ArchieEdgeType } from "@/stores/architectureStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { HEATMAP_COLORS, LABEL_INCOMPATIBILITY_OFFSET, MAX_LABEL_OFFSET } from "@/lib/constants"
import { ConnectionWarning } from "@/components/canvas/ConnectionWarning"
import { useLibrary } from "@/hooks/useLibrary"
import { useConnectionHealth } from "@/hooks/useConnectionHealth"
import { EdgeParticles } from "@/components/canvas/EdgeParticles"

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function ArchieEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<ArchieEdgeType>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  // Heatmap state
  const edgeHeatmapStatus = useArchitectureStore((s) => s.edgeHeatmapColors.get(id))
  const updateEdgeLabelOffset = useArchitectureStore((s) => s.updateEdgeLabelOffset)
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)
  const animationsEnabled = usePreferencesStore((s) => s.animationsEnabled)

  // Connection health for particle animation (Story 9-6)
  const { density, status: healthStatus } = useConnectionHealth(source, target)

  const isIncompatible = data?.isIncompatible ?? false
  const currentLabelOffset = data?.labelOffset ?? { x: 0, y: 0 }

  // Look up source component's connectionProperties for protocol label (TD-4-3b AC-1: useLibrary for reactivity)
  const { getComponentById } = useLibrary()
  const sourceComponentId = data?.sourceArchieComponentId ?? ""
  const sourceComponent = sourceComponentId
    ? getComponentById(sourceComponentId)
    : undefined
  const connectionProps = sourceComponent?.connectionProperties

  // Drag state for label repositioning (AC-ARCH-PATTERN-5, TD-4-3a)
  // liveOffset tracks visual position during drag; store is committed once on pointerup
  const [dragState, setDragState] = useState<{
    startX: number
    startY: number
    originOffset: { x: number; y: number }
    liveOffset: { x: number; y: number }
  } | null>(null)

  // During drag, use liveOffset for smooth visual tracking; otherwise use the persisted store value
  const displayOffset = dragState ? dragState.liveOffset : currentLabelOffset

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      originOffset: { ...currentLabelOffset },
      liveOffset: { ...currentLabelOffset },
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return
    setDragState((prev) => {
      if (!prev) return prev
      const dx = e.clientX - prev.startX
      const dy = e.clientY - prev.startY
      return {
        ...prev,
        liveOffset: {
          x: prev.originOffset.x + dx,
          y: prev.originOffset.y + dy,
        },
      }
    })
  }

  const endDrag = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (dragState) {
      updateEdgeLabelOffset(id, {
        x: clamp(dragState.liveOffset.x, -MAX_LABEL_OFFSET, MAX_LABEL_OFFSET),
        y: clamp(dragState.liveOffset.y, -MAX_LABEL_OFFSET, MAX_LABEL_OFFSET),
      })
    }
    setDragState(null)
  }

  // Edge color priority logic (Story 2-2 Dev Notes, AC-ARCH-PATTERN-10)
  let strokeColor = "var(--archie-border)"
  let strokeWidth = 1.5
  let strokeDasharray: string | undefined

  if (heatmapEnabled && edgeHeatmapStatus) {
    strokeColor = HEATMAP_COLORS[edgeHeatmapStatus]
    strokeWidth = 2
    if (isIncompatible) strokeDasharray = "5 3"
  } else if (isIncompatible) {
    strokeColor = "var(--color-heatmap-yellow)"
    strokeDasharray = "5 3"
  }

  if (selected) {
    strokeWidth = 2.5
    if (!heatmapEnabled && !isIncompatible) strokeColor = "var(--archie-accent)"
  }

  // Shift protocol label up when incompatibility warning is also present at (labelX, labelY)
  const protocolLabelBaseY = isIncompatible ? labelY - LABEL_INCOMPATIBILITY_OFFSET : labelY

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          transition: "stroke 300ms ease, stroke-width 300ms ease",
        }}
        data-testid="archie-edge"
      />
      {heatmapEnabled && animationsEnabled && edgeHeatmapStatus && edgeHeatmapStatus in HEATMAP_COLORS && (
        <EdgeParticles edgePath={edgePath} density={density} status={healthStatus} edgeId={id} />
      )}
      {isIncompatible && (
        <EdgeLabelRenderer>
          <div
            data-testid="archie-edge-label"
            className="pointer-events-auto nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <ConnectionWarning reason={data?.incompatibilityReason ?? null} />
          </div>
        </EdgeLabelRenderer>
      )}
      {/* MUST CHECK #7: connectionProps.protocol is library-sourced; React JSX auto-escaping prevents injection (TD-4-3b AC-3) */}
      {connectionProps && (
        <EdgeLabelRenderer>
          <div
            data-testid={`edge-label-${id}`}
            className="pointer-events-auto nodrag nopan absolute cursor-grab select-none rounded bg-panel px-1.5 py-0.5 text-[10px] text-text-secondary shadow-sm border border-archie-border"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX + displayOffset.x}px, ${protocolLabelBaseY + displayOffset.y}px)`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {connectionProps.protocol}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
