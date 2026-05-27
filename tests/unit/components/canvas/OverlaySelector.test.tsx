import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OverlaySelector } from "@/components/canvas/OverlaySelector";
import { useUiStore } from "@/stores/uiStore";

describe("OverlaySelector", () => {
	beforeEach(() => {
		useUiStore.setState({ overlayMode: "none" });
	});

	it("renders all overlay mode buttons", () => {
		render(<OverlaySelector />);
		expect(screen.getByTestId("overlay-selector")).toBeInTheDocument();
		expect(screen.getByTestId("overlay-mode-none")).toBeInTheDocument();
		expect(screen.getByTestId("overlay-mode-compatibility")).toBeInTheDocument();
		expect(screen.getByTestId("overlay-mode-performance")).toBeInTheDocument();
		expect(screen.getByTestId("overlay-mode-cost")).toBeInTheDocument();
		expect(screen.getByTestId("overlay-mode-tier")).toBeInTheDocument();
		expect(screen.getByTestId("overlay-mode-flow")).toBeInTheDocument();
	});

	it("activates overlay mode on click", () => {
		render(<OverlaySelector />);
		fireEvent.click(screen.getByTestId("overlay-mode-performance"));
		expect(useUiStore.getState().overlayMode).toBe("performance");
	});

	it("deactivates overlay mode when clicking active mode", () => {
		useUiStore.setState({ overlayMode: "performance" });
		render(<OverlaySelector />);
		fireEvent.click(screen.getByTestId("overlay-mode-performance"));
		expect(useUiStore.getState().overlayMode).toBe("none");
	});

	it("marks active mode with aria-pressed", () => {
		useUiStore.setState({ overlayMode: "cost" });
		render(<OverlaySelector />);
		expect(screen.getByTestId("overlay-mode-cost")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByTestId("overlay-mode-performance")).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});
});
