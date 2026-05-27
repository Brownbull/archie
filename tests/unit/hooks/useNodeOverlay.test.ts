import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNodeOverlay } from "@/hooks/useNodeOverlay";
import { useArchitectureStore } from "@/stores/architectureStore";
import { useUiStore } from "@/stores/uiStore";

vi.mock("@/lib/firebase", () => ({
	auth: { currentUser: null },
	db: {},
}));

vi.mock("@/services/recalculationService", () => ({
	recalculationService: {
		run: vi.fn(() => ({
			metrics: new Map(),
			propagationHops: [],
			edgeHeatmap: new Map(),
		})),
	},
}));

vi.mock("@/services/componentLibrary", () => ({
	componentLibrary: {
		isInitialized: () => true,
		getComponent: vi.fn((id: string) => {
			if (id === "redis")
				return {
					id: "redis",
					name: "Redis",
					category: "caching",
					compatibility: ["data-storage", "compute"],
					configVariants: [
						{ id: "default", name: "Default", metrics: [] },
					],
				};
			return undefined;
		}),
		getAllComponents: () => [],
		getComponentsByCategory: vi.fn(() => []),
		searchComponents: vi.fn(() => []),
		reset: vi.fn(),
	},
}));

describe("useNodeOverlay", () => {
	beforeEach(() => {
		useUiStore.setState({ overlayMode: "none" });
		useArchitectureStore.setState({
			computedMetrics: new Map(),
			heatmapColors: new Map(),
			currentTier: null,
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);
	});

	it("returns null when overlay mode is none", () => {
		const { result } = renderHook(() => useNodeOverlay("n1", "redis"));
		expect(result.current).toBeNull();
	});

	it("returns performance metric overlay", () => {
		useUiStore.setState({ overlayMode: "performance" });
		useArchitectureStore.setState({
			computedMetrics: new Map([
				[
					"n1",
					{
						nodeId: "n1",
						overallScore: 7,
						metrics: [
							{
								id: "perf-1",
								category: "performance",
								value: "high" as const,
								numericValue: 8,
							},
						],
					},
				],
			]),
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);

		const { result } = renderHook(() => useNodeOverlay("n1", "redis"));
		expect(result.current).toEqual({
			label: "Perf",
			value: "8/10",
			color: "var(--color-metric-performance)",
		});
	});

	it("returns cost metric overlay", () => {
		useUiStore.setState({ overlayMode: "cost" });
		useArchitectureStore.setState({
			computedMetrics: new Map([
				[
					"n1",
					{
						nodeId: "n1",
						overallScore: 5,
						metrics: [
							{
								id: "cost-1",
								category: "cost-efficiency",
								value: "medium" as const,
								numericValue: 5,
							},
						],
					},
				],
			]),
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);

		const { result } = renderHook(() => useNodeOverlay("n1", "redis"));
		expect(result.current).toEqual({
			label: "Cost",
			value: "5/10",
			color: "var(--color-metric-cost)",
		});
	});

	it("returns compatibility overlay with compat count", () => {
		useUiStore.setState({ overlayMode: "compatibility" });
		const { result } = renderHook(() => useNodeOverlay("n1", "redis"));
		expect(result.current).toEqual({
			label: "Compat",
			value: "2",
			color: "var(--color-metric-reliability)",
		});
	});

	it("returns tier overlay", () => {
		useUiStore.setState({ overlayMode: "tier" });
		useArchitectureStore.setState({
			currentTier: {
				tierId: "mid",
				tierName: "Growth",
				tierIndex: 1,
				totalTiers: 3,
				tierColor: "#f59e0b",
				tierTextColor: "#fff",
				nextTierGaps: [],
				isMaxTier: false,
			},
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);

		const { result } = renderHook(() => useNodeOverlay("n1", "redis"));
		expect(result.current).toEqual({
			label: "Tier",
			value: "Growth",
			color: "#f59e0b",
		});
	});

	it("returns flow overlay from heatmap status", () => {
		useUiStore.setState({ overlayMode: "flow" });
		useArchitectureStore.setState({
			heatmapColors: new Map([["n1", "warning"]]),
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);

		const { result } = renderHook(() => useNodeOverlay("n1", "redis"));
		expect(result.current).toEqual({
			label: "Flow",
			value: "warning",
			color: "var(--color-heatmap-yellow)",
		});
	});
});
