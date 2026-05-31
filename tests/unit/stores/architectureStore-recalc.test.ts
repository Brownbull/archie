import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useArchitectureStore, type ArchieEdge } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { EDGE_TYPE_CONNECTION, NODE_TYPE_COMPONENT, NODE_WIDTH } from "@/lib/constants"

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

      // Second recalculation before first's timeouts fire
      useArchitectureStore.getState().triggerRecalculation(nodes[0].id)
      const gen2 = useArchitectureStore.getState().recalcGeneration
      expect(gen2).toBeGreaterThan(gen1)

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

  describe("loadArchitecture", () => {
    const importedNodes = [
      {
        id: "imported-node-1",
        type: NODE_TYPE_COMPONENT as typeof NODE_TYPE_COMPONENT,
        position: { x: 100, y: 200 },
        data: {
          archieComponentId: "postgresql",
          activeConfigVariantId: "default",
          componentName: "PostgreSQL",
          componentCategory: "data-storage" as const,
        },
        width: NODE_WIDTH,
      },
      {
        id: "imported-node-2",
        type: NODE_TYPE_COMPONENT as typeof NODE_TYPE_COMPONENT,
        position: { x: 300, y: 200 },
        data: {
          archieComponentId: "redis",
          activeConfigVariantId: "default",
          componentName: "Redis",
          componentCategory: "caching" as const,
        },
        width: NODE_WIDTH,
      },
    ]

    const importedEdges: ArchieEdge[] = [
      {
        id: "imported-edge-1",
        source: "imported-node-1",
        target: "imported-node-2",
        type: EDGE_TYPE_CONNECTION,
        data: {
          isIncompatible: false,
          incompatibilityReason: null,
          sourceArchieComponentId: "postgresql",
          targetArchieComponentId: "redis",
        },
      },
    ]

    it("replaces existing canvas with imported architecture", () => {
      // Add existing node first
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes).toHaveLength(1)

      // Load new architecture
      useArchitectureStore.getState().loadArchitecture(importedNodes, importedEdges)

      const state = useArchitectureStore.getState()
      expect(state.nodes).toHaveLength(2)
      expect(state.nodes[0].id).toBe("imported-node-1")
      expect(state.nodes[1].id).toBe("imported-node-2")
      expect(state.edges).toHaveLength(1)
      expect(state.edges[0].id).toBe("imported-edge-1")
    })

    it("bumps loadNonce so the canvas can auto-fit the loaded graph", () => {
      const before = useArchitectureStore.getState().loadNonce
      useArchitectureStore.getState().loadArchitecture(importedNodes, importedEdges)
      expect(useArchitectureStore.getState().loadNonce).toBe(before + 1)
    })

    it("clears computed state on load", () => {
      // Add a node to generate computed metrics
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      const nodeId = useArchitectureStore.getState().nodes[0].id
      useArchitectureStore.getState().triggerRecalculation(nodeId)

      // Load new architecture — computed state should be cleared then recalculated
      useArchitectureStore.getState().loadArchitecture(importedNodes, importedEdges)

      const state = useArchitectureStore.getState()
      // Previous nodes' metrics should be gone
      expect(state.computedMetrics.has(nodeId)).toBe(false)
    })

    it("clears uiStore selection state", () => {
      useUiStore.setState({ selectedNodeId: "some-node", selectedEdgeId: "some-edge" })

      useArchitectureStore.getState().loadArchitecture(importedNodes, importedEdges)

      expect(useUiStore.getState().selectedNodeId).toBeNull()
      expect(useUiStore.getState().selectedEdgeId).toBeNull()
    })

    it("triggers recalculation for imported nodes", () => {
      useArchitectureStore.getState().loadArchitecture(importedNodes, importedEdges)

      // Recalculation should have run — computedMetrics should have entries for imported nodes
      const state = useArchitectureStore.getState()
      expect(state.computedMetrics.size).toBeGreaterThan(0)
    })

    it("handles empty architecture (clear canvas)", () => {
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      expect(useArchitectureStore.getState().nodes).toHaveLength(1)

      useArchitectureStore.getState().loadArchitecture([], [])

      const state = useArchitectureStore.getState()
      expect(state.nodes).toHaveLength(0)
      expect(state.edges).toHaveLength(0)
      expect(state.computedMetrics.size).toBe(0)
      expect(state.currentTier).toBeNull()
    })

    it("clears currentTier before recalculation", () => {
      // Build up a tier first
      useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
      useArchitectureStore.getState().addNode("redis", { x: 200, y: 0 })
      useArchitectureStore.getState().addNode("nginx", { x: 400, y: 0 })

      // Load empty architecture — tier should be null
      useArchitectureStore.getState().loadArchitecture([], [])
      expect(useArchitectureStore.getState().currentTier).toBeNull()
    })
  })
})
