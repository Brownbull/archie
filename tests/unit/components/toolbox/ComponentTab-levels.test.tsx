import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { useUiStore } from "@/stores/uiStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { Component } from "@/schemas/componentSchema"

// One block per tier: beginner (relational-db), intermediate (message-queue), advanced (event-stream).
const mk = (over: Partial<Component>): Component => ({
  id: "x", name: "X", category: "data-storage", typeId: "relational-db",
  description: "d", is: "is", gain: ["g"], cost: ["c"], tags: ["t"],
  baseMetrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }],
  configVariants: [{ id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 3, category: "performance" }] }],
  ...over,
})

const components: Component[] = [
  mk({ id: "postgresql", name: "PostgreSQL", category: "data-storage", typeId: "relational-db" }),
  mk({ id: "rabbitmq", name: "RabbitMQ", category: "messaging", typeId: "message-queue", tags: ["queue"] }),
  mk({ id: "kafka", name: "Kafka", category: "messaging", typeId: "event-stream", tags: ["kafka", "stream"] }),
]

vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: vi.fn(() => ({
    isReady: true,
    components,
    getComponentById: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn((query: string) => {
      const lower = query.toLowerCase()
      return components.filter(
        (c) => c.name.toLowerCase().includes(lower) || c.tags.some((t) => t.toLowerCase().includes(lower)),
      )
    }),
  })),
}))

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    isInitialized: () => true,
    getAllComponents: () => [],
    getComponent: vi.fn(() => undefined),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
    reset: vi.fn(),
  },
}))

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn(() => ({ isCompatible: true, reason: "" })),
}))

vi.mock("@/hooks/usePathwaySuggestions", () => ({
  usePathwaySuggestions: vi.fn(() => ({ suggestions: [], hasGaps: false, nextTierName: null })),
}))

describe("ComponentTab — experience-level gating (P86)", () => {
  beforeEach(() => {
    useUiStore.setState({ searchQuery: "", selectedNodeId: null })
    useChallengeStore.setState({ activeChallenge: null })
    usePreferencesStore.setState({ blockLevel: "beginner" })
  })

  it("at beginner level, above-level blocks are hidden behind the advanced drawer", () => {
    render(<ComponentTab />)
    // Beginner block shows in its category section.
    expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
    // Intermediate + advanced blocks are NOT in category sections.
    expect(screen.queryByTestId("type-block-message-queue")).toBeNull()
    expect(screen.queryByTestId("type-block-event-stream")).toBeNull()
    // The advanced drawer exists and counts both hidden blocks, collapsed by default.
    const toggle = screen.getByTestId("advanced-blocks-toggle")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(within(toggle).getByText("(2)")).toBeInTheDocument()
  })

  it("expanding the advanced drawer reveals the above-level blocks", () => {
    render(<ComponentTab />)
    fireEvent.click(screen.getByTestId("advanced-blocks-toggle"))
    expect(screen.getByTestId("advanced-blocks-toggle")).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByTestId("type-block-message-queue")).toBeInTheDocument()
    expect(screen.getByTestId("type-block-event-stream")).toBeInTheDocument()
  })

  it("at intermediate level, intermediate surfaces and only advanced stays in the drawer", () => {
    usePreferencesStore.setState({ blockLevel: "intermediate" })
    render(<ComponentTab />)
    expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
    expect(screen.getByTestId("type-block-message-queue")).toBeInTheDocument()
    expect(screen.queryByTestId("type-block-event-stream")).toBeNull()
    // only event-stream remains advanced
    expect(within(screen.getByTestId("advanced-blocks-toggle")).getByText("(1)")).toBeInTheDocument()
  })

  it("at advanced level, all blocks show and there is no advanced drawer", () => {
    usePreferencesStore.setState({ blockLevel: "advanced" })
    render(<ComponentTab />)
    expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
    expect(screen.getByTestId("type-block-message-queue")).toBeInTheDocument()
    expect(screen.getByTestId("type-block-event-stream")).toBeInTheDocument()
    expect(screen.queryByTestId("advanced-blocks-toggle")).toBeNull()
  })

  it("search bypasses level gating entirely (no drawer, advanced match shown)", () => {
    useUiStore.setState({ searchQuery: "kafka" })
    render(<ComponentTab />)
    expect(screen.getByTestId("type-block-event-stream")).toBeInTheDocument()
    expect(screen.queryByTestId("advanced-blocks-toggle")).toBeNull()
  })
})
