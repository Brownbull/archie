import { memo, useMemo } from "react"
import { ArrowRightLeft } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { componentLibrary } from "@/services/componentLibrary"
import { Z_INDEX } from "@/lib/constants"

function SwapPopoverComponent() {
	const swapTarget = useUiStore((s) => s.swapTargetNodeId)
	const clearSwapTarget = useUiStore((s) => s.clearSwapTarget)
	const swapNodeComponent = useArchitectureStore((s) => s.swapNodeComponent)
	// S6b follow-up (Phase 2 review): same-category alternatives can cross a quest's forbidden_types
	// line (relational-db and object-storage are both data-storage) — don't OFFER a banned swap. The
	// store's swapNodeComponent guard is the hard gate; this keeps the option out of the menu.
	const forbiddenTypes = useChallengeStore((s) => s.activeChallenge?.forbiddenTypes)
	// P5-S4 (D95): restricted vendors are dropped from quick-swap offers too — unlike the dropdown
	// (which shows them locked for the lesson), a one-click swap surface offering an un-pickable
	// option is just noise. The store chokepoint backstops regardless.
	const restrictedVendors = useChallengeStore((s) => s.activeChallenge?.restrictedVendors)

	const node = useArchitectureStore((s) =>
		swapTarget ? s.nodes.find((n) => n.id === swapTarget) : undefined,
	)

	const alternatives = useMemo(() => {
		if (!node) return []
		return componentLibrary
			.getComponentsByCategory(node.data.componentCategory)
			.filter((c) => c.id !== node.data.archieComponentId && c.configVariants.length > 0)
			.filter((c) => !c.typeId || !forbiddenTypes?.includes(c.typeId))
			.filter((c) => !restrictedVendors?.includes(c.id))
	}, [node, forbiddenTypes, restrictedVendors])

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
				<span className="text-[0.6875rem] font-medium text-text-primary">Quick Replace</span>
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
					className="text-[0.625rem] text-text-tertiary hover:text-text-secondary"
					onClick={clearSwapTarget}
				>
					Cancel
				</button>
			</div>
		</div>
	)
}

export const SwapPopover = memo(SwapPopoverComponent)
