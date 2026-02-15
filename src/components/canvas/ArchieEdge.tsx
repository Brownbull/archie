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
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)

  const isIncompatible = data?.isIncompatible ?? false

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
    </>
  )
}
