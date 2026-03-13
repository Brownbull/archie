import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { StackDefinition } from "@/schemas/stackSchema"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

// --- Full-stack fixtures (minimal mocking — only Firebase) ---

const mockStacks: StackDefinition[] = [
  {
    id: "messaging-stack",
    name: "High-Throughput Messaging",
    description: "Kafka + Redis for event streaming",
    components: [
      { componentId: "kafka", variantId: "multi-broker", relativePosition: { x: 0, y: 0 } },
      { componentId: "redis", variantId: "cluster", relativePosition: { x: 200, y: 0 } },
      { componentId: "nginx", variantId: "load-balancer", relativePosition: { x: 100, y: -100 } },
    ],
    connections: [
      { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "pub-sub" },
      { sourceComponentIndex: 2, targetComponentIndex: 0, connectionType: "http-proxy" },
    ],
    tradeOffProfile: [
      { categoryId: "performance", categoryName: "Performance", score: 8.5, metricCount: 5, hasData: true },
      { categoryId: "reliability", categoryName: "Reliability", score: 7.0, metricCount: 4, hasData: true },
    ],
  },
]

const componentLookup: Record<string, { id: string; name: string; category: string; configVariants: { id: string; name: string }[] }> = {
  kafka: { id: "kafka", name: "Apache Kafka", category: "messaging", configVariants: [{ id: "multi-broker", name: "Multi-Broker" }] },
  redis: { id: "redis", name: "Redis", category: "caching", configVariants: [{ id: "cluster", name: "Cluster" }] },
  nginx: { id: "nginx", name: "Nginx", category: "delivery-network", configVariants: [{ id: "load-balancer", name: "Load Balancer" }] },
}

function setupMocks({ stacks = mockStacks }: { stacks?: StackDefinition[] } = {}) {
  vi.doMock("@/hooks/useLibrary", () => ({
    useLibrary: () => ({ isReady: true }),
  }))

  vi.doMock("@/services/componentLibrary", () => ({
    componentLibrary: {
      isInitialized: () => true,
      getStacks: () => stacks,
      getComponent: (id: string) => componentLookup[id],
    },
  }))
}

describe("Stacks Browse Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it("renders stack cards with resolved component names from library", async () => {
    setupMocks()
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)

    // Card renders
    expect(screen.getByTestId("stack-card-messaging-stack")).toBeInTheDocument()
    expect(screen.getByText("High-Throughput Messaging")).toBeInTheDocument()

    // Component names are resolved from library (not raw IDs)
    expect(screen.getByText("Apache Kafka")).toBeInTheDocument()
    expect(screen.getByText("Redis")).toBeInTheDocument()
    expect(screen.getByText("Nginx")).toBeInTheDocument()

    // Connection count
    expect(screen.getByText("2 connections")).toBeInTheDocument()

    // Trade-off bars render
    expect(screen.getByTestId("category-bar-performance")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-reliability")).toBeInTheDocument()
  })

  it("expanding card shows full details with variants and connections", async () => {
    setupMocks()
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)

    // Expand detail
    await userEvent.click(screen.getByTestId("stack-detail-trigger-messaging-stack"))

    // Variant names resolved
    expect(screen.getByText(/Multi-Broker/)).toBeInTheDocument()
    expect(screen.getByText(/Cluster/)).toBeInTheDocument()
    expect(screen.getByText(/Load Balancer/)).toBeInTheDocument()

    // Connection descriptions with resolved names
    expect(screen.getByText(/Apache Kafka.*→.*Redis/)).toBeInTheDocument()
    expect(screen.getByText(/Nginx.*→.*Apache Kafka/)).toBeInTheDocument()
  })

  it("stack card drag data is correctly set", async () => {
    setupMocks()
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)

    const card = screen.getByTestId("stack-card-messaging-stack")
    expect(card).toHaveAttribute("draggable", "true")

    const mockSetData = vi.fn()
    const dragEvent = new Event("dragstart", { bubbles: true }) as unknown as DragEvent
    Object.defineProperty(dragEvent, "dataTransfer", {
      value: { setData: mockSetData, effectAllowed: "" },
    })

    fireEvent(card, dragEvent)
    expect(mockSetData).toHaveBeenCalledWith("application/archie-stack", "messaging-stack")
  })

  it("empty library shows empty state", async () => {
    setupMocks({ stacks: [] })
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)
    expect(screen.getByTestId("stacks-tab-empty")).toBeInTheDocument()
  })
})
