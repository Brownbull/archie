import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import type { ArchieEdge as ArchieEdgeType } from "@/stores/architectureStore"
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

  const isIncompatible = data?.isIncompatible ?? false

  let strokeColor = "var(--archie-border)"
  let strokeWidth = 1.5
  let strokeDasharray: string | undefined

  if (isIncompatible) {
    strokeColor = "var(--color-heatmap-yellow)"
    strokeDasharray = "5 3"
  }

  if (selected) {
    strokeColor = isIncompatible
      ? "var(--color-heatmap-yellow)"
      : "var(--archie-accent)"
    strokeWidth = 2.5
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
