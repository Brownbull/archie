import { memo } from "react"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import { HEATMAP_COLORS } from "@/lib/constants"

interface StatusDotProps {
	status: HeatmapStatus
	animate?: boolean
}

function StatusDotComponent({ status, animate = false }: StatusDotProps) {
	const color = HEATMAP_COLORS[status]
	return (
		<span
			data-testid="status-dot"
			data-status={status}
			className={`absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-panel shadow-sm${
				animate && status === "bottleneck" ? " animate-pulse" : ""
			}`}
			style={{ backgroundColor: color }}
			role="status"
			aria-label={`Connection health: ${status}`}
		/>
	)
}

export const StatusDot = memo(StatusDotComponent)
