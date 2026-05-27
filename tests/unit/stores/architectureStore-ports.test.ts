import { describe, expect, it, beforeEach, vi } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"

const { testComponentMap } = vi.hoisted(() => {
  type TestComponent = {
    id: string
    name: string
    category: string
    description: string
    is: string
    gain: string[]
    cost: string[]
    tags: string[]
    baseMetrics: never[]
    configVariants: { id: string; name: string; metrics: never[] }[]
    compatibility?: Record<string, string>
    ports?: { id: string; type: string; direction: "in" | "out" }[]
  }

  function buildComponent(overrides: Partial<TestComponent> & { id: string }): TestComponent {
    return {
      name: "Test Component",
      category: "compute",
      description: "A test component",
      is: "A test component",
      gain: [],
      cost: [],
      tags: [],
      baseMetrics: [],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
      ...overrides,
    }
  }

  const map = new Map<string, TestComponent>()
  map.set("node-express", buildComponent({
    id: "node-express",
    name: "Node Express",
    category: "compute",
    ports: [
      { id: "http-in", type: "http", direction: "in" },
      { id: "http-out", type: "http", direction: "out" },
      { id: "db-out", type: "database", direction: "out" },
      { id: "cache-out", type: "cache", direction: "out" },
      { id: "monitor-out", type: "monitor", direction: "out" },
    ],
  }))
  map.set("postgresql", buildComponent({
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    ports: [
      { id: "db-in", type: "database", direction: "in" },
      { id: "monitor-out", type: "monitor", direction: "out" },
    ],
  }))
  map.set("nginx", buildComponent({
    id: "nginx",
    name: "Nginx",
    category: "delivery-network",
    ports: [
      { id: "http-in", type: "http", direction: "in" },
      { id: "http-out", type: "http", direction: "out" },
    ],
  }))
  map.set("redis", buildComponent({
    id: "redis",
    name: "Redis",
    category: "caching",
    ports: [
      { id: "cache-in", type: "cache", direction: "in" },
      { id: "cache-out", type: "cache", direction: "out" },
    ],
  }))
  return { testComponentMap: map }
})

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => testComponentMap.get(id)),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("sonner", () => ({
  toast: { warning: vi.fn() },
}))

let uuidCounter = 0
vi.stubGlobal("crypto", {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
})

describe("architectureStore — port-aware edge creation", () => {
  beforeEach(() => {
    uuidCounter = 0
    useArchitectureStore.setState({
      nodes: [],
      edges: [],
      computedMetrics: new Map(),
      previousMetrics: new Map(),
      heatmapColors: new Map(),
      edgeHeatmapColors: new Map(),
      rippleActiveNodeIds: new Set(),
      recalcGeneration: 0,
      currentTier: null,
      constraintViolations: [],
      violationsByNodeId: new Map(),
      dataContextItems: new Map(),
      activeScenarioId: null,
      activeFailureScenarioId: null,
    })
  })

  it("stores sourceHandleId and targetHandleId on edge data", () => {
    useArchitectureStore.getState().addNode("node-express", { x: 0, y: 0 })
    useArchitectureStore.getState().addNode("postgresql", { x: 200, y: 0 })
    const nodes = useArchitectureStore.getState().nodes
    useArchitectureStore.getState().addEdge({
      source: nodes[0].id,
      target: nodes[1].id,
      sourceHandle: "db-out",
      targetHandle: "db-in",
    })
    const edge = useArchitectureStore.getState().edges[0]
    expect(edge.data?.sourceHandleId).toBe("db-out")
    expect(edge.data?.targetHandleId).toBe("db-in")
    expect(edge.sourceHandle).toBe("db-out")
    expect(edge.targetHandle).toBe("db-in")
  })

  it("stores null handle IDs when no handles provided", () => {
    useArchitectureStore.getState().addNode("node-express", { x: 0, y: 0 })
    useArchitectureStore.getState().addNode("postgresql", { x: 200, y: 0 })
    const nodes = useArchitectureStore.getState().nodes
    useArchitectureStore.getState().addEdge({
      source: nodes[0].id,
      target: nodes[1].id,
      sourceHandle: null,
      targetHandle: null,
    })
    const edge = useArchitectureStore.getState().edges[0]
    expect(edge.data?.sourceHandleId).toBeNull()
    expect(edge.data?.targetHandleId).toBeNull()
    expect(edge.data?.isPortMismatch).toBe(false)
  })

  it("detects port type mismatch between http-out and db-in", () => {
    useArchitectureStore.getState().addNode("node-express", { x: 0, y: 0 })
    useArchitectureStore.getState().addNode("postgresql", { x: 200, y: 0 })
    const nodes = useArchitectureStore.getState().nodes
    useArchitectureStore.getState().addEdge({
      source: nodes[0].id,
      target: nodes[1].id,
      sourceHandle: "http-out",
      targetHandle: "db-in",
    })
    const edge = useArchitectureStore.getState().edges[0]
    expect(edge.data?.isPortMismatch).toBe(true)
    expect(edge.data?.isIncompatible).toBe(true)
    expect(edge.data?.incompatibilityReason).toContain("Port type mismatch")
  })

  it("marks compatible port connection (db-out → db-in) as not mismatched", () => {
    useArchitectureStore.getState().addNode("node-express", { x: 0, y: 0 })
    useArchitectureStore.getState().addNode("postgresql", { x: 200, y: 0 })
    const nodes = useArchitectureStore.getState().nodes
    useArchitectureStore.getState().addEdge({
      source: nodes[0].id,
      target: nodes[1].id,
      sourceHandle: "db-out",
      targetHandle: "db-in",
    })
    const edge = useArchitectureStore.getState().edges[0]
    expect(edge.data?.isPortMismatch).toBe(false)
  })

  it("falls back gracefully when handles are null (legacy connections)", () => {
    useArchitectureStore.getState().addNode("nginx", { x: 0, y: 0 })
    useArchitectureStore.getState().addNode("node-express", { x: 200, y: 0 })
    const nodes = useArchitectureStore.getState().nodes
    useArchitectureStore.getState().addEdge({
      source: nodes[0].id,
      target: nodes[1].id,
      sourceHandle: null,
      targetHandle: null,
    })
    const edge = useArchitectureStore.getState().edges[0]
    expect(edge.data?.isPortMismatch).toBe(false)
    expect(edge.data?.isIncompatible).toBe(false)
  })
})
