import { useMemo } from "react";
import type { OverlayModeId } from "@/lib/constants";
import { METRIC_CATEGORIES } from "@/lib/constants";
import { useArchitectureStore } from "@/stores/architectureStore";
import { useUiStore } from "@/stores/uiStore";
import { componentLibrary } from "@/services/componentLibrary";

export interface NodeOverlayInfo {
	label: string;
	value: string;
	color: string;
}

function getMetricOverlay(
	nodeId: string,
	categoryId: string,
	computedMetrics: ReturnType<
		typeof useArchitectureStore.getState
	>["computedMetrics"],
): NodeOverlayInfo | null {
	const nodeMetrics = computedMetrics.get(nodeId);
	if (!nodeMetrics) return null;

	const metric = nodeMetrics.metrics.find((m) => m.category === categoryId);
	if (!metric) return null;

	const category = METRIC_CATEGORIES.find((c) => c.id === categoryId);
	return {
		label: category?.shortName ?? categoryId,
		value: `${metric.numericValue}/10`,
		color: category?.color ?? "var(--color-muted)",
	};
}

export function useNodeOverlay(
	nodeId: string,
	archieComponentId: string,
): NodeOverlayInfo | null {
	const overlayMode = useUiStore((s) => s.overlayMode);
	const computedMetrics = useArchitectureStore((s) => s.computedMetrics);
	const currentTier = useArchitectureStore((s) => s.currentTier);
	const heatmapColors = useArchitectureStore((s) => s.heatmapColors);

	return useMemo(() => {
		if (overlayMode === "none") return null;

		switch (overlayMode as OverlayModeId) {
			case "performance":
				return getMetricOverlay(nodeId, "performance", computedMetrics);

			case "cost":
				return getMetricOverlay(nodeId, "cost-efficiency", computedMetrics);

			case "compatibility": {
				const comp = componentLibrary.getComponent(archieComponentId);
				if (!comp) return null;
				const compatCount = comp.compatibility?.length ?? 0;
				return {
					label: "Compat",
					value: `${compatCount}`,
					color: "var(--color-metric-reliability)",
				};
			}

			case "tier": {
				if (!currentTier) return null;
				return {
					label: "Tier",
					value: currentTier.tierName,
					color: currentTier.tierColor,
				};
			}

			case "flow": {
				const status = heatmapColors.get(nodeId);
				if (!status) return null;
				const flowColors: Record<string, string> = {
					healthy: "var(--color-heatmap-green)",
					warning: "var(--color-heatmap-yellow)",
					bottleneck: "var(--color-heatmap-red)",
				};
				return {
					label: "Flow",
					value: status,
					color: flowColors[status] ?? "var(--color-muted)",
				};
			}

			default:
				return null;
		}
	}, [
		overlayMode,
		nodeId,
		archieComponentId,
		computedMetrics,
		currentTier,
		heatmapColors,
	]);
}
