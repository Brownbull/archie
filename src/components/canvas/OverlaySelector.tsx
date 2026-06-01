import { memo } from "react";
import {
	DollarSign,
	EyeOff,
	Gauge,
	GitBranch,
	Layers,
	Plug,
} from "lucide-react";
import { OVERLAY_MODES, Z_INDEX, type OverlayModeId } from "@/lib/constants";
import { useUiStore } from "@/stores/uiStore";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
	EyeOff,
	Plug,
	Gauge,
	DollarSign,
	Layers,
	GitBranch,
};

// One-line legend per overlay mode, shown under the toolbar while the mode is active so the
// architect knows what the canvas colors/edges mean (kept here, not on the shared OVERLAY_MODES const).
const OVERLAY_DESCRIPTIONS: Record<OverlayModeId, string> = {
	none: "",
	compatibility: "Edges turn red where two connected components are a poor fit.",
	performance: "Nodes shaded by latency — redder is slower.",
	cost: "Nodes shaded by monthly cost — redder is pricier.",
	tier: "Nodes shaded by how much they lift your maturity tier.",
	flow: "Edge thickness shows relative traffic volume between components.",
};

function OverlaySelectorComponent() {
	const overlayMode = useUiStore((s) => s.overlayMode);
	const setOverlayMode = useUiStore((s) => s.setOverlayMode);

	return (
		<div
			data-testid="overlay-selector"
			className={`pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 ${Z_INDEX.CANVAS_OVERLAY}`}
		>
			<div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-archie-border bg-panel/90 px-1.5 py-1 shadow-lg backdrop-blur-sm">
				<span className="mr-1 text-[0.625rem] font-medium text-text-secondary select-none">
					ALT
				</span>
				{OVERLAY_MODES.map((mode) => {
					const Icon = ICON_MAP[mode.iconName];
					const isActive = overlayMode === mode.id;
					return (
						<button
							key={mode.id}
							type="button"
							data-testid={`overlay-mode-${mode.id}`}
							className={`flex items-center gap-1 rounded px-1.5 py-1 text-[0.625rem] transition-colors ${
								isActive
									? "bg-accent text-text-primary"
									: "text-text-secondary hover:bg-surface hover:text-text-primary"
							}`}
							onClick={() =>
								setOverlayMode(
									isActive ? "none" : (mode.id as OverlayModeId),
								)
							}
							aria-label={`${mode.label} overlay`}
							aria-pressed={isActive}
							title={`${mode.label} (Alt+${mode.shortcut})`}
						>
							{Icon && <Icon className="h-3.5 w-3.5" />}
							{/* Icon-only to keep the toolbar compact (avoids crowding the scenario/failure
							    selectors when the inspector narrows the canvas). The label stays available
							    to screen readers; the hover title shows "Label (Alt+N)". The active mode
							    keeps its label visible so the current view is legible at a glance. */}
							<span className={isActive ? "" : "sr-only"}>{mode.label}</span>
						</button>
					);
				})}
			</div>
			{overlayMode !== "none" && (
				<div
					data-testid="overlay-legend"
					className="pointer-events-auto mx-auto mt-1 w-fit max-w-[260px] rounded-md border border-archie-border bg-panel/90 px-2 py-1 text-center text-[0.625rem] leading-snug text-text-secondary shadow-sm backdrop-blur-sm"
				>
					{OVERLAY_DESCRIPTIONS[overlayMode]}
				</div>
			)}
		</div>
	);
}

export const OverlaySelector = memo(OverlaySelectorComponent);
