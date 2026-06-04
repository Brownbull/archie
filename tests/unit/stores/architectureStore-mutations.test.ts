import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore, type ArchieEdge } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { CANVAS_GRID_SIZE, EDGE_TYPE_CONNECTION, NODE_TYPE_COMPONENT, TRAFFIC_RPS_STEPS } from "@/lib/constants"

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
  map.set("web-users", buildComponent({
    id: "web-users",
    name: "Web Users",
    category: "traffic",
    description: "Traffic source",
    is: "A traffic source archetype",
    gain: ["Load origin"],
    cost: ["Free"],
    tags: ["traffic"],
  }))
  map.set("api-client", buildComponent({
    id: "api-client",
    name: "API Client",
    category: "traffic",
    description: "Traffic source",
    is: "An API-client traffic archetype",
    gain: ["Load origin"],
    cost: ["Free"],
    tags: ["traffic"],
  }))

  return { testComponentMap: map }
})

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => testComponentMap.get(id)),
    getComponentsByCategory: (cat: string) => [...testComponentMap.values()].filter((c) => c.category === cat),
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

  describe("removeEdges — selection clearing", () => {
    it("clears selectedEdgeId when the selected edge is removed", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edge: ArchieEdge = {
        id: "e1", source: nodes[0].id, target: nodes[1].id, type: EDGE_TYPE_CONNECTION,
        data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "redis" },
      }
      useArchitectureStore.setState({ edges: [edge] })
      useUiStore.getState().setSelectedEdgeId("e1")

      useArchitectureStore.getState().removeEdges(["e1"])
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })

    it("leaves selectedEdgeId intact when a different edge is removed", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      const nodes = useArchitectureStore.getState().nodes
      const edges: ArchieEdge[] = [
        {
          id: "e1", source: nodes[0].id, target: nodes[1].id, type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "postgresql", targetArchieComponentId: "redis" },
        },
        {
          id: "e2", source: nodes[1].id, target: nodes[0].id, type: EDGE_TYPE_CONNECTION,
          data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "redis", targetArchieComponentId: "postgresql" },
        },
      ]
      useArchitectureStore.setState({ edges })
      useUiStore.getState().setSelectedEdgeId("e2")

      useArchitectureStore.getState().removeEdges(["e1"])
      expect(useUiStore.getState().selectedEdgeId).toBe("e2")
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

  describe("traffic config normalization on mutation (ISAPivot Phase 1)", () => {
    it("backfills trafficRps when swapping a non-traffic node TO a traffic source", () => {
      const store = useArchitectureStore.getState()
      store.addNode("postgresql", { x: 0, y: 0 })
      const id = useArchitectureStore.getState().nodes[0].id
      store.swapNodeComponent(id, "web-users")
      const data = useArchitectureStore.getState().nodes.find((n) => n.id === id)!.data
      expect(data.componentCategory).toBe("traffic")
      expect(data.trafficRps).toBe(TRAFFIC_RPS_STEPS[0]) // backfilled from replicaCount (MIN_REPLICAS)
    })

    it("strips trafficRps when swapping a traffic source TO a non-traffic node", () => {
      const store = useArchitectureStore.getState()
      store.addNode("web-users", { x: 0, y: 0 }) // addNode normalizes → trafficRps backfilled
      const id = useArchitectureStore.getState().nodes[0].id
      expect(useArchitectureStore.getState().nodes[0].data.trafficRps).toBe(TRAFFIC_RPS_STEPS[0])
      store.swapNodeComponent(id, "postgresql")
      const data = useArchitectureStore.getState().nodes.find((n) => n.id === id)!.data
      expect(data.componentCategory).toBe("data-storage")
      expect(data.trafficRps).toBeUndefined() // stripped on swap to non-traffic
    })

    it("setNodeWorkload / setNodeOrigin update a traffic node's config", () => {
      const store = useArchitectureStore.getState()
      store.addNode("web-users", { x: 0, y: 0 })
      const id = useArchitectureStore.getState().nodes[0].id
      // addNode normalized to the defaults
      expect(useArchitectureStore.getState().nodes[0].data.trafficWorkload).toBe("mixed")
      expect(useArchitectureStore.getState().nodes[0].data.trafficOrigin).toBe("one-region")
      store.setNodeWorkload(id, "write")
      store.setNodeOrigin(id, "multi-region")
      const data = useArchitectureStore.getState().nodes.find((n) => n.id === id)!.data
      expect(data.trafficWorkload).toBe("write")
      expect(data.trafficOrigin).toBe("multi-region")
    })

    it("setNodeWorkload no-ops on a non-traffic node", () => {
      const store = useArchitectureStore.getState()
      store.addNode("postgresql", { x: 0, y: 0 })
      const id = useArchitectureStore.getState().nodes[0].id
      store.setNodeWorkload(id, "write")
      expect(useArchitectureStore.getState().nodes[0].data.trafficWorkload).toBeUndefined()
    })
  })

  describe("traffic source one-per-type / max-4 hard-gate (ISAPivot)", () => {
    const traffic = () => useArchitectureStore.getState().nodes.filter((n) => n.data.componentCategory === "traffic")

    it("remaps a 2nd traffic add to the next free type (the palette always passes the default provider)", () => {
      const store = useArchitectureStore.getState()
      store.addNode("web-users", { x: 0, y: 0 })
      store.addNode("web-users", { x: 100, y: 0 }) // requested type taken → remap to the next free type
      expect(traffic()).toHaveLength(2)
      expect(new Set(traffic().map((n) => n.data.archieComponentId))).toEqual(new Set(["web-users", "api-client"]))
    })

    it("blocks adding once every traffic type is placed", () => {
      const store = useArchitectureStore.getState()
      store.addNode("web-users", { x: 0, y: 0 })
      store.addNode("web-users", { x: 100, y: 0 }) // → api-client
      store.addNode("web-users", { x: 200, y: 0 }) // both mock types placed → blocked (no-op)
      expect(traffic()).toHaveLength(2)
    })

    it("blocks swapping a traffic node to a type already on the canvas", () => {
      const store = useArchitectureStore.getState()
      store.addNode("web-users", { x: 0, y: 0 })
      store.addNode("web-users", { x: 100, y: 0 }) // web-users + api-client
      const apiNode = traffic().find((n) => n.data.archieComponentId === "api-client")!
      store.swapNodeComponent(apiNode.id, "web-users") // duplicate type → blocked
      expect(useArchitectureStore.getState().nodes.find((n) => n.id === apiNode.id)!.data.archieComponentId).toBe("api-client")
    })
  })

})
