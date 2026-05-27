import type { PathwaySuggestion } from "@/engine/pathwayEngine";
import {
	CANVAS_GRID_SIZE,
	GHOST_OFFSET_X,
	GHOST_OFFSET_Y,
	GHOST_SUGGESTION_LIMIT,
} from "@/lib/constants";
import type { ArchieEdge, ArchieNode } from "@/stores/architectureStore";

export interface GhostPlacement {
	componentId: string;
	componentName: string;
	category: string;
	anchorNodeId: string;
	position: { x: number; y: number };
	reason: string;
}

function findNodesWithOpenSourceHandles(
	nodes: ArchieNode[],
	edges: ArchieEdge[],
): ArchieNode[] {
	const nodesWithOutgoingEdge = new Set(edges.map((e) => e.source));
	return nodes.filter((n) => !nodesWithOutgoingEdge.has(n.id));
}

function snapToGrid(value: number): number {
	return Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE;
}

/**
 * Computes ghost node placements for open (unconnected) source handles.
 * Each open handle gets at most one ghost suggestion from the pathway engine.
 *
 * Pure function — no store imports, no service imports, no side effects.
 * Deterministic: same inputs = same output.
 */
export function computeGhostPlacements(
	nodes: ArchieNode[],
	edges: ArchieEdge[],
	suggestions: PathwaySuggestion[],
): GhostPlacement[] {
	if (nodes.length === 0 || suggestions.length === 0) return [];

	const openNodes = findNodesWithOpenSourceHandles(nodes, edges);
	if (openNodes.length === 0) return [];

	const usedComponentIds = new Set<string>();
	const placements: GhostPlacement[] = [];

	for (const anchor of openNodes) {
		if (placements.length >= GHOST_SUGGESTION_LIMIT) break;

		const suggestion = suggestions.find(
			(s) => !usedComponentIds.has(s.componentId),
		);
		if (!suggestion) break;

		usedComponentIds.add(suggestion.componentId);

		placements.push({
			componentId: suggestion.componentId,
			componentName: suggestion.componentName,
			category: suggestion.category,
			anchorNodeId: anchor.id,
			position: {
				x: snapToGrid(anchor.position.x + GHOST_OFFSET_X),
				y: snapToGrid(anchor.position.y + GHOST_OFFSET_Y),
			},
			reason: suggestion.reason,
		});
	}

	return placements;
}
