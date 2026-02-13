import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ConfigSelector } from "@/components/inspector/ConfigSelector"
import type { ConfigVariant } from "@/types"

const mockVariants: ConfigVariant[] = [
  { id: "standard", name: "Standard", metrics: [] },
  { id: "high-perf", name: "High Performance", metrics: [] },
  { id: "cost-opt", name: "Cost Optimized", metrics: [] },
]

const singleVariant: ConfigVariant[] = [
  { id: "default", name: "Default", metrics: [] },
]

describe("ConfigSelector", () => {
  it("renders with data-testid", () => {
    render(
      <ConfigSelector
        variants={mockVariants}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId("config-selector")).toBeInTheDocument()
  })

  it("renders the configuration label", () => {
    render(
      <ConfigSelector
        variants={mockVariants}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
      />,
    )
    expect(screen.getByText("Configuration")).toBeInTheDocument()
  })

  it("renders the select trigger with current variant name", () => {
    render(
      <ConfigSelector
        variants={mockVariants}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
      />,
    )
    // Radix Select renders the value inside the trigger
    expect(screen.getByText("Standard")).toBeInTheDocument()
  })

  it("renders with single variant", () => {
    render(
      <ConfigSelector
        variants={singleVariant}
        activeVariantId="default"
        onVariantChange={vi.fn()}
      />,
    )
    expect(screen.getByText("Default")).toBeInTheDocument()
  })

  it("does not call onVariantChange on initial render", () => {
    const onChange = vi.fn()
    render(
      <ConfigSelector
        variants={mockVariants}
        activeVariantId="standard"
        onVariantChange={onChange}
      />,
    )
    expect(onChange).not.toHaveBeenCalled()
  })
})
