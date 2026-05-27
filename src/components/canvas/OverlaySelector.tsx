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

function OverlaySelectorComponent() {
	const overlayMode = useUiStore((s) => s.overlayMode);
	const setOverlayMode = useUiStore((s) => s.setOverlayMode);

	return (
		<div
			data-testid="overlay-selector"
			className={`pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 ${Z_INDEX.CANVAS_OVERLAY}`}
		>
			<div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-archie-border bg-panel/90 px-1.5 py-1 shadow-lg backdrop-blur-sm">
				<span className="mr-1 text-[10px] font-medium text-text-secondary select-none">
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
							className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition-colors ${
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
							<span className="hidden sm:inline">{mode.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export const OverlaySelector = memo(OverlaySelectorComponent);
