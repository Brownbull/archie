import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import { MAX_REPLICAS } from "@/lib/constants"
import { makeNode, makeEdge } from "../../helpers"

// Component library returns a minimal compute component for any id so addNode succeeds.
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => ({
      id,
      name: id,
      category: "compute",
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
    })),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

const mockRecalc = vi.fn(() => ({
  metrics: new Map(),
  edgeHeatmap: new Map(),
  propagationHops: [],
}))
vi.mock("@/services/recalculationService", () => ({
  recalculationService: { run: (...args: unknown[]) => mockRecalc(...args) },
}))

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn().mockReturnValue({ isCompatible: true, reason: null }),
}))

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("sonner", () => ({ toast: { warning: vi.fn() } }))

let uuidCounter = 0
vi.stubGlobal("crypto", { randomUUID: () => `test-uuid-${++uuidCounter}` })

function seed(replicaCount: number) {
  useArchitectureStore.setState({ nodes: [], edges: [] })
  useArchitectureStore.getState().setNodes([makeNode({ id: "n1", data: { replicaCount } })])
  mockRecalc.mockClear()
}

describe("architectureStore — replicaCount (Epic 14)", () => {
  beforeEach(() => {
    useArchitectureStore.setState({ nodes: [], edges: [] })
    mockRecalc.mockClear()
    uuidCounter = 0
  })

  it("addNode initializes replicaCount to 1", () => {
    useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(1)
  })

  it("setNodeReplicaCount updates the count and triggers recalculation", () => {
    seed(1)
    useArchitectureStore.getState().setNodeReplicaCount("n1", 3)
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(3)
    expect(mockRecalc).toHaveBeenCalledTimes(1)
  })

  it("clamps a count below MIN_REPLICAS up to 1", () => {
    seed(5)
    useArchitectureStore.getState().setNodeReplicaCount("n1", 0)
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(1)
  })

  it("clamps a count above MAX_REPLICAS down to the max", () => {
    seed(1)
    useArchitectureStore.getState().setNodeReplicaCount("n1", 999)
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(MAX_REPLICAS)
  })

  it("floors a fractional count", () => {
    seed(1)
    useArchitectureStore.getState().setNodeReplicaCount("n1", 3.9)
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(3)
  })

  it("is a no-op (no recalculation) when the clamped count is unchanged", () => {
    seed(2)
    useArchitectureStore.getState().setNodeReplicaCount("n1", 2)
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(2)
    expect(mockRecalc).not.toHaveBeenCalled()
  })

  it("ignores updates to an unknown node id", () => {
    seed(2)
    useArchitectureStore.getState().setNodeReplicaCount("does-not-exist", 7)
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(2)
    expect(mockRecalc).not.toHaveBeenCalled()
  })

  it("duplicateNode preserves the source replicaCount", () => {
    seed(4)
    const newId = useArchitectureStore.getState().duplicateNode("n1")
    const dup = useArchitectureStore.getState().nodes.find((n) => n.id === newId)
    expect(dup?.data.replicaCount).toBe(4)
  })

  it("ignores a non-finite (NaN) count without mutating state or recalculating", () => {
    seed(3)
    useArchitectureStore.getState().setNodeReplicaCount("n1", Number.NaN)
    expect(useArchitectureStore.getState().nodes[0].data.replicaCount).toBe(3)
    expect(mockRecalc).not.toHaveBeenCalled()
  })

  it("swapNodeComponent preserves replicaCount across a swap to a scalable component", () => {
    seed(4)
    useArchitectureStore.getState().swapNodeComponent("n1", "redis")
    const node = useArchitectureStore.getState().nodes[0]
    expect(node.data.archieComponentId).toBe("redis")
    expect(node.data.replicaCount).toBe(4)
  })

  describe("replica topology integration (Epic 14)", () => {
    const replicaIssues = (id: string) =>
      (useArchitectureStore.getState().topologyIssuesByNodeId.get(id) ?? []).filter(
        (i) => i.issueType === "replicas-without-lb",
      )

    it("flags 'replicas-without-lb' after replicating an LB-requiring node with no upstream LB", () => {
      useArchitectureStore.setState({ nodes: [], edges: [] })
      useArchitectureStore.getState().setNodes([
        makeNode({ id: "app", data: { componentCategory: "compute", replicaCount: 1 } }),
      ])
      useArchitectureStore.getState().setNodeReplicaCount("app", 3)
      expect(replicaIssues("app")).toHaveLength(1)
    })

    it("clears 'replicas-without-lb' when an upstream load balancer is present", () => {
      useArchitectureStore.setState({ nodes: [], edges: [] })
      useArchitectureStore.getState().setNodes([
        makeNode({ id: "lb", data: { componentCategory: "delivery-network", replicaCount: 1 } }),
        makeNode({ id: "app", data: { componentCategory: "compute", replicaCount: 1 } }),
      ])
      useArchitectureStore.getState().setEdges([makeEdge({ id: "e1", source: "lb", target: "app" })])
      useArchitectureStore.getState().setNodeReplicaCount("app", 3)
      expect(replicaIssues("app")).toHaveLength(0)
    })

    it("does not flag a read-only (data-storage) node even when replicated", () => {
      useArchitectureStore.setState({ nodes: [], edges: [] })
      useArchitectureStore.getState().setNodes([
        makeNode({ id: "db", data: { componentCategory: "data-storage", replicaCount: 1 } }),
      ])
      useArchitectureStore.getState().setNodeReplicaCount("db", 4)
      expect(replicaIssues("db")).toHaveLength(0)
    })
  })
})
