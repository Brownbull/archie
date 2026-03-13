import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"
import { resolveStackPlacement } from "@/services/stackPlacement"
import { componentLibrary } from "@/services/componentLibrary"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { recalculationService } from "@/services/recalculationService"
import { MAX_CANVAS_NODES, NODE_TYPE_COMPONENT, EDGE_TYPE_CONNECTION, CANVAS_GRID_SIZE } from "@/lib/constants"
import { makeComponent, makeConfigVariant, makeMetric, makeNode } from "../helpers/factories"
import type { StackDefinition } from "@/schemas/stackSchema"

// Mock componentLibrary
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(),
    getStackById: vi.fn(),
    isInitialized: () => true,
  },
}))

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn().mockReturnValue({ isCompatible: true, reason: "" }),
}))

// Mock recalculationService to avoid BFS propagation complexity
vi.mock("@/services/recalculationService", () => ({
  recalculationService: {
    run: vi.fn().mockReturnValue({
      metrics: new Map(),
      propagationHops: [],
      edgeHeatmap: new Map(),
    }),
  },
}))

const mockGetComponent = vi.mocked(componentLibrary.getComponent)
const mockCheckCompatibility = vi.mocked(checkCompatibility)
const mockRecalcRun = vi.mocked(recalculationService.run)

