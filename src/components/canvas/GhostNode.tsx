import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Plus } from "lucide-react";
import { memo, useCallback } from "react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import {
	COMPONENT_CATEGORIES,
	type ComponentCategoryId,
	NODE_WIDTH,
} from "@/lib/constants";
import { useArchitectureStore } from "@/stores/architectureStore";

export interface GhostNodeData extends Record<string, unknown> {
	ghostComponentId: string;
	ghostComponentName: string;
	ghostCategory: string;
	anchorNodeId: string;
	reason: string;
	ghostPosition: { x: number; y: number };
}

type GhostNodeType = Node<GhostNodeData, "ghost">;

function GhostNodeComponent({ data }: NodeProps<GhostNodeType>) {
	const category =
		COMPONENT_CATEGORIES[data.ghostCategory as ComponentCategoryId];
	const color = category?.color ?? "var(--color-muted)";
	const IconComponent = category
		? CATEGORY_ICONS[category.iconName]
		: undefined;

	const addNode = useArchitectureStore((s) => s.addNode);
	const addEdge = useArchitectureStore((s) => s.addEdge);

	const handlePlace = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			const nodesBefore = new Set(
				useArchitectureStore.getState().nodes.map((n) => n.id),
			);
			addNode(data.ghostComponentId, data.ghostPosition);

			const placed = useArchitectureStore
				.getState()
				.nodes.find((n) => !nodesBefore.has(n.id));

			if (placed) {
				addEdge({
					source: data.anchorNodeId,
					target: placed.id,
					sourceHandle: null,
					targetHandle: null,
				});
			}
		},
		[
			data.ghostComponentId,
			data.ghostPosition,
			data.anchorNodeId,
			addNode,
			addEdge,
		],
	);

	return (
		<button
			type="button"
			data-testid="ghost-node"
			className="group relative cursor-pointer rounded-md border-2 border-dashed opacity-40 transition-all duration-200 hover:opacity-70 hover:scale-105 text-left"
			style={{
				width: `${NODE_WIDTH}px`,
				borderColor: color,
				backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
			}}
			onClick={handlePlace}
			aria-label={`Add ${data.ghostComponentName}`}
			title={data.reason}
		>
			<div
				className="h-1 w-full rounded-t-sm"
				style={{ backgroundColor: color, opacity: 0.4 }}
			/>

			<div className="flex items-center gap-2 px-3 py-2">
				{IconComponent && (
					<IconComponent
						className="h-4 w-4 shrink-0 opacity-60"
						style={{ color }}
					/>
				)}
				<span className="truncate text-xs font-medium text-text-secondary">
					{data.ghostComponentName}
				</span>
				<Plus className="ml-auto h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
			</div>

			<div className="px-3 pb-1.5 text-[0.5625rem] leading-tight text-text-tertiary line-clamp-2">
				{data.reason}
			</div>

			<Handle
				type="target"
				position={Position.Left}
				className="!h-2 !w-2 !border !border-dashed !bg-transparent"
				style={{ borderColor: color }}
			/>
			<Handle
				type="source"
				position={Position.Right}
				className="!h-2 !w-2 !border !border-dashed !bg-transparent"
				style={{ borderColor: color }}
			/>
		</button>
	);
}

export const GhostNode = memo(GhostNodeComponent);
