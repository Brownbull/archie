import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useArchitectureStore, type ArchieEdge } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { CANVAS_GRID_SIZE, EDGE_TYPE_CONNECTION, MAX_CANVAS_NODES, NODE_TYPE_COMPONENT, NODE_WIDTH } from "@/lib/constants"

// vi.hoisted runs before imports, so we define a local factory for use inside vi.mock.
// This mirrors makeComponent from tests/helpers/factories but is self-contained for hoisting.
// IMPORTANT: If makeComponent defaults change in tests/helpers/factories.ts, update buildComponent below to match.
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
  }

  function buildComponent(overrides: Partial<TestComponent> & { id: string }): TestComponent {
    return {
      name: "Test Component",
      category: "compute",
      description: "A test component",
      is: "A test component for unit tests",
      gain: ["Test gain"],
      cost: ["Test cost"],
      tags: [],
      baseMetrics: [],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
      ...overrides,
    }
  }

  const map = new Map<string, TestComponent>()
  map.set("postgresql", buildComponent({
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    description: "Relational database",
    is: "An open-source relational database",
    gain: ["ACID compliance"],
    cost: ["Higher memory usage"],
    tags: ["database"],
  }))
  map.set("redis", buildComponent({
    id: "redis",
    name: "Redis",
    category: "caching",
    description: "In-memory cache",
    is: "An in-memory data store",
    gain: ["Low latency"],
    cost: ["Memory cost"],
    tags: ["cache"],
    compatibility: { "data-storage": "Caching layer may cause stale reads" },
  }))
  map.set("nginx", buildComponent({
    id: "nginx",
    name: "Nginx",
    category: "delivery-network",
    description: "Reverse proxy",
    is: "A reverse proxy server",
    gain: ["Load balancing"],
    cost: ["Config complexity"],
    tags: ["proxy"],
  }))
  map.set("mongodb", buildComponent({
    id: "mongodb",
    name: "MongoDB",
    category: "data-storage",
    description: "Document database",
    is: "A NoSQL document database",
    gain: ["Schema flexibility"],
    cost: ["Eventual consistency"],
    tags: ["database", "nosql"],
    configVariants: [
      { id: "replica-set", name: "Replica Set", metrics: [] },
      { id: "sharded", name: "Sharded", metrics: [] },
    ],
  }))
  map.set("empty-variants", buildComponent({
    id: "empty-variants",
    name: "Empty Variants",
    category: "data-storage",
    description: "Component with no variants",
    is: "Test component",
    gain: [],
    cost: [],
    tags: [],
    configVariants: [],
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

describe("architectureStore", () => {
  beforeEach(() => {
    uuidCounter = 0
    useArchitectureStore.setState({ nodes: [], edges: [] })
    useUiStore.setState({ selectedNodeId: null, selectedEdgeId: null })
  })

  describe("initial state", () => {
    it("has empty nodes array", () => {
      expect(useArchitectureStore.getState().nodes).toEqual([])
    })

    it("has empty edges array", () => {
      expect(useArchitectureStore.getState().edges).toEqual([])
    })
  })

  describe("addNode", () => {
    it("creates a node with correct ArchieNodeData", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 200 })
      const nodes = useArchitectureStore.getState().nodes
      expect(nodes).toHaveLength(1)
      expect(nodes[0].data).toEqual({
        archieComponentId: "postgresql",
        activeConfigVariantId: "default",
        componentName: "PostgreSQL",
        componentCategory: "data-storage",
        replicaCount: 1,
      })
    })

    it("does nothing when componentId not found", () => {
      useArchitectureStore.getState().addNode("nonexistent", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes).toHaveLength(0)
    })

    it("snaps position to grid", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 17, y: 33 })
      const node = useArchitectureStore.getState().nodes[0]
      expect(node.position).toEqual({
        x: Math.round(17 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
        y: Math.round(33 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
      })
    })

    it("sets type to NODE_TYPE_COMPONENT", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes[0].type).toBe(NODE_TYPE_COMPONENT)
    })

    it("uses crypto.randomUUID for node ID", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes[0].id).toBe("test-uuid-1")
    })

    it("sets activeConfigVariantId to first variant", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes[0].data.activeConfigVariantId).toBe("default")
    })

    it("sets width to NODE_WIDTH", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes[0].width).toBe(NODE_WIDTH)
    })

    it("does nothing when component has empty configVariants", () => {
      useArchitectureStore.getState().addNode("empty-variants", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes).toHaveLength(0)
    })

    it("creates a new nodes array reference (immutable)", () => {
      const before = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const after = useArchitectureStore.getState().nodes
      expect(before).not.toBe(after)
    })
  })

  describe("addNode — max-nodes guard", () => {
    function seedNodes(count: number) {
      const nodes = Array.from({ length: count }, (_, i) => ({
        id: `dummy-${i}`,
        type: NODE_TYPE_COMPONENT as const,
        position: { x: i * 200, y: 0 },
        data: {
          archieComponentId: "postgresql",
          activeConfigVariantId: "default",
          componentName: "PostgreSQL",
          componentCategory: "data-storage" as const,
        },
      }))
      useArchitectureStore.setState({ nodes })
    }

    it("blocks addNode when node count equals MAX_CANVAS_NODES", () => {
      seedNodes(MAX_CANVAS_NODES)
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes).toHaveLength(MAX_CANVAS_NODES)
    })

    it("blocks addNode when node count exceeds MAX_CANVAS_NODES", () => {
      seedNodes(MAX_CANVAS_NODES + 5)
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes).toHaveLength(MAX_CANVAS_NODES + 5)
    })

    it("allows addNode when node count is MAX_CANVAS_NODES - 1", () => {
      seedNodes(MAX_CANVAS_NODES - 1)
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes).toHaveLength(MAX_CANVAS_NODES)
    })

    it("blocks addNodeSmartPosition when at max", () => {
      seedNodes(MAX_CANVAS_NODES)
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      expect(useArchitectureStore.getState().nodes).toHaveLength(MAX_CANVAS_NODES)
    })
  })

  describe("updateNodePosition", () => {
    beforeEach(() => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    })

    it("updates position with snap-to-grid", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().updateNodePosition(nodeId, { x: 25, y: 47 })
      const node = useArchitectureStore.getState().nodes[0]
      expect(node.position).toEqual({
        x: Math.round(25 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
        y: Math.round(47 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
      })
    })

    it("does not affect other nodes", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 100 })
      const [node1, node2] = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().updateNodePosition(node1.id, { x: 200, y: 200 })
      const updatedNodes = useArchitectureStore.getState().nodes
      expect(updatedNodes[1].position).toEqual(node2.position)
    })
  })

  describe("removeNode", () => {
    it("removes the node from nodes array", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().removeNode(nodeId)
      expect(useArchitectureStore.getState().nodes).toHaveLength(0)
    })

    it("cascade-deletes edges connected to the node (source)", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edge: ArchieEdge = {
        id: "e1",
        source: nodes[0].id,
        target: nodes[1].id,
        type: EDGE_TYPE_CONNECTION,
        data: {
          isIncompatible: false,
          incompatibilityReason: null,
          sourceArchieComponentId: "postgresql",
          targetArchieComponentId: "postgresql",
        },
      }
      useArchitectureStore.setState({ edges: [edge] })

      useArchitectureStore.getState().removeNode(nodes[0].id)
      expect(useArchitectureStore.getState().edges).toHaveLength(0)
    })

    it("cascade-deletes edges connected to the node (target)", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edge: ArchieEdge = {
        id: "e1",
        source: nodes[0].id,
        target: nodes[1].id,
        type: EDGE_TYPE_CONNECTION,
        data: {
          isIncompatible: false,
          incompatibilityReason: null,
          sourceArchieComponentId: "postgresql",
          targetArchieComponentId: "postgresql",
        },
      }
      useArchitectureStore.setState({ edges: [edge] })

      useArchitectureStore.getState().removeNode(nodes[1].id)
      expect(useArchitectureStore.getState().edges).toHaveLength(0)
    })

    it("clears selectedNodeId when removing the selected node", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useUiStore.getState().setSelectedNodeId(nodeId)
      expect(useUiStore.getState().selectedNodeId).toBe(nodeId)

      useArchitectureStore.getState().removeNode(nodeId)
      expect(useUiStore.getState().selectedNodeId).toBeNull()
    })

    it("does not clear selectedNodeId when removing a different node", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useUiStore.getState().setSelectedNodeId(nodes[1].id)

      useArchitectureStore.getState().removeNode(nodes[0].id)
      expect(useUiStore.getState().selectedNodeId).toBe(nodes[1].id)
    })

    it("preserves unrelated edges", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edges: ArchieEdge[] = [
        {
          id: "e1", source: nodes[0].id, target: nodes[1].id,
          type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "postgresql" },
        },
        {
          id: "e2", source: nodes[1].id, target: nodes[2].id,
          type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "postgresql" },
        },
      ]
      useArchitectureStore.setState({ edges })

      useArchitectureStore.getState().removeNode(nodes[0].id)
      expect(useArchitectureStore.getState().edges).toHaveLength(1)
      expect(useArchitectureStore.getState().edges[0].id).toBe("e2")
    })
  })

  describe("addEdge", () => {
    beforeEach(() => {
      // Create two nodes: postgresql and redis
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
    })

    it("creates an edge with correct ArchieEdgeData for compatible components", () => {
      // postgresql→redis is now incompatible bidirectionally (redis warns about data-storage)
      // Use postgresql→nginx instead (nginx has no compatibility field)
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id, // postgresql
        target: nodes[2].id, // nginx
        sourceHandle: null,
        targetHandle: null,
      })
      const edges = useArchitectureStore.getState().edges
      expect(edges).toHaveLength(1)
      expect(edges[0].data?.isIncompatible).toBe(false)
      expect(edges[0].data?.incompatibilityReason).toBeNull()
      expect(edges[0].data?.sourceArchieComponentId).toBe("postgresql")
      expect(edges[0].data?.targetArchieComponentId).toBe("nginx")
    })

    it("creates an edge with incompatibility data for incompatible components", () => {
      const nodes = useArchitectureStore.getState().nodes
      // redis -> postgresql: redis has compatibility: { "data-storage": "..." }
      useArchitectureStore.getState().addEdge({
        source: nodes[1].id, // redis (source)
        target: nodes[0].id, // postgresql (target, category: data-storage)
        sourceHandle: null,
        targetHandle: null,
      })
      const edges = useArchitectureStore.getState().edges
      expect(edges).toHaveLength(1)
      expect(edges[0].data?.isIncompatible).toBe(true)
      expect(edges[0].data?.incompatibilityReason).toBe("Caching layer may cause stale reads")
    })

    it("uses crypto.randomUUID for edge ID", () => {
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })
      // UUIDs 1 and 2 used by addNode, edge should get 3
      expect(useArchitectureStore.getState().edges[0].id).toBe("test-uuid-3")
    })

    it("sets edge type to EDGE_TYPE_CONNECTION", () => {
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })
      expect(useArchitectureStore.getState().edges[0].type).toBe(EDGE_TYPE_CONNECTION)
    })

    it("appends edge immutably", () => {
      const nodes = useArchitectureStore.getState().nodes
      const edgesBefore = useArchitectureStore.getState().edges
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })
      const edgesAfter = useArchitectureStore.getState().edges
      expect(edgesBefore).not.toBe(edgesAfter)
    })

    it("defaults to compatible when source node not found in store", () => {
      useArchitectureStore.getState().addEdge({
        source: "nonexistent-node",
        target: useArchitectureStore.getState().nodes[0].id,
        sourceHandle: null,
        targetHandle: null,
      })
      const edges = useArchitectureStore.getState().edges
      expect(edges).toHaveLength(1)
      expect(edges[0].data?.isIncompatible).toBe(false)
    })

    it("does nothing when source is null", () => {
      useArchitectureStore.getState().addEdge({
        source: null as unknown as string,
        target: useArchitectureStore.getState().nodes[0].id,
        sourceHandle: null,
        targetHandle: null,
      })
      expect(useArchitectureStore.getState().edges).toHaveLength(0)
    })

    it("does nothing when target is null", () => {
      useArchitectureStore.getState().addEdge({
        source: useArchitectureStore.getState().nodes[0].id,
        target: null as unknown as string,
        sourceHandle: null,
        targetHandle: null,
      })
      expect(useArchitectureStore.getState().edges).toHaveLength(0)
    })

    it("prevents self-loop (source === target)", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().addEdge({
        source: nodeId,
        target: nodeId,
        sourceHandle: null,
        targetHandle: null,
      })
      expect(useArchitectureStore.getState().edges).toHaveLength(0)
    })

    it("prevents duplicate edges between same source and target", () => {
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })
      expect(useArchitectureStore.getState().edges).toHaveLength(1)
    })
  })

  describe("removeEdges", () => {
    beforeEach(() => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      // Create two edges
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id, target: nodes[1].id, sourceHandle: null, targetHandle: null,
      })
      useArchitectureStore.getState().addEdge({
        source: nodes[1].id, target: nodes[2].id, sourceHandle: null, targetHandle: null,
      })
    })

    it("removes specified edges by ID", () => {
      const edges = useArchitectureStore.getState().edges
      useArchitectureStore.getState().removeEdges([edges[0].id])
      expect(useArchitectureStore.getState().edges).toHaveLength(1)
      expect(useArchitectureStore.getState().edges[0].id).toBe(edges[1].id)
    })

    it("removes multiple edges at once", () => {
      const edges = useArchitectureStore.getState().edges
      useArchitectureStore.getState().removeEdges([edges[0].id, edges[1].id])
      expect(useArchitectureStore.getState().edges).toHaveLength(0)
    })

    it("does not affect edges not in the removal list", () => {
      const edges = useArchitectureStore.getState().edges
      useArchitectureStore.getState().removeEdges(["nonexistent-id"])
      expect(useArchitectureStore.getState().edges).toHaveLength(edges.length)
    })

    it("creates a new edges array reference (immutable)", () => {
      const before = useArchitectureStore.getState().edges
      useArchitectureStore.getState().removeEdges([before[0].id])
      const after = useArchitectureStore.getState().edges
      expect(before).not.toBe(after)
    })
  })

  describe("addNodeSmartPosition", () => {
    it("places first node at (0, 0)", () => {
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      const nodes = useArchitectureStore.getState().nodes
      expect(nodes).toHaveLength(1)
      expect(nodes[0].position).toEqual({ x: 0, y: 0 })
    })

    it("places second node to the right of the first", () => {
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      const nodes = useArchitectureStore.getState().nodes
      expect(nodes).toHaveLength(2)
      expect(nodes[1].position.x).toBeGreaterThan(nodes[0].position.x)
      expect(nodes[1].position.y).toBe(nodes[0].position.y)
    })

    it("positions are snapped to grid", () => {
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      const nodes = useArchitectureStore.getState().nodes
      for (const node of nodes) {
        expect(node.position.x % CANVAS_GRID_SIZE).toBe(0)
        expect(node.position.y % CANVAS_GRID_SIZE).toBe(0)
      }
    })

    it("does nothing for unknown component", () => {
      useArchitectureStore.getState().addNodeSmartPosition("nonexistent")
      expect(useArchitectureStore.getState().nodes).toHaveLength(0)
    })

    it("creates correct ArchieNodeData", () => {
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      const node = useArchitectureStore.getState().nodes[0]
      expect(node.data.archieComponentId).toBe("postgresql")
      expect(node.data.componentName).toBe("PostgreSQL")
    })

    it("third node continues rightward", () => {
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      const nodes = useArchitectureStore.getState().nodes
      expect(nodes[2].position.x).toBeGreaterThan(nodes[1].position.x)
    })
  })

})
