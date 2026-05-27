import { useMemo } from "react";
import type { OverlayModeId } from "@/lib/constants";
import { HEATMAP_COLORS } from "@/lib/constants";
import { useArchitectureStore } from "@/stores/architectureStore";
import { useUiStore } from "@/stores/uiStore";

export interface EdgeOverlayStyle {
	strokeColor: string;
	strokeWidth: number;
	strokeDasharray?: string;
}

function averageMetric(
	sourceId: string,
	targetId: string,
	categoryId: string,
	computedMetrics: ReturnType<
		typeof useArchitectureStore.getState
	>["computedMetrics"],
): number | null {
	const srcMetrics = computedMetrics.get(sourceId);
	const tgtMetrics = computedMetrics.get(targetId);
	const srcVal = srcMetrics?.metrics.find(
		(m) => m.category === categoryId,
	)?.numericValue;
	const tgtVal = tgtMetrics?.metrics.find(
		(m) => m.category === categoryId,
	)?.numericValue;
	if (srcVal == null && tgtVal == null) return null;
	if (srcVal == null) return tgtVal!;
	if (tgtVal == null) return srcVal;
	return (srcVal + tgtVal) / 2;
}

function scoreToColor(score: number): string {
	if (score >= 7) return "var(--color-heatmap-green)";
	if (score >= 4) return "var(--color-heatmap-yellow)";
	return "var(--color-heatmap-red)";
}

export function useEdgeOverlay(
	edgeId: string,
	sourceNodeId: string,
	targetNodeId: string,
	isIncompatible: boolean,
): EdgeOverlayStyle | null {
	const overlayMode = useUiStore((s) => s.overlayMode);
	const computedMetrics = useArchitectureStore((s) => s.computedMetrics);
	const currentTier = useArchitectureStore((s) => s.currentTier);
	const edgeHeatmapColors = useArchitectureStore(
		(s) => s.edgeHeatmapColors,
	);

	return useMemo(() => {
		if (overlayMode === "none") return null;

		switch (overlayMode as OverlayModeId) {
			case "performance": {
				const avg = averageMetric(
					sourceNodeId,
					targetNodeId,
					"performance",
					computedMetrics,
				);
				if (avg == null) return null;
				return {
					strokeColor: scoreToColor(avg),
					strokeWidth: 2,
				};
			}

			case "cost": {
				const avg = averageMetric(
					sourceNodeId,
					targetNodeId,
					"cost-efficiency",
					computedMetrics,
				);
				if (avg == null) return null;
				return {
					strokeColor: scoreToColor(avg),
					strokeWidth: 2,
				};
			}

			case "compatibility": {
				if (isIncompatible) {
					return {
						strokeColor: "var(--color-heatmap-yellow)",
						strokeWidth: 2,
						strokeDasharray: "5 3",
					};
				}
				return {
					strokeColor: "var(--color-heatmap-green)",
					strokeWidth: 2,
				};
			}

			case "tier": {
				if (!currentTier) return null;
				return {
					strokeColor: currentTier.tierColor,
					strokeWidth: 2,
				};
			}

			case "flow": {
				const status = edgeHeatmapColors.get(edgeId);
				if (!status) return null;
				return {
					strokeColor:
						HEATMAP_COLORS[status] ?? "var(--color-muted)",
					strokeWidth: 2,
				};
			}

			default:
				return null;
		}
	}, [
		overlayMode,
		edgeId,
		sourceNodeId,
		targetNodeId,
		isIncompatible,
		computedMetrics,
		currentTier,
		edgeHeatmapColors,
	]);
}
