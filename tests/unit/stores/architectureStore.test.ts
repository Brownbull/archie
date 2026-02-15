import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useArchitectureStore, type ArchieEdge } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { CANVAS_GRID_SIZE, EDGE_TYPE_CONNECTION, MAX_CANVAS_NODES, NODE_TYPE_COMPONENT, NODE_WIDTH } from "@/lib/constants"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => {
      if (id === "postgresql") {
        return {
          id: "postgresql",
          name: "PostgreSQL",
          category: "data-storage",
          description: "Relational database",
          is: "An open-source relational database",
          gain: ["ACID compliance"],
          cost: ["Higher memory usage"],
          tags: ["database"],
          baseMetrics: [],
          configVariants: [{ id: "default", name: "Default", metrics: [] }],
        }
      }
      if (id === "redis") {
        return {
          id: "redis",
          name: "Redis",
          category: "caching",
          description: "In-memory cache",
          is: "An in-memory data store",
          gain: ["Low latency"],
          cost: ["Memory cost"],
          tags: ["cache"],
          baseMetrics: [],
          configVariants: [{ id: "default", name: "Default", metrics: [] }],
          compatibility: { "data-storage": "Caching layer may cause stale reads" },
        }
      }
      if (id === "nginx") {
        return {
          id: "nginx",
          name: "Nginx",
          category: "delivery-network",
          description: "Reverse proxy",
          is: "A reverse proxy server",
          gain: ["Load balancing"],
          cost: ["Config complexity"],
          tags: ["proxy"],
          baseMetrics: [],
          configVariants: [{ id: "default", name: "Default", metrics: [] }],
        }
      }
      if (id === "mongodb") {
        return {
          id: "mongodb",
          name: "MongoDB",
          category: "data-storage",
          description: "Document database",
          is: "A NoSQL document database",
          gain: ["Schema flexibility"],
          cost: ["Eventual consistency"],
          tags: ["database", "nosql"],
          baseMetrics: [],
          configVariants: [
            { id: "replica-set", name: "Replica Set", metrics: [] },
            { id: "sharded", name: "Sharded", metrics: [] },
          ],
        }
      }
      if (id === "empty-variants") {
        return {
          id: "empty-variants",
          name: "Empty Variants",
          category: "data-storage",
          description: "Component with no variants",
          is: "Test component",
          gain: [],
          cost: [],
          tags: [],
          baseMetrics: [],
          configVariants: [],
        }
      }
      return undefined
    }),
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

  describe("setNodes", () => {
    it("replaces entire nodes array", () => {
      const newNodes = [
        {
          id: "n1",
          type: NODE_TYPE_COMPONENT as const,
          position: { x: 0, y: 0 },
          data: {
            archieComponentId: "pg",
            activeConfigVariantId: "default",
            componentName: "PG",
            componentCategory: "data-storage" as const,
          },
        },
      ]
      useArchitectureStore.getState().setNodes(newNodes)
      expect(useArchitectureStore.getState().nodes).toEqual(newNodes)
    })
  })

  describe("setEdges", () => {
    it("replaces entire edges array", () => {
      const newEdges: ArchieEdge[] = [{
        id: "e1", source: "a", target: "b",
        type: EDGE_TYPE_CONNECTION,
        data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "a", targetArchieComponentId: "b" },
      }]
      useArchitectureStore.getState().setEdges(newEdges)
      expect(useArchitectureStore.getState().edges).toEqual(newEdges)
    })
  })

  describe("deselectAll", () => {
    it("deselects selected nodes", () => {
      useArchitectureStore.setState({
        nodes: [
          {
            id: "n1", type: NODE_TYPE_COMPONENT as const, position: { x: 0, y: 0 },
            selected: true,
            data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" as const },
          },
        ],
      })
      useArchitectureStore.getState().deselectAll()
      expect(useArchitectureStore.getState().nodes[0].selected).toBe(false)
    })

    it("deselects selected edges", () => {
      useArchitectureStore.setState({
        edges: [{
          id: "e1", source: "a", target: "b", type: EDGE_TYPE_CONNECTION, selected: true,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "a", targetArchieComponentId: "b" },
        }],
      })
      useArchitectureStore.getState().deselectAll()
      expect(useArchitectureStore.getState().edges[0].selected).toBe(false)
    })

    it("is a no-op when nothing is selected", () => {
      const nodesBefore = useArchitectureStore.getState().nodes
      const edgesBefore = useArchitectureStore.getState().edges
      useArchitectureStore.getState().deselectAll()
      expect(useArchitectureStore.getState().nodes).toBe(nodesBefore)
      expect(useArchitectureStore.getState().edges).toBe(edgesBefore)
    })

    it("creates new array references when items are deselected", () => {
      const selectedNode = {
        id: "n1", type: NODE_TYPE_COMPONENT as const, position: { x: 0, y: 0 },
        selected: true,
        data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" as const },
      }
      useArchitectureStore.setState({ nodes: [selectedNode] })
      const nodesBefore = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().deselectAll()
      const nodesAfter = useArchitectureStore.getState().nodes
      expect(nodesBefore).not.toBe(nodesAfter)
    })
  })

  describe("updateNodeConfigVariant", () => {
    beforeEach(() => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    })

    it("updates activeConfigVariantId for the specified node", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().updateNodeConfigVariant(nodeId, "new-variant")
      expect(useArchitectureStore.getState().nodes[0].data.activeConfigVariantId).toBe("new-variant")
    })

    it("does not affect other nodes", () => {
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().updateNodeConfigVariant(nodes[0].id, "new-variant")
      expect(useArchitectureStore.getState().nodes[1].data.activeConfigVariantId).toBe("default")
    })

    it("preserves other node data fields", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const originalData = { ...useArchitectureStore.getState().nodes[0].data }
      useArchitectureStore.getState().updateNodeConfigVariant(nodeId, "new-variant")
      const updatedData = useArchitectureStore.getState().nodes[0].data
      expect(updatedData.archieComponentId).toBe(originalData.archieComponentId)
      expect(updatedData.componentName).toBe(originalData.componentName)
      expect(updatedData.componentCategory).toBe(originalData.componentCategory)
    })

    it("creates a new nodes array reference (immutable)", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const before = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().updateNodeConfigVariant(nodeId, "new-variant")
      const after = useArchitectureStore.getState().nodes
      expect(before).not.toBe(after)
    })

    it("creates a new node object reference for the updated node", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const beforeNode = useArchitectureStore.getState().nodes[0]
      useArchitectureStore.getState().updateNodeConfigVariant(nodeId, "new-variant")
      const afterNode = useArchitectureStore.getState().nodes[0]
      expect(beforeNode).not.toBe(afterNode)
    })

    it("creates a new data object reference for the updated node", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const beforeData = useArchitectureStore.getState().nodes[0].data
      useArchitectureStore.getState().updateNodeConfigVariant(nodeId, "new-variant")
      const afterData = useArchitectureStore.getState().nodes[0].data
      expect(beforeData).not.toBe(afterData)
    })

    it("is a no-op for nonexistent nodeId", () => {
      useArchitectureStore.getState().updateNodeConfigVariant("nonexistent", "new-variant")
      expect(useArchitectureStore.getState().nodes[0].data.activeConfigVariantId).toBe("default")
    })
  })

  describe("removeNodes (batch)", () => {
    it("removes multiple nodes in a single call", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().removeNodes([nodes[0].id, nodes[2].id])
      const remaining = useArchitectureStore.getState().nodes
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(nodes[1].id)
    })

    it("cascade-deletes edges connected to any removed node", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edges: ArchieEdge[] = [
        {
          id: "e1", source: nodes[0].id, target: nodes[1].id, type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "redis" },
        },
        {
          id: "e2", source: nodes[1].id, target: nodes[2].id, type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "redis", targetArchieComponentId: "nginx" },
        },
      ]
      useArchitectureStore.setState({ edges })

      useArchitectureStore.getState().removeNodes([nodes[0].id])
      expect(useArchitectureStore.getState().edges).toHaveLength(1)
      expect(useArchitectureStore.getState().edges[0].id).toBe("e2")
    })

    it("clears selectedNodeId when the selected node is in the batch", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useUiStore.getState().setSelectedNodeId(nodes[0].id)

      useArchitectureStore.getState().removeNodes([nodes[0].id])
      expect(useUiStore.getState().selectedNodeId).toBeNull()
    })

    it("does not clear selectedNodeId when selected node is not in batch", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useUiStore.getState().setSelectedNodeId(nodes[1].id)

      useArchitectureStore.getState().removeNodes([nodes[0].id])
      expect(useUiStore.getState().selectedNodeId).toBe(nodes[1].id)
    })

    it("clears selectedEdgeId when cascade-deleting the selected edge", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edge: ArchieEdge = {
        id: "e1", source: nodes[0].id, target: nodes[1].id, type: EDGE_TYPE_CONNECTION,
        data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "redis" },
      }
      useArchitectureStore.setState({ edges: [edge] })
      useUiStore.getState().setSelectedEdgeId("e1")

      useArchitectureStore.getState().removeNodes([nodes[0].id])
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })

    it("handles empty array (no-op)", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodesBefore = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().removeNodes([])
      expect(useArchitectureStore.getState().nodes).toBe(nodesBefore)
    })

    it("creates new array references when nodes are removed", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const nodesBefore = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().removeNodes([nodes[0].id])
      const nodesAfter = useArchitectureStore.getState().nodes
      expect(nodesBefore).not.toBe(nodesAfter)
    })
  })

  describe("removeNode — selectedEdgeId cascade", () => {
    it("clears selectedEdgeId when cascade-deleting the selected edge", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edge: ArchieEdge = {
        id: "e1",
        source: nodes[0].id,
        target: nodes[1].id,
        type: EDGE_TYPE_CONNECTION,
        data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "postgresql" },
      }
      useArchitectureStore.setState({ edges: [edge] })
      useUiStore.getState().setSelectedEdgeId("e1")

      useArchitectureStore.getState().removeNode(nodes[0].id)
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })

    it("does not clear selectedEdgeId when cascade does not affect it", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edges: ArchieEdge[] = [
        {
          id: "e1", source: nodes[0].id, target: nodes[1].id, type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "postgresql" },
        },
        {
          id: "e2", source: nodes[1].id, target: nodes[2].id, type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "postgresql" },
        },
      ]
      useArchitectureStore.setState({ edges })
      useUiStore.getState().setSelectedEdgeId("e2")

      useArchitectureStore.getState().removeNode(nodes[0].id)
      expect(useUiStore.getState().selectedEdgeId).toBe("e2")
    })
  })

  describe("swapNodeComponent", () => {
    beforeEach(() => {
      useArchitectureStore.getState().addNode("postgresql", { x: 100, y: 200 })
    })

    it("swaps archieComponentId to new component", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      expect(useArchitectureStore.getState().nodes[0].data.archieComponentId).toBe("mongodb")
    })

    it("resets activeConfigVariantId to first variant of new component", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      expect(useArchitectureStore.getState().nodes[0].data.activeConfigVariantId).toBe("replica-set")
    })

    it("updates componentName to new component's name", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      expect(useArchitectureStore.getState().nodes[0].data.componentName).toBe("MongoDB")
    })

    it("updates componentCategory to new component's category", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      expect(useArchitectureStore.getState().nodes[0].data.componentCategory).toBe("data-storage")
    })

    it("preserves node position after swap", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const positionBefore = { ...useArchitectureStore.getState().nodes[0].position }
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      expect(useArchitectureStore.getState().nodes[0].position).toEqual(positionBefore)
    })

    it("preserves node ID after swap (connections unaffected)", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      expect(useArchitectureStore.getState().nodes[0].id).toBe(nodeId)
    })

    it("does not affect other nodes", () => {
      useArchitectureStore.getState().addNode("redis", { x: 300, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const otherNodeData = { ...nodes[1].data }
      useArchitectureStore.getState().swapNodeComponent(nodes[0].id, "mongodb")
      expect(useArchitectureStore.getState().nodes[1].data).toEqual(otherNodeData)
    })

    it("creates new nodes array reference (immutable)", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const before = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      const after = useArchitectureStore.getState().nodes
      expect(before).not.toBe(after)
    })

    it("creates new node object reference for swapped node", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const beforeNode = useArchitectureStore.getState().nodes[0]
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      const afterNode = useArchitectureStore.getState().nodes[0]
      expect(beforeNode).not.toBe(afterNode)
    })

    it("creates new data object reference for swapped node", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const beforeData = useArchitectureStore.getState().nodes[0].data
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      const afterData = useArchitectureStore.getState().nodes[0].data
      expect(beforeData).not.toBe(afterData)
    })

    it("is a no-op when newComponentId is not found in library", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const nodesBefore = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().swapNodeComponent(nodeId, "nonexistent")
      expect(useArchitectureStore.getState().nodes).toBe(nodesBefore)
    })

    it("is a no-op when nodeId does not exist", () => {
      const nodesBefore = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().swapNodeComponent("bad-node-id", "mongodb")
      expect(useArchitectureStore.getState().nodes).toBe(nodesBefore)
    })

    it("is a no-op when target component has empty configVariants (TD-1-6a)", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const nodesBefore = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().swapNodeComponent(nodeId, "empty-variants")
      expect(useArchitectureStore.getState().nodes).toBe(nodesBefore)
      // Original component data should be preserved
      expect(useArchitectureStore.getState().nodes[0].data.archieComponentId).toBe("postgresql")
    })

    it("warns when rejecting swap to empty-variants component (TD-1-6a)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().swapNodeComponent(nodeId, "empty-variants")
      expect(warnSpy).toHaveBeenCalledWith(
        'swapNodeComponent: "empty-variants" has no configVariants — swap rejected',
      )
      warnSpy.mockRestore()
    })

    it("is a no-op when swapping to same component", () => {
      const nodeId = useArchitectureStore.getState().nodes[0].id
      const nodesBefore = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().swapNodeComponent(nodeId, "postgresql")
      expect(useArchitectureStore.getState().nodes).toBe(nodesBefore)
    })

    it("preserves edges array (no edge mutation)", () => {
      useArchitectureStore.getState().addNode("redis", { x: 300, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })
      const edgesBefore = useArchitectureStore.getState().edges
      useArchitectureStore.getState().swapNodeComponent(nodes[0].id, "mongodb")
      expect(useArchitectureStore.getState().edges).toBe(edgesBefore)
    })
  })

  describe("findNextAvailablePosition — epsilon comparison", () => {
    it("treats positions within 1px as same column (floating-point tolerance)", () => {
      // Seed two nodes at same snapped X but with tiny float diff
      const snappedX = CANVAS_GRID_SIZE * 2 // 32
      useArchitectureStore.setState({
        nodes: [
          {
            id: "n1", type: NODE_TYPE_COMPONENT as const,
            position: { x: snappedX, y: 0 },
            data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" as const },
          },
          {
            id: "n2", type: NODE_TYPE_COMPONENT as const,
            position: { x: snappedX + 0.0001, y: 0 }, // tiny float diff
            data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" as const },
          },
        ],
      })

      // Smart position should place to the right of the rightmost "column"
      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      const nodes = useArchitectureStore.getState().nodes
      expect(nodes).toHaveLength(3)
      // The new node should be placed to the right of snappedX, not stacked on top
      expect(nodes[2].position.x).toBeGreaterThan(snappedX)
    })

    it("keeps same-row y from the epsilon-matched column", () => {
      const snappedX = CANVAS_GRID_SIZE * 4 // 64
      const yPos = CANVAS_GRID_SIZE * 3 // 48
      useArchitectureStore.setState({
        nodes: [
          {
            id: "n1", type: NODE_TYPE_COMPONENT as const,
            position: { x: 0, y: 0 },
            data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" as const },
          },
          {
            id: "n2", type: NODE_TYPE_COMPONENT as const,
            position: { x: snappedX + 0.5, y: yPos },
            data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" as const },
          },
        ],
      })

      useArchitectureStore.getState().addNodeSmartPosition("postgresql")
      const nodes = useArchitectureStore.getState().nodes
      // y should match the rightmost column's y (snapped)
      expect(nodes[2].position.y).toBe(Math.round(yPos / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE)
    })
  })

  describe("recalculation (Story 2-1)", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      uuidCounter = 0
      useArchitectureStore.setState({
        nodes: [],
        edges: [],
        computedMetrics: new Map(),
        previousMetrics: new Map(),
        rippleActiveNodeIds: new Set(),
        recalcGeneration: 0,
      })
      useUiStore.setState({ selectedNodeId: null, selectedEdgeId: null })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("has initial recalculation state", () => {
      const state = useArchitectureStore.getState()
      expect(state.computedMetrics.size).toBe(0)
      expect(state.previousMetrics.size).toBe(0)
      expect(state.rippleActiveNodeIds.size).toBe(0)
      expect(state.recalcGeneration).toBe(0)
    })

    it("triggerRecalculation increments recalcGeneration", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().triggerRecalculation(nodeId)
      expect(useArchitectureStore.getState().recalcGeneration).toBe(1)
    })

    it("triggerRecalculation snapshots previousMetrics before recalc", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id

      // Set up some existing computed metrics
      const fakeMetrics = new Map([
        [nodeId, { nodeId, metrics: [], overallScore: 5 }],
      ])
      useArchitectureStore.setState({ computedMetrics: fakeMetrics })

      useArchitectureStore.getState().triggerRecalculation(nodeId)

      // previousMetrics should contain the old computed metrics
      const prev = useArchitectureStore.getState().previousMetrics
      expect(prev.has(nodeId)).toBe(true)
      expect(prev.get(nodeId)!.overallScore).toBe(5)
    })

    it("updateNodeConfigVariant triggers recalculation", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().updateNodeConfigVariant(nodeId, "new-variant")
      expect(useArchitectureStore.getState().recalcGeneration).toBeGreaterThan(0)
    })

    it("swapNodeComponent triggers recalculation", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().swapNodeComponent(nodeId, "mongodb")
      expect(useArchitectureStore.getState().recalcGeneration).toBeGreaterThan(0)
    })

    it("addEdge triggers recalculation for both endpoints", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes

      const genBefore = useArchitectureStore.getState().recalcGeneration
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })
      // Two triggers: one for source, one for target
      expect(useArchitectureStore.getState().recalcGeneration).toBeGreaterThan(genBefore)
    })

    it("removeEdges triggers recalculation for affected endpoints", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: null,
        targetHandle: null,
      })

      const genBefore = useArchitectureStore.getState().recalcGeneration
      const edgeId = useArchitectureStore.getState().edges[0].id
      useArchitectureStore.getState().removeEdges([edgeId])
      expect(useArchitectureStore.getState().recalcGeneration).toBeGreaterThan(genBefore)
    })

    it("removeNode triggers recalculation for surviving neighbors", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      // Chain: n0 → n1 → n2
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id, target: nodes[1].id, sourceHandle: null, targetHandle: null,
      })
      useArchitectureStore.getState().addEdge({
        source: nodes[1].id, target: nodes[2].id, sourceHandle: null, targetHandle: null,
      })

      const genBefore = useArchitectureStore.getState().recalcGeneration
      // Remove middle node — neighbors (n0 and n2) should get recalculated
      useArchitectureStore.getState().removeNode(nodes[1].id)
      expect(useArchitectureStore.getState().recalcGeneration).toBeGreaterThan(genBefore)
    })

    it("removeNode cleans up computedMetrics for the removed node", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id

      // Manually set computed metrics for this node
      useArchitectureStore.setState({
        computedMetrics: new Map([[nodeId, { nodeId, metrics: [], overallScore: 5 }]]),
      })

      useArchitectureStore.getState().removeNode(nodeId)
      expect(useArchitectureStore.getState().computedMetrics.has(nodeId)).toBe(false)
    })

    it("rippleActiveNodeIds populated during ripple animation", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id, target: nodes[1].id, sourceHandle: null, targetHandle: null,
      })

      // Trigger a fresh recalculation
      useArchitectureStore.getState().triggerRecalculation(nodes[0].id)

      // Before 100ms — ripple not yet active for hop-1 node
      vi.advanceTimersByTime(99)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has(nodes[1].id)).toBe(false)

      // At 100ms — ripple activates for hop-1 node
      vi.advanceTimersByTime(1)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has(nodes[1].id)).toBe(true)

      // At 299ms — ripple still active (animation duration not yet elapsed)
      vi.advanceTimersByTime(199)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has(nodes[1].id)).toBe(true)

      // At 300ms (100ms delay + 200ms animation) — ripple clears
      vi.advanceTimersByTime(1)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.has(nodes[1].id)).toBe(false)
    })

    it("generation counter prevents stale writes on rapid changes", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id, target: nodes[1].id, sourceHandle: null, targetHandle: null,
      })

      // First recalculation
      useArchitectureStore.getState().triggerRecalculation(nodes[0].id)
      const gen1 = useArchitectureStore.getState().recalcGeneration

      // Snapshot metrics after gen1's immediate update (hop 0)
      const metricsAfterGen1 = new Map(useArchitectureStore.getState().computedMetrics)

      // Second recalculation before first's timeouts fire
      useArchitectureStore.getState().triggerRecalculation(nodes[0].id)
      const gen2 = useArchitectureStore.getState().recalcGeneration
      expect(gen2).toBeGreaterThan(gen1)

      // Snapshot metrics after gen2's immediate update (hop 0)
      const metricsAfterGen2 = new Map(useArchitectureStore.getState().computedMetrics)

      // Advance timers — gen1's stale timeouts should be skipped
      vi.advanceTimersByTime(500)

      // Store should reflect gen2's generation, not gen1's
      expect(useArchitectureStore.getState().recalcGeneration).toBe(gen2)

      // Ripple should be fully cleared (gen2's timeouts completed cleanly)
      expect(useArchitectureStore.getState().rippleActiveNodeIds.size).toBe(0)
    })

    it("rapid recalculation clears pending ripple timeouts", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout")

      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      useArchitectureStore.getState().addEdge({
        source: nodes[0].id, target: nodes[1].id, sourceHandle: null, targetHandle: null,
      })

      // First explicit recalculation — schedules ripple timeouts
      useArchitectureStore.getState().triggerRecalculation(nodes[0].id)

      // Clear spy AFTER first recalculation to isolate the second call
      clearTimeoutSpy.mockClear()

      // Second recalculation — should clear previous ripple timeouts
      useArchitectureStore.getState().triggerRecalculation(nodes[0].id)
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it("computedMetrics uses new Map instances (immutability)", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id

      const mapBefore = useArchitectureStore.getState().computedMetrics
      useArchitectureStore.getState().triggerRecalculation(nodeId)
      const mapAfter = useArchitectureStore.getState().computedMetrics

      expect(mapBefore).not.toBe(mapAfter)
    })
  })

  describe("currentTier (Story 2-4)", () => {
    it("is null initially", () => {
      expect(useArchitectureStore.getState().currentTier).toBeNull()
    })

    it("updates after addNode when enough components from enough categories", () => {
      // Foundation tier requires >=3 components from >=2 categories
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })

      const tier = useArchitectureStore.getState().currentTier
      expect(tier).not.toBeNull()
      expect(tier!.tierId).toBe("foundation")
    })

    it("remains null with fewer than 3 components", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })

      expect(useArchitectureStore.getState().currentTier).toBeNull()
    })

    it("becomes null when all nodes removed via removeNode", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })

      // Should have Foundation tier
      expect(useArchitectureStore.getState().currentTier).not.toBeNull()

      // Remove all nodes one by one
      const nodes = useArchitectureStore.getState().nodes
      for (const node of nodes) {
        useArchitectureStore.getState().removeNode(node.id)
      }

      expect(useArchitectureStore.getState().currentTier).toBeNull()
    })

    it("becomes null when all nodes removed via removeNodes", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })

      expect(useArchitectureStore.getState().currentTier).not.toBeNull()

      const nodeIds = useArchitectureStore.getState().nodes.map((n) => n.id)
      useArchitectureStore.getState().removeNodes(nodeIds)

      expect(useArchitectureStore.getState().currentTier).toBeNull()
    })

    it("updates after triggerRecalculation", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })

      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().triggerRecalculation(nodeId)

      // Should still have a tier (Foundation at minimum)
      expect(useArchitectureStore.getState().currentTier).not.toBeNull()
    })

    it("re-evaluates on removeNode of isolated node (no neighbor recalculation)", () => {
      // Add 4 isolated nodes (no edges), 3 categories
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })
      useArchitectureStore.getState().addNode("postgresql", { x: 600, y: 0 })

      expect(useArchitectureStore.getState().currentTier).not.toBeNull()

      // Remove one isolated node — should still have Foundation (3 remaining, 3 categories)
      const nodeToRemove = useArchitectureStore.getState().nodes[3].id
      useArchitectureStore.getState().removeNode(nodeToRemove)

      expect(useArchitectureStore.getState().nodes).toHaveLength(3)
      expect(useArchitectureStore.getState().currentTier).not.toBeNull()
    })
  })
})
