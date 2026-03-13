import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StackCard } from "@/components/toolbox/StackCard"
import type { ResolvedStackComponent } from "@/components/toolbox/StackCard"
import type { StackDefinition } from "@/schemas/stackSchema"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

// --- Fixtures ---

const mockStack: StackDefinition = {
  id: "event-driven-messaging",
  name: "Event-Driven Messaging",
  description: "Kafka-based event streaming with Redis caching",
  components: [
    { componentId: "kafka", variantId: "multi-broker", relativePosition: { x: 0, y: 0 } },
    { componentId: "redis", variantId: "cluster", relativePosition: { x: 200, y: 0 } },
  ],
  connections: [
    { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "pub-sub" },
  ],
  tradeOffProfile: [
    { categoryId: "performance", categoryName: "Performance", score: 8.2, metricCount: 5, hasData: true },
    { categoryId: "reliability", categoryName: "Reliability", score: 7.5, metricCount: 4, hasData: true },
    { categoryId: "scalability", categoryName: "Scalability", score: 6.0, metricCount: 3, hasData: true },
    { categoryId: "security", categoryName: "Security", score: 5.5, metricCount: 2, hasData: true },
    { categoryId: "operational-complexity", categoryName: "Operational Simplicity", score: 4.0, metricCount: 3, hasData: true },
    { categoryId: "cost-efficiency", categoryName: "Cost Efficiency", score: 3.5, metricCount: 2, hasData: true },
    { categoryId: "developer-experience", categoryName: "Developer Experience", score: 7.0, metricCount: 4, hasData: true },
  ],
}

const mockResolvedComponents: ResolvedStackComponent[] = [
  { componentId: "kafka", variantId: "multi-broker", componentName: "Apache Kafka", variantName: "Multi-Broker", categoryId: "messaging" },
  { componentId: "redis", variantId: "cluster", componentName: "Redis", variantName: "Cluster", categoryId: "caching" },
]

describe("StackCard", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders with correct data-testid", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    expect(screen.getByTestId("stack-card-event-driven-messaging")).toBeInTheDocument()
  })

  it("renders stack name", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    expect(screen.getByText("Event-Driven Messaging")).toBeInTheDocument()
  })

  it("renders stack description", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    expect(screen.getByText("Kafka-based event streaming with Redis caching")).toBeInTheDocument()
  })

  it("renders component names (resolved, not raw IDs)", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    expect(screen.getByText("Apache Kafka")).toBeInTheDocument()
    expect(screen.getByText("Redis")).toBeInTheDocument()
  })

  it("renders connection count", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    expect(screen.getByText("1 connection")).toBeInTheDocument()
  })

  it("renders plural connection count", () => {
    const multiConnStack: StackDefinition = {
      ...mockStack,
      connections: [
        { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "pub-sub" },
        { sourceComponentIndex: 1, targetComponentIndex: 0, connectionType: "cache-read" },
      ],
    }
    render(<StackCard stack={multiConnStack} resolvedComponents={mockResolvedComponents} />)
    expect(screen.getByText("2 connections")).toBeInTheDocument()
  })

  it("renders trade-off profile bars for each category", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    expect(screen.getByTestId("category-bar-performance")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-reliability")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-scalability")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-security")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-operational-complexity")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-cost-efficiency")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-developer-experience")).toBeInTheDocument()
  })

  it("has draggable attribute", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    const card = screen.getByTestId("stack-card-event-driven-messaging")
    expect(card).toHaveAttribute("draggable", "true")
  })

  it("sets correct drag data on dragStart", () => {
    render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
    const card = screen.getByTestId("stack-card-event-driven-messaging")

    const mockSetData = vi.fn()
    const dragEvent = new Event("dragstart", { bubbles: true }) as unknown as DragEvent
    Object.defineProperty(dragEvent, "dataTransfer", {
      value: {
        setData: mockSetData,
        effectAllowed: "",
      },
    })

    fireEvent(card, dragEvent)

    expect(mockSetData).toHaveBeenCalledWith("application/archie-stack", "event-driven-messaging")
    expect((dragEvent as unknown as DragEvent).dataTransfer.effectAllowed).toBe("move")
  })

  describe("detail expansion", () => {
    it("does not show detail content by default", () => {
      render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
      expect(screen.queryByTestId("stack-detail-event-driven-messaging")).not.toBeInTheDocument()
    })

    it("expands detail view on trigger click", async () => {
      render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
      const trigger = screen.getByTestId("stack-detail-trigger-event-driven-messaging")
      await userEvent.click(trigger)
      expect(screen.getByTestId("stack-detail-event-driven-messaging")).toBeInTheDocument()
    })

    it("detail view shows component variant names", async () => {
      render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
      await userEvent.click(screen.getByTestId("stack-detail-trigger-event-driven-messaging"))
      expect(screen.getByText(/Multi-Broker/)).toBeInTheDocument()
      expect(screen.getByText(/Cluster/)).toBeInTheDocument()
    })

    it("detail view shows connection descriptions", async () => {
      render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
      await userEvent.click(screen.getByTestId("stack-detail-trigger-event-driven-messaging"))
      // "Apache Kafka → Redis (pub-sub)"
      expect(screen.getByText(/Apache Kafka.*→.*Redis/)).toBeInTheDocument()
      expect(screen.getByText(/pub-sub/)).toBeInTheDocument()
    })

    it("collapses detail on second click", async () => {
      render(<StackCard stack={mockStack} resolvedComponents={mockResolvedComponents} />)
      const trigger = screen.getByTestId("stack-detail-trigger-event-driven-messaging")
      await userEvent.click(trigger)
      expect(screen.getByTestId("stack-detail-event-driven-messaging")).toBeInTheDocument()
      await userEvent.click(trigger)
      expect(screen.queryByTestId("stack-detail-event-driven-messaging")).not.toBeInTheDocument()
    })
  })
})
