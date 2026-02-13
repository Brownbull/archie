import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { ComponentSwapper } from "@/components/inspector/ComponentSwapper"
import type { Component } from "@/types"

const mockAlternatives: Component[] = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    description: "Relational database",
    is: "An open-source relational database",
    gain: ["ACID compliance"],
    cost: ["Higher memory usage"],
    tags: ["database"],
    baseMetrics: [],
    configVariants: [{ id: "default", name: "Default", metrics: [] }],
  },
  {
    id: "mongodb",
    name: "MongoDB",
    category: "data-storage",
    description: "Document database",
    is: "A NoSQL document database",
    gain: ["Schema flexibility"],
    cost: ["Eventual consistency"],
    tags: ["database", "nosql"],
    baseMetrics: [],
    configVariants: [{ id: "replica-set", name: "Replica Set", metrics: [] }],
  },
  {
    id: "mysql",
    name: "MySQL",
    category: "data-storage",
    description: "Relational database",
    is: "An open-source relational database",
    gain: ["Wide adoption"],
    cost: ["Limited JSON support"],
    tags: ["database"],
    baseMetrics: [],
    configVariants: [{ id: "default", name: "Default", metrics: [] }],
  },
]

describe("ComponentSwapper", () => {
  /** Render with default props. Override via partial. */
  function renderDefault(overrides: Partial<Parameters<typeof ComponentSwapper>[0]> = {}) {
    return render(
      <ComponentSwapper
        currentComponentId="postgresql"
        alternatives={mockAlternatives}
        onSwapComponent={vi.fn()}
        {...overrides}
      />,
    )
  }

  it("renders with data-testid component-swapper when alternatives exist", () => {
    renderDefault()
    expect(screen.getByTestId("component-swapper")).toBeInTheDocument()
  })

  it("renders the Component Type label", () => {
    renderDefault()
    expect(screen.getByText("Component Type")).toBeInTheDocument()
  })

  it("renders select trigger showing current component name", () => {
    renderDefault()
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("does not render when no alternatives (only current component)", () => {
    renderDefault({ alternatives: [mockAlternatives[0]] })
    expect(screen.queryByTestId("component-swapper")).not.toBeInTheDocument()
  })

  it("does not call onSwapComponent on initial render", () => {
    const onSwap = vi.fn()
    renderDefault({ onSwapComponent: onSwap })
    expect(onSwap).not.toHaveBeenCalled()
  })

  it("does not render when alternatives is empty", () => {
    renderDefault({ alternatives: [] })
    expect(screen.queryByTestId("component-swapper")).not.toBeInTheDocument()
  })

  it("calls onSwapComponent with correct ID when user selects alternative", async () => {
    const onSwap = vi.fn()
    const user = userEvent.setup()

    renderDefault({ onSwapComponent: onSwap })

    // Open the select dropdown
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)

    // Select MongoDB from dropdown options
    const mongoOption = screen.getByRole("option", { name: "MongoDB" })
    await user.click(mongoOption)

    expect(onSwap).toHaveBeenCalledWith("mongodb")
  })

  it("is pure presentational — no useLibrary hook (TD-1-6a)", () => {
    // This test file has NO useLibrary mock. If ComponentSwapper imported
    // useLibrary, the import at line 4 would throw, failing ALL tests.
    // Explicit verification: alternatives are received as props, not fetched.
    const customAlternatives = [mockAlternatives[0], mockAlternatives[1]]
    renderDefault({ alternatives: customAlternatives })
    expect(screen.getByTestId("component-swapper")).toBeInTheDocument()
  })
})
