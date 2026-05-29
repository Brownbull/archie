import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import { MAX_REPLICAS } from "@/lib/constants"
import { makeNode } from "../../helpers"

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
})
