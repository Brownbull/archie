import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ComponentIcon } from "@/components/common/ComponentIcon"

describe("ComponentIcon (Epic 17 polish)", () => {
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
