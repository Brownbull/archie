import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import type { DataContextItem } from "@/lib/constants"
import { MAX_DATA_CONTEXT_ITEMS_PER_NODE } from "@/lib/constants"
import { toast } from "sonner"

// Mock dependencies — data context tests don't need component library or recalculation service
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(() => undefined),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

const mockRecalcService = vi.fn()
vi.mock("@/services/recalculationService", () => ({
  recalculationService: {
    run: (...args: unknown[]) => mockRecalcService(...args),
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

// --- Test Helpers ---

function makeItem(overrides: Partial<DataContextItem> & { id: string }): DataContextItem {
  return {
    name: "Test Item",
    accessPattern: "read-heavy",
    averageSize: "medium",
    structureType: "relational",
    ...overrides,
  }
}

function makeNode(id: string) {
  return {
    id,
    type: "archie-component" as const,
    position: { x: 0, y: 0 },
    data: {
      archieComponentId: "test-comp",
      activeConfigVariantId: "default",
      componentName: "Test",
      componentCategory: "compute" as const,
    },
  }
}

describe("architectureStore - dataContext CRUD", () => {
  beforeEach(() => {
    uuidCounter = 0
    mockRecalcService.mockReset()
    vi.mocked(toast.warning).mockClear()
    useArchitectureStore.setState({
      nodes: [],
      edges: [],
      computedMetrics: new Map(),
      heatmapColors: new Map(),
      dataContextItems: new Map(),
      constraints: [],
      constraintViolations: [],
      violationsByNodeId: new Map(),
    })
    useUiStore.setState({ selectedNodeId: null, selectedEdgeId: null })
  })

  // --- AC-1: addDataContextItem ---

  describe("addDataContextItem", () => {
    it("adds item and stores it under the nodeId", () => {
      useArchitectureStore.getState().addDataContextItem("node-1", {
        name: "Users",
        accessPattern: "read-heavy",
        averageSize: "medium",
        structureType: "relational",
      })

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")
      expect(items).toHaveLength(1)
      expect(items![0]).toEqual({
        id: expect.stringMatching(/^test-uuid-\d+$/),
        name: "Users",
        accessPattern: "read-heavy",
        averageSize: "medium",
        structureType: "relational",
      })
    })

    it("enforces limit and shows toast on overflow", () => {
      const seedItems = Array.from({ length: MAX_DATA_CONTEXT_ITEMS_PER_NODE }, (_, i) =>
        makeItem({ id: `item-${i}` }),
      )
      useArchitectureStore.setState({
        dataContextItems: new Map([["node-1", seedItems]]),
      })

      useArchitectureStore.getState().addDataContextItem("node-1", {
        name: "Overflow",
        accessPattern: "write-heavy",
        averageSize: "large",
        structureType: "simple-kv",
      })

      expect(useArchitectureStore.getState().dataContextItems.get("node-1")).toHaveLength(
        MAX_DATA_CONTEXT_ITEMS_PER_NODE,
      )
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining(String(MAX_DATA_CONTEXT_ITEMS_PER_NODE)),
      )
    })

    it("sanitizes name on add", () => {
      useArchitectureStore.getState().addDataContextItem("node-1", {
        name: "<script>alert(1)</script>UserData",
        accessPattern: "read-heavy",
        averageSize: "medium",
        structureType: "relational",
      })

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      expect(items[0].name).toBe("UserData")
      expect(items[0].name).not.toContain("<script>")
    })
  })

  // --- AC-2: updateDataContextItem ---

  describe("updateDataContextItem", () => {
    it("sanitizes name on update", () => {
      useArchitectureStore.setState({
        dataContextItems: new Map([["node-1", [makeItem({ id: "item-0", name: "Orders" })]]]),
      })

      useArchitectureStore
        .getState()
        .updateDataContextItem("node-1", "item-0", { name: "<script>alert(1)</script>Orders" })

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      expect(items[0].name).toBe("Orders")
      expect(items[0].name).not.toContain("<script>")
    })

    it("is no-op for non-existent itemId", () => {
      useArchitectureStore.setState({
        dataContextItems: new Map([["node-1", [makeItem({ id: "item-0", name: "Orders" })]]]),
      })

      useArchitectureStore
        .getState()
        .updateDataContextItem("node-1", "item-DOES-NOT-EXIST", { name: "Changed" })

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      expect(items).toHaveLength(1)
      expect(items[0].name).toBe("Orders")
    })

    it("is no-op for non-existent nodeId", () => {
      useArchitectureStore
        .getState()
        .updateDataContextItem("node-DOES-NOT-EXIST", "item-0", { name: "X" })

      expect(useArchitectureStore.getState().dataContextItems.size).toBe(0)
    })

    it("updates non-name field without triggering sanitization", () => {
      useArchitectureStore.setState({
        dataContextItems: new Map([["node-1", [makeItem({ id: "item-0", name: "Orders" })]]]),
      })

      useArchitectureStore
        .getState()
        .updateDataContextItem("node-1", "item-0", { accessPattern: "write-heavy" })

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      expect(items[0].name).toBe("Orders")
      expect(items[0].accessPattern).toBe("write-heavy")
    })
  })

  // --- AC-3: removeDataContextItem ---

  describe("removeDataContextItem", () => {
    it("removes Map key when last item is removed", () => {
      useArchitectureStore.setState({
        dataContextItems: new Map([["node-1", [makeItem({ id: "item-0" })]]]),
      })

      useArchitectureStore.getState().removeDataContextItem("node-1", "item-0")

      expect(useArchitectureStore.getState().dataContextItems.has("node-1")).toBe(false)
      expect(useArchitectureStore.getState().dataContextItems.size).toBe(0)
    })

    it("keeps Map key when other items remain", () => {
      useArchitectureStore.setState({
        dataContextItems: new Map([
          ["node-1", [makeItem({ id: "item-0", name: "A" }), makeItem({ id: "item-1", name: "B" })]],
        ]),
      })

      useArchitectureStore.getState().removeDataContextItem("node-1", "item-0")

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe("item-1")
    })

    it("is no-op for non-existent nodeId", () => {
      useArchitectureStore.getState().removeDataContextItem("node-DOES-NOT-EXIST", "item-0")
      expect(useArchitectureStore.getState().dataContextItems.size).toBe(0)
    })

    it("is no-op for non-existent itemId on existing nodeId", () => {
      useArchitectureStore.setState({
        dataContextItems: new Map([["node-1", [makeItem({ id: "item-0", name: "A" })]]]),
      })

      useArchitectureStore.getState().removeDataContextItem("node-1", "item-DOES-NOT-EXIST")

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe("item-0")
    })
  })

  // --- AC-4: removeNode / removeNodes cleanup ---

  describe("removeNode", () => {
    it("cleans up dataContextItems for removed node", () => {
      useArchitectureStore.setState({
        nodes: [makeNode("node-1"), makeNode("node-2")],
        edges: [],
        dataContextItems: new Map([
          ["node-1", [makeItem({ id: "item-0" })]],
          ["node-2", [makeItem({ id: "item-1" })]],
        ]),
      })

      useArchitectureStore.getState().removeNode("node-1")

      expect(useArchitectureStore.getState().dataContextItems.has("node-1")).toBe(false)
      expect(useArchitectureStore.getState().dataContextItems.has("node-2")).toBe(true)
      expect(useArchitectureStore.getState().dataContextItems.size).toBe(1)
    })

    it("is no-op for node with no dataContextItems", () => {
      useArchitectureStore.setState({
        nodes: [makeNode("node-1"), makeNode("node-2")],
        edges: [],
        dataContextItems: new Map([["node-2", [makeItem({ id: "item-1" })]]]),
      })

      useArchitectureStore.getState().removeNode("node-1")

      expect(useArchitectureStore.getState().dataContextItems.has("node-2")).toBe(true)
      expect(useArchitectureStore.getState().dataContextItems.size).toBe(1)
    })
  })

  describe("removeNodes", () => {
    it("cleans up dataContextItems for all removed nodes", () => {
      useArchitectureStore.setState({
        nodes: [makeNode("node-1"), makeNode("node-2")],
        edges: [],
        dataContextItems: new Map([
          ["node-1", [makeItem({ id: "item-0" })]],
          ["node-2", [makeItem({ id: "item-1" })]],
        ]),
      })

      useArchitectureStore.getState().removeNodes(["node-1", "node-2"])

      expect(useArchitectureStore.getState().dataContextItems.size).toBe(0)
    })

    it("preserves DCI for surviving nodes on partial removal", () => {
      useArchitectureStore.setState({
        nodes: [makeNode("node-1"), makeNode("node-2"), makeNode("node-3")],
        edges: [],
        dataContextItems: new Map([
          ["node-1", [makeItem({ id: "item-0" })]],
          ["node-2", [makeItem({ id: "item-1" })]],
          ["node-3", [makeItem({ id: "item-2" })]],
        ]),
      })

      useArchitectureStore.getState().removeNodes(["node-1"])

      expect(useArchitectureStore.getState().dataContextItems.has("node-1")).toBe(false)
      expect(useArchitectureStore.getState().dataContextItems.has("node-2")).toBe(true)
      expect(useArchitectureStore.getState().dataContextItems.has("node-3")).toBe(true)
      expect(useArchitectureStore.getState().dataContextItems.size).toBe(2)
    })
  })

  // --- AC-5: loadArchitecture reset ---

  describe("loadArchitecture", () => {
    it("resets dataContextItems to empty Map", () => {
      useArchitectureStore.setState({
        dataContextItems: new Map([
          ["node-1", [makeItem({ id: "item-0" })]],
          ["node-2", [makeItem({ id: "item-1" })]],
        ]),
      })

      useArchitectureStore.getState().loadArchitecture([], [])

      const dci = useArchitectureStore.getState().dataContextItems
      expect(dci).toBeInstanceOf(Map)
      expect(dci.size).toBe(0)
    })
  })
})
