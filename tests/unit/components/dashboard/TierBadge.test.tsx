import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TierBadge } from "@/components/dashboard/TierBadge"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { TierResult } from "@/lib/tierDefinitions"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("sonner", () => ({
  toast: { warning: vi.fn() },
}))

const FOUNDATION_TIER: TierResult = {
  tierId: "foundation",
  tierName: "Foundation",
  tierIndex: 0,
  totalTiers: 3,
  tierColor: "bg-amber-700",
  tierTextColor: "text-amber-100",
  isMaxTier: false,
  nextTierGaps: [
    {
      requirementDescription: "Add 2 more components (currently 3, need 5)",
      currentValue: 3,
      targetValue: 5,
    },
  ],
}

const MAX_TIER: TierResult = {
  tierId: "resilient",
  tierName: "Resilient",
  tierIndex: 2,
  totalTiers: 3,
  tierColor: "bg-yellow-500",
  tierTextColor: "text-yellow-950",
  isMaxTier: true,
  nextTierGaps: [],
}

describe("TierBadge", () => {
  beforeEach(() => {
    useArchitectureStore.setState({ currentTier: null })
  })

  describe("null state (no tier)", () => {
    it("renders empty state text", () => {
      render(<TierBadge />)
      expect(screen.getByText("Add components to begin")).toBeInTheDocument()
    })

    it("renders data-testid", () => {
      render(<TierBadge />)
      expect(screen.getByTestId("tier-badge")).toBeInTheDocument()
    })
  })

  describe("tier display", () => {
    beforeEach(() => {
      useArchitectureStore.setState({ currentTier: FOUNDATION_TIER })
    })

    it("shows tier name from TierResult", () => {
      render(<TierBadge />)
      expect(screen.getByText("Foundation")).toBeInTheDocument()
    })

    it("shows progress indicator (index+1/total)", () => {
      render(<TierBadge />)
      expect(screen.getByText("1/3")).toBeInTheDocument()
    })

    it("has data-testid='tier-badge'", () => {
      render(<TierBadge />)
      expect(screen.getByTestId("tier-badge")).toBeInTheDocument()
    })

    it("has transition-colors class for smooth tier changes", () => {
      render(<TierBadge />)
      const button = screen.getByTestId("tier-badge").querySelector("button")
      expect(button?.className).toContain("transition-colors")
      expect(button?.className).toContain("duration-300")
    })
  })

  describe("detail panel expansion", () => {
    beforeEach(() => {
      useArchitectureStore.setState({ currentTier: FOUNDATION_TIER })
    })

    it("does not show detail panel by default", () => {
      render(<TierBadge />)
      expect(screen.queryByTestId("tier-detail")).not.toBeInTheDocument()
    })

    it("shows detail panel on click", () => {
      render(<TierBadge />)
      const button = screen.getByTestId("tier-badge").querySelector("button")!
      fireEvent.click(button)
      expect(screen.getByTestId("tier-detail")).toBeInTheDocument()
    })

    it("shows gap descriptions in detail panel", () => {
      render(<TierBadge />)
      const button = screen.getByTestId("tier-badge").querySelector("button")!
      fireEvent.click(button)
      expect(
        screen.getByText("Add 2 more components (currently 3, need 5)"),
      ).toBeInTheDocument()
    })

    it("hides detail panel on second click", () => {
      render(<TierBadge />)
      const button = screen.getByTestId("tier-badge").querySelector("button")!
      fireEvent.click(button)
      expect(screen.getByTestId("tier-detail")).toBeInTheDocument()
      fireEvent.click(button)
      expect(screen.queryByTestId("tier-detail")).not.toBeInTheDocument()
    })

    it("has aria-expanded attribute", () => {
      render(<TierBadge />)
      const button = screen.getByTestId("tier-badge").querySelector("button")!
      expect(button).toHaveAttribute("aria-expanded", "false")
      fireEvent.click(button)
      expect(button).toHaveAttribute("aria-expanded", "true")
    })

    it("has aria-controls attribute", () => {
      render(<TierBadge />)
      const button = screen.getByTestId("tier-badge").querySelector("button")!
      expect(button).toHaveAttribute("aria-controls", "tier-detail-panel")
    })
  })

  describe("max tier state", () => {
    beforeEach(() => {
      useArchitectureStore.setState({ currentTier: MAX_TIER })
    })

    it("shows max tier name", () => {
      render(<TierBadge />)
      expect(screen.getByText("Resilient")).toBeInTheDocument()
    })

    it("shows 'All tier requirements met' in detail panel", () => {
      render(<TierBadge />)
      const button = screen.getByTestId("tier-badge").querySelector("button")!
      fireEvent.click(button)
      expect(
        screen.getByText("All tier requirements met"),
      ).toBeInTheDocument()
    })
  })
})
