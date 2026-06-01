import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ComponentIcon } from "@/components/common/ComponentIcon"
import { usePreferencesStore } from "@/stores/preferencesStore"

describe("ComponentIcon (Epic 17 polish)", () => {
  // The icon-set toggle is global; pin it to pixel so these legacy assertions hold regardless of
  // test order (the official-set block below flips it).
  beforeEach(() => {
    usePreferencesStore.setState({ iconSet: "pixel" })
  })

  it("renders the pixel-art icon for a component that has one", () => {
    const { container } = render(<ComponentIcon componentId="postgresql" category="data-storage" className="h-4 w-4" />)
    const img = screen.getByTestId("component-pixel-icon")
    expect(img).toHaveAttribute("src", "/icons/postgresql.png")
    expect(img).toHaveClass("h-4", "w-4")
    expect(img).toHaveStyle({ imageRendering: "pixelated" })
    expect(container.querySelector("svg")).toBeNull() // no lucide fallback when a pixel icon exists
  })

  it("falls back to the lucide category icon (tinted) when no pixel icon exists", () => {
    const { container } = render(<ComponentIcon componentId="no-icon-component" category="compute" className="h-4 w-4" />)
    expect(screen.queryByTestId("component-pixel-icon")).not.toBeInTheDocument()
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass("h-4", "w-4")
  })
})

describe("ComponentIcon — official icon set", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ iconSet: "official" })
  })

  it("renders the official vendor logo for a mapped id (not the pixel PNG)", () => {
    render(<ComponentIcon componentId="aws-lambda" category="compute" className="h-4 w-4" />)
    expect(screen.getByTestId("component-logo-icon")).toBeInTheDocument()
    expect(screen.queryByTestId("component-pixel-icon")).not.toBeInTheDocument()
  })

  it("falls back to the lucide category icon for an id with no brand logo", () => {
    const { container } = render(<ComponentIcon componentId="keycloak" category="auth-security" className="h-4 w-4" />)
    expect(screen.queryByTestId("component-logo-icon")).not.toBeInTheDocument()
    expect(screen.queryByTestId("component-pixel-icon")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})