function makeTestStack(): StackDefinition {
  return {
    id: "test-stack",
    name: "Test Stack",
    description: "A test stack for integration testing",
    components: [
      { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
      { componentId: "redis", variantId: "standalone", relativePosition: { x: 200, y: 0 } },
    ],
    connections: [
      { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "cache-aside" },
    ],
    tradeOffProfile: [],
  }
}

function setupMockComponents() {
  mockGetComponent.mockImplementation((id: string) => {
    if (id === "postgresql") {
      return makeComponent({
        id: "postgresql",
        name: "PostgreSQL",
        category: "data-storage",
        configVariants: [
          makeConfigVariant({
            id: "single-node",
            name: "Single Node",
            metrics: [makeMetric({ id: "read-latency", numericValue: 3, category: "performance" })],
          }),
          makeConfigVariant({ id: "primary-replica", name: "Primary-Replica" }),
        ],
      })
    }
    if (id === "redis") {
      return makeComponent({
        id: "redis",
        name: "Redis",
        category: "caching",
        configVariants: [
          makeConfigVariant({
            id: "standalone",
            name: "Standalone",
            metrics: [makeMetric({ id: "cache-efficiency", numericValue: 7, category: "performance" })],
          }),
          makeConfigVariant({ id: "sentinel", name: "Sentinel" }),
        ],
      })
    }
    if (id === "nginx") {
      return makeComponent({
        id: "nginx",
        name: "Nginx",
        category: "delivery-network",
        configVariants: [
          makeConfigVariant({ id: "reverse-proxy", name: "Reverse Proxy" }),
        ],
      })
    }
    return undefined
  })
}

describe("Stack Placement Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMockComponents()
    mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
    mockRecalcRun.mockReturnValue({
      metrics: new Map(),
      propagationHops: [],
      edgeHeatmap: new Map(),
    })

    // Reset store to clean state
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
      constraints: [],
      constraintViolations: [],
      violationsByNodeId: new Map(),
    })
  })

  describe("placeStack adds nodes and edges to store", () => {
    it("adds all resolved nodes and edges", () => {
      const stack = makeTestStack()
      const result = resolveStackPlacement(stack, { x: 100, y: 100 })

      useArchitectureStore.getState().placeStack(result.nodes, result.edges)

      const state = useArchitectureStore.getState()
      expect(state.nodes).toHaveLength(2)
      expect(state.edges).toHaveLength(1)
    })

    it("preserves existing nodes when placing stack", () => {
      // Pre-place a node
      const existingNode = makeNode({ id: "existing-1" })
      useArchitectureStore.setState({ nodes: [existingNode] })

      const stack = makeTestStack()
      const result = resolveStackPlacement(stack, { x: 300, y: 100 })

      useArchitectureStore.getState().placeStack(result.nodes, result.edges)

      const state = useArchitectureStore.getState()
      expect(state.nodes).toHaveLength(3) // 1 existing + 2 from stack
      expect(state.nodes[0].id).toBe("existing-1")
    })
  })

  describe("position correctness", () => {
    it("placed nodes have correct positions offset from drop point", () => {
      const stack = makeTestStack()
      const result = resolveStackPlacement(stack, { x: 100, y: 100 })

      useArchitectureStore.getState().placeStack(result.nodes, result.edges)

      const state = useArchitectureStore.getState()
      // First component: dropPoint(100,100) + relative(0,0) = (100,100) snapped
      const expectedX0 = Math.round(100 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
      const expectedY0 = Math.round(100 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
      expect(state.nodes[0].position.x).toBe(expectedX0)
      expect(state.nodes[0].position.y).toBe(expectedY0)

      // Second component: dropPoint(100,100) + relative(200,0) = (300,100) snapped
      const expectedX1 = Math.round(300 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
      expect(state.nodes[1].position.x).toBe(expectedX1)
    })
  })

  describe("canvas limit enforcement", () => {
    it("prevents placement when would exceed MAX_CANVAS_NODES", () => {
      // Fill canvas to MAX - 1
      const existingNodes = Array.from({ length: MAX_CANVAS_NODES - 1 }, (_, i) =>
        makeNode({ id: `node-${i}` }),
      )
      useArchitectureStore.setState({ nodes: existingNodes })

      const stack = makeTestStack() // 2 components
      const result = resolveStackPlacement(stack, { x: 0, y: 0 })

      // (MAX-1) + 2 > MAX → should be rejected
      useArchitectureStore.getState().placeStack(result.nodes, result.edges)

      const state = useArchitectureStore.getState()
      expect(state.nodes).toHaveLength(MAX_CANVAS_NODES - 1) // Unchanged
    })
  })

  describe("post-placement editing (AC-3)", () => {
    let placedNodes: ArchieNode[]
    let placedEdges: ArchieEdge[]

    beforeEach(() => {
      const stack = makeTestStack()
      const result = resolveStackPlacement(stack, { x: 0, y: 0 })
      placedNodes = result.nodes
      placedEdges = result.edges
      useArchitectureStore.getState().placeStack(placedNodes, placedEdges)
    })

    it("supports variant switching on placed components", () => {
      const nodeId = placedNodes[0].id

      useArchitectureStore.getState().updateNodeConfigVariant(nodeId, "primary-replica")

      const updated = useArchitectureStore.getState().nodes.find((n) => n.id === nodeId)
      expect(updated?.data.activeConfigVariantId).toBe("primary-replica")
    })

    it("supports connection removal on placed edges", () => {
      const edgeId = placedEdges[0].id

      useArchitectureStore.getState().removeEdges([edgeId])

      const state = useArchitectureStore.getState()
      expect(state.edges).toHaveLength(0)
    })

    it("supports repositioning placed components", () => {
      const nodeId = placedNodes[0].id

      useArchitectureStore.getState().updateNodePosition(nodeId, { x: 500, y: 500 })

      const updated = useArchitectureStore.getState().nodes.find((n) => n.id === nodeId)
      const expectedX = Math.round(500 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
      const expectedY = Math.round(500 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
      expect(updated?.position.x).toBe(expectedX)
      expect(updated?.position.y).toBe(expectedY)
    })

    it("supports component swap on placed components", () => {
      const nodeId = placedNodes[0].id

      useArchitectureStore.getState().swapNodeComponent(nodeId, "nginx")

      const updated = useArchitectureStore.getState().nodes.find((n) => n.id === nodeId)
      expect(updated?.data.archieComponentId).toBe("nginx")
      expect(updated?.data.componentName).toBe("Nginx")
    })
  })

  describe("placed nodes are indistinguishable from manually placed (AC-ARCH-PATTERN-3)", () => {
    it("placed nodes have same type and structure as addNode", () => {
      const stack = makeTestStack()
      const result = resolveStackPlacement(stack, { x: 0, y: 0 })

      useArchitectureStore.getState().placeStack(result.nodes, result.edges)

      const state = useArchitectureStore.getState()
      for (const node of state.nodes) {
        expect(node.type).toBe(NODE_TYPE_COMPONENT)
        expect(node.data).toHaveProperty("archieComponentId")
        expect(node.data).toHaveProperty("activeConfigVariantId")
        expect(node.data).toHaveProperty("componentName")
        expect(node.data).toHaveProperty("componentCategory")
      }
    })

    it("placed edges have same type and structure as addEdge", () => {
      const stack = makeTestStack()
      const result = resolveStackPlacement(stack, { x: 0, y: 0 })

      useArchitectureStore.getState().placeStack(result.nodes, result.edges)

      const state = useArchitectureStore.getState()
      for (const edge of state.edges) {
        expect(edge.type).toBe(EDGE_TYPE_CONNECTION)
        expect(edge.data).toHaveProperty("isIncompatible")
        expect(edge.data).toHaveProperty("incompatibilityReason")
        expect(edge.data).toHaveProperty("sourceArchieComponentId")
        expect(edge.data).toHaveProperty("targetArchieComponentId")
      }
    })
  })
})
