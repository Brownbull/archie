import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// Mock useLibrary hook
const mockGetComponentsByCategory = vi.fn()
vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [],
    getComponentById: vi.fn(),
    getComponentsByCategory: mockGetComponentsByCategory,
    searchComponents: vi.fn(),
  }),
}))

// Import after mocks are set up
const { ComponentSwapper } = await import(
  "@/components/inspector/ComponentSwapper"
)

const mockComponentsInCategory = [
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
  it("renders with data-testid component-swapper when alternatives exist", () => {
    mockGetComponentsByCategory.mockReturnValue(mockComponentsInCategory)
    render(
      <ComponentSwapper
        currentComponentId="postgresql"
        currentCategory="data-storage"
        onSwapComponent={vi.fn()}
      />,
    )
    expect(screen.getByTestId("component-swapper")).toBeInTheDocument()
  })

  it("renders the Component Type label", () => {
    mockGetComponentsByCategory.mockReturnValue(mockComponentsInCategory)
    render(
      <ComponentSwapper
        currentComponentId="postgresql"
        currentCategory="data-storage"
        onSwapComponent={vi.fn()}
      />,
    )
    expect(screen.getByText("Component Type")).toBeInTheDocument()
  })

  it("renders select trigger showing current component name", () => {
    mockGetComponentsByCategory.mockReturnValue(mockComponentsInCategory)
    render(
      <ComponentSwapper
        currentComponentId="postgresql"
        currentCategory="data-storage"
        onSwapComponent={vi.fn()}
      />,
    )
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("does not render when only one component in category (no alternatives)", () => {
    mockGetComponentsByCategory.mockReturnValue([mockComponentsInCategory[0]])
    render(
      <ComponentSwapper
        currentComponentId="postgresql"
        currentCategory="data-storage"
        onSwapComponent={vi.fn()}
      />,
    )
    expect(screen.queryByTestId("component-swapper")).not.toBeInTheDocument()
  })

  it("does not call onSwapComponent on initial render", () => {
    mockGetComponentsByCategory.mockReturnValue(mockComponentsInCategory)
    const onSwap = vi.fn()
    render(
      <ComponentSwapper
        currentComponentId="postgresql"
        currentCategory="data-storage"
        onSwapComponent={onSwap}
      />,
    )
    expect(onSwap).not.toHaveBeenCalled()
  })

  it("does not render when getComponentsByCategory returns empty array", () => {
    mockGetComponentsByCategory.mockReturnValue([])
    render(
      <ComponentSwapper
        currentComponentId="postgresql"
        currentCategory="data-storage"
        onSwapComponent={vi.fn()}
      />,
    )
    expect(screen.queryByTestId("component-swapper")).not.toBeInTheDocument()
  })

  it("calls onSwapComponent with correct ID when user selects alternative", async () => {
    mockGetComponentsByCategory.mockReturnValue(mockComponentsInCategory)
    const onSwap = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentSwapper
        currentComponentId="postgresql"
        currentCategory="data-storage"
        onSwapComponent={onSwap}
      />,
    )

    // Open the select dropdown
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)

    // Select MongoDB from dropdown options
    const mongoOption = screen.getByRole("option", { name: "MongoDB" })
    await user.click(mongoOption)

    expect(onSwap).toHaveBeenCalledWith("mongodb")
  })
})
