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
import { HEATMAP_COLORS } from "@/lib/constants"
import { ConnectionWarning } from "@/components/canvas/ConnectionWarning"
import { componentLibrary } from "@/services/componentLibrary"

export function ArchieEdge({
  id,
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

  const isIncompatible = data?.isIncompatible ?? false
  const currentLabelOffset = data?.labelOffset ?? { x: 0, y: 0 }

  // Look up source component's connectionProperties for protocol label
  const sourceComponentId = data?.sourceArchieComponentId ?? ""
  const sourceComponent = sourceComponentId
    ? componentLibrary.getComponent(sourceComponentId)
    : undefined
  const connectionProps = sourceComponent?.connectionProperties

  // Drag state for label repositioning (AC-ARCH-PATTERN-5)
  const [dragState, setDragState] = useState<{
    startX: number
    startY: number
    originOffset: { x: number; y: number }
  } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      originOffset: { ...currentLabelOffset },
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return
    const dx = e.clientX - dragState.startX
    const dy = e.clientY - dragState.startY
    updateEdgeLabelOffset(id, {
      x: dragState.originOffset.x + dx,
      y: dragState.originOffset.y + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragState(null)
  }

  const handlePointerCancel = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
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
  const LABEL_INCOMPATIBILITY_OFFSET = 16
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
      {connectionProps && (
        <EdgeLabelRenderer>
          <div
            data-testid={`edge-label-${id}`}
            className="pointer-events-auto nodrag nopan absolute cursor-grab select-none rounded bg-panel px-1.5 py-0.5 text-[10px] text-text-secondary shadow-sm border border-archie-border"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX + currentLabelOffset.x}px, ${protocolLabelBaseY + currentLabelOffset.y}px)`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {connectionProps.protocol}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
