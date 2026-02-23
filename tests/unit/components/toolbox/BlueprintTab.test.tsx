import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { BlueprintFull } from "@/schemas/blueprintSchema"

// --- Hoisted mocks ---

const { mockHydrate, mockLoadArchitecture } = vi.hoisted(() => ({
  mockHydrate: vi.fn(),
  mockLoadArchitecture: vi.fn(),
}))

vi.mock("@/services/yamlImporter", () => ({
  hydrateArchitectureSkeleton: mockHydrate,
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

// --- Blueprint fixtures ---

const mockBlueprintWA: BlueprintFull = {
  id: "whatsapp-messaging",
  name: "WhatsApp-style Messaging",
  description: "High-throughput messaging with Kafka and Redis",
  skeleton: {
    schemaVersion: "1.0.0",
    nodes: [
      { id: "n1", componentId: "nginx", configVariantId: "load-balancer", position: { x: 96, y: 192 } },
      { id: "n2", componentId: "kafka", configVariantId: "multi-broker", position: { x: 320, y: 192 } },
    ],
    edges: [{ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" }],
  },
}

const mockBlueprintTG: BlueprintFull = {
  id: "telegram-messaging",
  name: "Telegram-style Messaging",
  description: "Operational simplicity with RabbitMQ",
  skeleton: {
    schemaVersion: "1.0.0",
    nodes: [
      { id: "n1", componentId: "nginx", configVariantId: "reverse-proxy", position: { x: 96, y: 192 } },
    ],
    edges: [],
  },
}

// --- Mock setup helpers (called in each describe) ---

function setupMocks({
  isReady = true,
  blueprints = [mockBlueprintWA, mockBlueprintTG],
  existingNodes = [] as unknown[],
}: {
  isReady?: boolean
  blueprints?: BlueprintFull[]
  existingNodes?: unknown[]
} = {}) {
  vi.doMock("@/hooks/useLibrary", () => ({
    useLibrary: () => ({ isReady }),
  }))

  vi.doMock("@/services/componentLibrary", () => ({
    componentLibrary: {
      isInitialized: () => isReady,
      getAllBlueprints: () => blueprints,
      getComponent: vi.fn(),
    },
  }))

  vi.doMock("@/stores/architectureStore", () => ({
    useArchitectureStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ nodes: existingNodes, loadArchitecture: mockLoadArchitecture }),
  }))
}

// --- Tests ---

describe("BlueprintTab", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
    mockHydrate.mockReturnValue({
      success: true,
      architecture: { nodes: [], edges: [], placeholderIds: [] },
    })
  })

  it("shows loading state when library is not ready", async () => {
    setupMocks({ isReady: false })
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    expect(screen.getByTestId("blueprint-tab-loading")).toBeInTheDocument()
  })

  it("shows empty state when no blueprints available", async () => {
    setupMocks({ blueprints: [] })
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    expect(screen.getByTestId("blueprint-tab-empty")).toBeInTheDocument()
    expect(screen.getByText(/no example architectures/i)).toBeInTheDocument()
  })

  it("renders blueprint cards for each blueprint", async () => {
    setupMocks()
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    const cards = screen.getAllByTestId("blueprint-card")
    expect(cards).toHaveLength(2)
  })

  it("each card shows blueprint name", async () => {
    setupMocks()
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    expect(screen.getByText("WhatsApp-style Messaging")).toBeInTheDocument()
    expect(screen.getByText("Telegram-style Messaging")).toBeInTheDocument()
  })

  it("each card shows blueprint description", async () => {
    setupMocks()
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    expect(screen.getByText("High-throughput messaging with Kafka and Redis")).toBeInTheDocument()
  })

  it("each card shows component count from skeleton.nodes.length", async () => {
    setupMocks()
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    // WA has 2 nodes, TG has 1 node
    expect(screen.getByText("2 components")).toBeInTheDocument()
    expect(screen.getByText("1 component")).toBeInTheDocument()
  })

  it("renders a Load button on each card", async () => {
    setupMocks()
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    expect(screen.getAllByTestId("blueprint-load-button")).toHaveLength(2)
  })

  it("clicking Load on empty canvas calls loadArchitecture directly (no dialog)", async () => {
    setupMocks({ existingNodes: [] })
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    const loadButtons = screen.getAllByTestId("blueprint-load-button")
    fireEvent.click(loadButtons[0])
    expect(mockHydrate).toHaveBeenCalledWith(mockBlueprintWA.skeleton)
    expect(mockLoadArchitecture).toHaveBeenCalledTimes(1)
  })

  it("clicking Load on non-empty canvas shows confirmation dialog", async () => {
    setupMocks({ existingNodes: [{ id: "existing" }] })
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    const loadButtons = screen.getAllByTestId("blueprint-load-button")
    fireEvent.click(loadButtons[0])
    expect(mockLoadArchitecture).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("confirming dialog loads the blueprint", async () => {
    setupMocks({ existingNodes: [{ id: "existing" }] })
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    const loadButtons = screen.getAllByTestId("blueprint-load-button")
    fireEvent.click(loadButtons[0])
    const confirmButton = screen.getByRole("button", { name: /load/i })
    fireEvent.click(confirmButton)
    expect(mockHydrate).toHaveBeenCalledWith(mockBlueprintWA.skeleton)
    expect(mockLoadArchitecture).toHaveBeenCalledTimes(1)
  })

  it("cancelling dialog does not load the blueprint", async () => {
    setupMocks({ existingNodes: [{ id: "existing" }] })
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    const loadButtons = screen.getAllByTestId("blueprint-load-button")
    fireEvent.click(loadButtons[0])
    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    fireEvent.click(cancelButton)
    expect(mockLoadArchitecture).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows error banner when hydration fails and does not call loadArchitecture", async () => {
    mockHydrate.mockReturnValue({ success: false, errors: ["Component not found: unknown-component"] })
    setupMocks()
    const { BlueprintTab } = await import("@/components/toolbox/BlueprintTab")
    render(<BlueprintTab />)
    const loadButtons = screen.getAllByTestId("blueprint-load-button")
    fireEvent.click(loadButtons[0])
    expect(mockLoadArchitecture).not.toHaveBeenCalled()
    expect(screen.getByTestId("blueprint-load-error")).toBeInTheDocument()
  })
})
