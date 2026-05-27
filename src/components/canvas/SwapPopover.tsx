import { memo, useMemo } from "react"
import { ArrowRightLeft } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { componentLibrary } from "@/services/componentLibrary"
import { Z_INDEX } from "@/lib/constants"

function SwapPopoverComponent() {
	const swapTarget = useUiStore((s) => s.swapTargetNodeId)
	const clearSwapTarget = useUiStore((s) => s.clearSwapTarget)
	const swapNodeComponent = useArchitectureStore((s) => s.swapNodeComponent)

	const node = useArchitectureStore((s) =>
		swapTarget ? s.nodes.find((n) => n.id === swapTarget) : undefined,
	)

	const alternatives = useMemo(() => {
		if (!node) return []
		return componentLibrary
			.getComponentsByCategory(node.data.componentCategory)
			.filter((c) => c.id !== node.data.archieComponentId && c.configVariants.length > 0)
	}, [node])

	if (!swapTarget || !node || alternatives.length === 0) return null

	const nodeEl = document.querySelector(`[data-id="${swapTarget}"]`)
	const canvasPanel = document.querySelector('[data-testid="canvas-panel"]')
	if (!nodeEl || !canvasPanel) return null

	const nodeRect = nodeEl.getBoundingClientRect()
	const panelRect = canvasPanel.getBoundingClientRect()

	return (
		<div
			data-testid="swap-popover"
			className={`pointer-events-auto absolute rounded-lg border border-archie-border bg-panel shadow-xl ${Z_INDEX.CANVAS_OVERLAY}`}
			style={{
				left: nodeRect.left - panelRect.left + nodeRect.width + 8,
				top: nodeRect.top - panelRect.top,
				minWidth: 160,
				maxHeight: 240,
			}}
		>
			<div className="flex items-center gap-1.5 border-b border-archie-border px-3 py-2">
				<ArrowRightLeft className="h-3.5 w-3.5 text-text-secondary" />
				<span className="text-[11px] font-medium text-text-primary">Quick Replace</span>
			</div>
			<div className="overflow-y-auto p-1" style={{ maxHeight: 196 }}>
				{alternatives.map((comp) => (
					<button
						key={comp.id}
						type="button"
						data-testid={`swap-option-${comp.id}`}
						className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-primary transition-colors hover:bg-surface"
						onClick={() => {
							swapNodeComponent(swapTarget, comp.id)
							clearSwapTarget()
						}}
					>
						<span className="truncate">{comp.name}</span>
					</button>
				))}
			</div>
			<div className="border-t border-archie-border px-3 py-1.5">
				<button
					type="button"
					className="text-[10px] text-text-tertiary hover:text-text-secondary"
					onClick={clearSwapTarget}
				>
					Cancel
				</button>
			</div>
		</div>
	)
}

export const SwapPopover = memo(SwapPopoverComponent)
