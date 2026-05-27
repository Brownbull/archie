import type { Node } from "@xyflow/react";
import { useMemo } from "react";
import type { GhostNodeData } from "@/components/canvas/GhostNode";
import { computeGhostPlacements } from "@/engine/ghostSuggestionEngine";
import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions";
import { NODE_TYPE_GHOST } from "@/lib/constants";
import { useArchitectureStore } from "@/stores/architectureStore";

type GhostNode = Node<GhostNodeData, "ghost">;

/**
 * Computes ghost node placements reactively from canvas state + pathway suggestions.
 * Returns ReactFlow-compatible ghost nodes ready to merge into the nodes array.
 */
export function useGhostNodes(): GhostNode[] {
	const nodes = useArchitectureStore((s) => s.nodes);
	const edges = useArchitectureStore((s) => s.edges);
	const { suggestions } = usePathwaySuggestions();

	return useMemo(() => {
		const placements = computeGhostPlacements(nodes, edges, suggestions);

		return placements.map(
			(p): GhostNode => ({
				id: `ghost-${p.anchorNodeId}-${p.componentId}`,
				type: NODE_TYPE_GHOST,
				position: p.position,
				draggable: false,
				selectable: false,
				data: {
					ghostComponentId: p.componentId,
					ghostComponentName: p.componentName,
					ghostCategory: p.category,
					anchorNodeId: p.anchorNodeId,
					reason: p.reason,
					ghostPosition: p.position,
				},
			}),
		);
	}, [nodes, edges, suggestions]);
}
