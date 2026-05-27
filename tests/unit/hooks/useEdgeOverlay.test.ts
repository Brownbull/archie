import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEdgeOverlay } from "@/hooks/useEdgeOverlay";
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
		getComponent: vi.fn(),
		getAllComponents: () => [],
		getComponentsByCategory: vi.fn(() => []),
		searchComponents: vi.fn(() => []),
		reset: vi.fn(),
	},
}));

describe("useEdgeOverlay", () => {
	beforeEach(() => {
		useUiStore.setState({ overlayMode: "none" });
		useArchitectureStore.setState({
			computedMetrics: new Map(),
			edgeHeatmapColors: new Map(),
			currentTier: null,
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);
	});

	it("returns null when overlay mode is none", () => {
		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", false),
		);
		expect(result.current).toBeNull();
	});

	it("returns performance overlay from averaged node metrics", () => {
		useUiStore.setState({ overlayMode: "performance" });
		useArchitectureStore.setState({
			computedMetrics: new Map([
				[
					"n1",
					{
						nodeId: "n1",
						overallScore: 8,
						metrics: [
							{
								id: "p1",
								category: "performance",
								value: "high" as const,
								numericValue: 8,
							},
						],
					},
				],
				[
					"n2",
					{
						nodeId: "n2",
						overallScore: 6,
						metrics: [
							{
								id: "p2",
								category: "performance",
								value: "medium" as const,
								numericValue: 6,
							},
						],
					},
				],
			]),
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);

		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", false),
		);
		expect(result.current).toEqual({
			strokeColor: "var(--color-heatmap-green)",
			strokeWidth: 2,
		});
	});

	it("returns cost overlay with low score color", () => {
		useUiStore.setState({ overlayMode: "cost" });
		useArchitectureStore.setState({
			computedMetrics: new Map([
				[
					"n1",
					{
						nodeId: "n1",
						overallScore: 3,
						metrics: [
							{
								id: "c1",
								category: "cost-efficiency",
								value: "low" as const,
								numericValue: 2,
							},
						],
					},
				],
				[
					"n2",
					{
						nodeId: "n2",
						overallScore: 3,
						metrics: [
							{
								id: "c2",
								category: "cost-efficiency",
								value: "low" as const,
								numericValue: 3,
							},
						],
					},
				],
			]),
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);

		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", false),
		);
		expect(result.current).toEqual({
			strokeColor: "var(--color-heatmap-red)",
			strokeWidth: 2,
		});
	});

	it("returns compatibility overlay — green when compatible", () => {
		useUiStore.setState({ overlayMode: "compatibility" });
		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", false),
		);
		expect(result.current).toEqual({
			strokeColor: "var(--color-heatmap-green)",
			strokeWidth: 2,
		});
	});

	it("returns compatibility overlay — dashed yellow when incompatible", () => {
		useUiStore.setState({ overlayMode: "compatibility" });
		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", true),
		);
		expect(result.current).toEqual({
			strokeColor: "var(--color-heatmap-yellow)",
			strokeWidth: 2,
			strokeDasharray: "5 3",
		});
	});

	it("returns tier overlay with tier color", () => {
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

		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", false),
		);
		expect(result.current).toEqual({
			strokeColor: "#f59e0b",
			strokeWidth: 2,
		});
	});

	it("returns flow overlay from edge heatmap", () => {
		useUiStore.setState({ overlayMode: "flow" });
		useArchitectureStore.setState({
			edgeHeatmapColors: new Map([["e1", "bottleneck"]]),
		} as Partial<ReturnType<typeof useArchitectureStore.getState>> as never);

		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", false),
		);
		expect(result.current).toEqual({
			strokeColor: "var(--color-heatmap-red)",
			strokeWidth: 2,
		});
	});

	it("returns null for flow overlay when no edge heatmap data", () => {
		useUiStore.setState({ overlayMode: "flow" });
		const { result } = renderHook(() =>
			useEdgeOverlay("e1", "n1", "n2", false),
		);
		expect(result.current).toBeNull();
	});
});
