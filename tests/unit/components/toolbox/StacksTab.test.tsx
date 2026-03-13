import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { StackDefinition } from "@/schemas/stackSchema"

// --- Hoisted mocks ---

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

// --- Stack fixtures ---

const mockStackA: StackDefinition = {
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

const mockStackB: StackDefinition = {
  id: "api-gateway-stack",
  name: "API Gateway Stack",
  description: "Nginx + Node.js with Redis caching layer",
  components: [
    { componentId: "nginx", variantId: "reverse-proxy", relativePosition: { x: 0, y: 0 } },
  ],
  connections: [],
  tradeOffProfile: [
    { categoryId: "performance", categoryName: "Performance", score: 7.0, metricCount: 3, hasData: true },
  ],
}

// --- Mock component library data for name resolution ---

const mockKafkaComponent = {
  id: "kafka",
  name: "Apache Kafka",
  category: "messaging",
  configVariants: [{ id: "multi-broker", name: "Multi-Broker" }],
}

const mockRedisComponent = {
  id: "redis",
  name: "Redis",
  category: "caching",
  configVariants: [{ id: "cluster", name: "Cluster" }],
}

const mockNginxComponent = {
  id: "nginx",
  name: "Nginx",
  category: "delivery-network",
  configVariants: [{ id: "reverse-proxy", name: "Reverse Proxy" }],
}

// --- Setup helpers ---

function setupMocks({
  isReady = true,
  stacks = [mockStackA, mockStackB],
}: {
  isReady?: boolean
  stacks?: StackDefinition[]
} = {}) {
  vi.doMock("@/hooks/useLibrary", () => ({
    useLibrary: () => ({ isReady }),
  }))

  vi.doMock("@/services/componentLibrary", () => ({
    componentLibrary: {
      isInitialized: () => isReady,
      getStacks: () => stacks,
      getComponent: (id: string) => {
        const map: Record<string, typeof mockKafkaComponent> = {
          kafka: mockKafkaComponent,
          redis: mockRedisComponent,
          nginx: mockNginxComponent,
        }
        return map[id]
      },
    },
  }))
}

function ThrowOnRender(): never {
  throw new Error("Test error")
}

// --- Tests ---

describe("StacksTab", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it("shows loading state when library is not ready", async () => {
    setupMocks({ isReady: false })
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)
    expect(screen.getByTestId("stacks-tab-loading")).toBeInTheDocument()
  })

  it("shows empty state when no stacks available", async () => {
    setupMocks({ stacks: [] })
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)
    expect(screen.getByTestId("stacks-tab-empty")).toBeInTheDocument()
    expect(screen.getByText(/no technology stacks available/i)).toBeInTheDocument()
  })

  it("renders stack cards for each stack", async () => {
    setupMocks()
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)
    expect(screen.getByTestId("stack-card-event-driven-messaging")).toBeInTheDocument()
    expect(screen.getByTestId("stack-card-api-gateway-stack")).toBeInTheDocument()
  })

  it("each card shows stack name", async () => {
    setupMocks()
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)
    expect(screen.getByText("Event-Driven Messaging")).toBeInTheDocument()
    expect(screen.getByText("API Gateway Stack")).toBeInTheDocument()
  })

  it("resolves component names from library (not raw IDs)", async () => {
    setupMocks()
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)
    expect(screen.getByText("Apache Kafka")).toBeInTheDocument()
    expect(screen.getByText("Redis")).toBeInTheDocument()
    expect(screen.getByText("Nginx")).toBeInTheDocument()
  })

  it("falls back to componentId when library lookup returns undefined", async () => {
    const stackWithUnknown: StackDefinition = {
      ...mockStackA,
      id: "unknown-stack",
      components: [
        { componentId: "unknown-comp", variantId: "default", relativePosition: { x: 0, y: 0 } },
      ],
      connections: [],
    }
    setupMocks({ stacks: [stackWithUnknown] })
    const { StacksTab } = await import("@/components/toolbox/StacksTab")
    render(<StacksTab />)
    expect(screen.getByText("unknown-comp")).toBeInTheDocument()
  })

  it("StacksErrorBoundary renders error fallback when a child throws", async () => {
    const { StacksErrorBoundary } = await import("@/components/toolbox/StacksTab")
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    try {
      render(
        <StacksErrorBoundary>
          <ThrowOnRender />
        </StacksErrorBoundary>,
      )
      const errorEl = screen.getByTestId("stacks-tab-error")
      expect(errorEl).toBeInTheDocument()
      expect(errorEl).toHaveTextContent("Could not load stacks. Try refreshing the page.")
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
