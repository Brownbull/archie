import { describe, it, expect } from "vitest"
import {
  emptyArchitecture,
  singleNodeArchitecture,
  connectedPairArchitecture,
  fullArchitecture,
} from "../../helpers/fixtures"
import { NODE_TYPE_COMPONENT, EDGE_TYPE_CONNECTION } from "@/lib/constants"

// =============================================================================
// emptyArchitecture
// =============================================================================

describe("emptyArchitecture", () => {
  it("returns empty nodes and edges arrays", () => {
    const arch = emptyArchitecture()
    expect(arch.nodes).toEqual([])
    expect(arch.edges).toEqual([])
  })

  it("returns new array references each call (no shared state)", () => {
    const a = emptyArchitecture()
    const b = emptyArchitecture()
    expect(a.nodes).not.toBe(b.nodes)
    expect(a.edges).not.toBe(b.edges)
  })
})

// =============================================================================
// singleNodeArchitecture
// =============================================================================

describe("singleNodeArchitecture", () => {
  it("returns exactly one node and zero edges", () => {
    const arch = singleNodeArchitecture()
    expect(arch.nodes).toHaveLength(1)
    expect(arch.edges).toHaveLength(0)
  })

  it("node has type NODE_TYPE_COMPONENT", () => {
    const arch = singleNodeArchitecture()
    expect(arch.nodes[0].type).toBe(NODE_TYPE_COMPONENT)
  })

  it("node has valid ArchieNodeData", () => {
    const arch = singleNodeArchitecture()
    const data = arch.nodes[0].data
    expect(data.archieComponentId).toBeDefined()
    expect(data.activeConfigVariantId).toBeDefined()
    expect(data.componentName).toBeDefined()
    expect(data.componentCategory).toBeDefined()
  })

  it("node is positioned at origin {x: 0, y: 0}", () => {
    const arch = singleNodeArchitecture()
    expect(arch.nodes[0].position).toEqual({ x: 0, y: 0 })
  })

  it("returns new instances each call", () => {
    const a = singleNodeArchitecture()
    const b = singleNodeArchitecture()
    expect(a.nodes).not.toBe(b.nodes)
    expect(a.nodes[0]).not.toBe(b.nodes[0])
  })
})

// =============================================================================
// connectedPairArchitecture
// =============================================================================

describe("connectedPairArchitecture", () => {
  it("returns exactly 2 nodes and 1 edge", () => {
    const arch = connectedPairArchitecture()
    expect(arch.nodes).toHaveLength(2)
    expect(arch.edges).toHaveLength(1)
  })

  it("edge connects first node to second node", () => {
    const arch = connectedPairArchitecture()
    expect(arch.edges[0].source).toBe(arch.nodes[0].id)
    expect(arch.edges[0].target).toBe(arch.nodes[1].id)
  })

  it("edge has type EDGE_TYPE_CONNECTION", () => {
    const arch = connectedPairArchitecture()
    expect(arch.edges[0].type).toBe(EDGE_TYPE_CONNECTION)
  })

  it("edge has valid ArchieEdgeData", () => {
    const arch = connectedPairArchitecture()
    const data = arch.edges[0].data!
    expect(typeof data.isIncompatible).toBe("boolean")
    expect(data.sourceArchieComponentId).toBeDefined()
    expect(data.targetArchieComponentId).toBeDefined()
  })

  it("nodes have different positions", () => {
    const arch = connectedPairArchitecture()
    const pos1 = arch.nodes[0].position
    const pos2 = arch.nodes[1].position
    expect(pos1.x !== pos2.x || pos1.y !== pos2.y).toBe(true)
  })

  it("nodes have different categories", () => {
    const arch = connectedPairArchitecture()
    expect(arch.nodes[0].data.componentCategory).not.toBe(
      arch.nodes[1].data.componentCategory,
    )
  })

  it("returns new instances each call", () => {
    const a = connectedPairArchitecture()
    const b = connectedPairArchitecture()
    expect(a.nodes).not.toBe(b.nodes)
    expect(a.edges).not.toBe(b.edges)
  })
})

// =============================================================================
// fullArchitecture
// =============================================================================

describe("fullArchitecture", () => {
  it("returns 5 or more nodes", () => {
    const arch = fullArchitecture()
    expect(arch.nodes.length).toBeGreaterThanOrEqual(5)
  })

  it("returns 4 or more edges", () => {
    const arch = fullArchitecture()
    expect(arch.edges.length).toBeGreaterThanOrEqual(4)
  })

  it("all nodes have type NODE_TYPE_COMPONENT", () => {
    const arch = fullArchitecture()
    for (const node of arch.nodes) {
      expect(node.type).toBe(NODE_TYPE_COMPONENT)
    }
  })

  it("all edges have type EDGE_TYPE_CONNECTION", () => {
    const arch = fullArchitecture()
    for (const edge of arch.edges) {
      expect(edge.type).toBe(EDGE_TYPE_CONNECTION)
    }
  })

  it("nodes span at least 3 different categories", () => {
    const arch = fullArchitecture()
    const categories = new Set(arch.nodes.map((n) => n.data.componentCategory))
    expect(categories.size).toBeGreaterThanOrEqual(3)
  })

  it("all edge sources and targets reference existing node IDs", () => {
    const arch = fullArchitecture()
    const nodeIds = new Set(arch.nodes.map((n) => n.id))
    for (const edge of arch.edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })

  it("all nodes have unique IDs", () => {
    const arch = fullArchitecture()
    const ids = arch.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("all edges have unique IDs", () => {
    const arch = fullArchitecture()
    const ids = arch.edges.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("returns new instances each call", () => {
    const a = fullArchitecture()
    const b = fullArchitecture()
    expect(a.nodes).not.toBe(b.nodes)
    expect(a.edges).not.toBe(b.edges)
  })

  it("all edges have valid ArchieEdgeData", () => {
    const arch = fullArchitecture()
    for (const edge of arch.edges) {
      expect(edge.data).toBeDefined()
      expect(typeof edge.data!.isIncompatible).toBe("boolean")
      expect(edge.data!.sourceArchieComponentId).toBeDefined()
      expect(edge.data!.targetArchieComponentId).toBeDefined()
    }
  })

  it("includes at least one incompatible edge", () => {
    const arch = fullArchitecture()
    const incompatible = arch.edges.filter((e) => e.data!.isIncompatible)
    expect(incompatible.length).toBeGreaterThanOrEqual(1)
    expect(incompatible[0].data!.incompatibilityReason).toBeTruthy()
  })
})
