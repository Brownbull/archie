import { describe, it, expect, vi, beforeEach } from "vitest"
import type { StackDefinition } from "@/schemas/stackSchema"
import { NODE_TYPE_COMPONENT, NODE_WIDTH, CANVAS_GRID_SIZE } from "@/lib/constants"

// Mock componentLibrary before importing the service
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(),
  },
}))

// Mock checkCompatibility
vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn(),
}))

import { resolveStackPlacement } from "@/services/stackPlacement"
import { componentLibrary } from "@/services/componentLibrary"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { makeComponent, makeConfigVariant } from "../../helpers/factories"

const mockGetComponent = vi.mocked(componentLibrary.getComponent)
const mockCheckCompatibility = vi.mocked(checkCompatibility)

function makeStack(overrides?: Partial<StackDefinition>): StackDefinition {
  return {
    id: "test-stack",
    name: "Test Stack",
    description: "A test stack",
    components: [
      { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
      { componentId: "redis", variantId: "standalone", relativePosition: { x: 200, y: 0 } },
    ],
    connections: [
      { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "cache-aside" },
    ],
    tradeOffProfile: [],
    ...overrides,
  }
}

describe("resolveStackPlacement", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Default: return valid components
    mockGetComponent.mockImplementation((id: string) => {
      if (id === "postgresql") {
        return makeComponent({
          id: "postgresql",
          name: "PostgreSQL",
          category: "data-storage",
          configVariants: [
            makeConfigVariant({ id: "single-node", name: "Single Node" }),
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
            makeConfigVariant({ id: "standalone", name: "Standalone" }),
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

    mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
  })

  it("offsets positions from drop point", () => {
    const stack = makeStack()
    const result = resolveStackPlacement(stack, { x: 100, y: 100 })

    expect(result.nodes).toHaveLength(2)
    // dropPoint.x + relativePosition.x, snapped to grid
    expect(result.nodes[0].position.x).toBe(
      Math.round((100 + 0) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
    )
    expect(result.nodes[0].position.y).toBe(
      Math.round((100 + 0) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
    )
    expect(result.nodes[1].position.x).toBe(
      Math.round((100 + 200) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
    )
    expect(result.nodes[1].position.y).toBe(
      Math.round((100 + 0) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
    )
  })

  it("snaps positions to grid", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 3, y: 7 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 11, y: 13 })

    // (11+3) = 14, (13+7) = 20 — snapped to CANVAS_GRID_SIZE boundaries
    expect(result.nodes[0].position.x).toBe(
      Math.round(14 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
    )
    expect(result.nodes[0].position.y).toBe(
      Math.round(20 / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
    )
  })

  it("generates unique IDs for each node", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
        { componentId: "redis", variantId: "standalone", relativePosition: { x: 200, y: 0 } },
        { componentId: "nginx", variantId: "reverse-proxy", relativePosition: { x: 400, y: 0 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })
    const nodeIds = result.nodes.map((n) => n.id)
    const uniqueIds = new Set(nodeIds)

    expect(uniqueIds.size).toBe(3)
  })

  it("generates unique IDs for each edge", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
        { componentId: "redis", variantId: "standalone", relativePosition: { x: 200, y: 0 } },
        { componentId: "nginx", variantId: "reverse-proxy", relativePosition: { x: 400, y: 0 } },
      ],
      connections: [
        { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "cache" },
        { sourceComponentIndex: 1, targetComponentIndex: 2, connectionType: "proxy" },
      ],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })
    const edgeIds = result.edges.map((e) => e.id)
    const uniqueIds = new Set(edgeIds)

    expect(uniqueIds.size).toBe(2)
  })

  it("maps connections to correct generated node IDs", () => {
    const stack = makeStack()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].source).toBe(result.nodes[0].id)
    expect(result.edges[0].target).toBe(result.nodes[1].id)
  })

  it("applies stack variantId as activeConfigVariantId", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "primary-replica", relativePosition: { x: 0, y: 0 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.nodes[0].data.activeConfigVariantId).toBe("primary-replica")
  })

  it("falls back to first variant when variantId not found", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "nonexistent-variant", relativePosition: { x: 0, y: 0 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    // Falls back to first config variant
    expect(result.nodes[0].data.activeConfigVariantId).toBe("single-node")
  })

  it("skips missing components and their connections", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
        { componentId: "unknown-component", variantId: "default", relativePosition: { x: 200, y: 0 } },
      ],
      connections: [
        { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "cache" },
      ],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    // Only postgresql placed, unknown skipped
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].data.archieComponentId).toBe("postgresql")
    // Connection referencing unknown component is also skipped
    expect(result.edges).toHaveLength(0)
  })

  it("sets compatibility data on edges", () => {
    mockCheckCompatibility.mockReturnValue({
      isCompatible: false,
      reason: "Cache invalidation adds complexity",
    })

    const stack = makeStack()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.edges[0].data?.isIncompatible).toBe(true)
    expect(result.edges[0].data?.incompatibilityReason).toBe("Cache invalidation adds complexity")
  })

  it("sets compatible edge data when components are compatible", () => {
    mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })

    const stack = makeStack()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.edges[0].data?.isIncompatible).toBe(false)
    expect(result.edges[0].data?.incompatibilityReason).toBeNull()
  })

  it("builds nodes with correct type and width", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.nodes[0].type).toBe(NODE_TYPE_COMPONENT)
    expect(result.nodes[0].width).toBe(NODE_WIDTH)
  })

  it("sets correct ArchieNodeData fields", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.nodes[0].data.archieComponentId).toBe("postgresql")
    expect(result.nodes[0].data.activeConfigVariantId).toBe("single-node")
    expect(result.nodes[0].data.componentName).toBe("PostgreSQL")
    expect(result.nodes[0].data.componentCategory).toBe("data-storage")
  })

  it("guards invalid component category to 'compute'", () => {
    mockGetComponent.mockImplementation((id: string) => {
      if (id === "weird-comp") {
        return makeComponent({
          id: "weird-comp",
          name: "Weird",
          category: "nonexistent-category" as never,
          configVariants: [makeConfigVariant({ id: "default", name: "Default" })],
        })
      }
      return undefined
    })

    const stack = makeStack({
      components: [
        { componentId: "weird-comp", variantId: "default", relativePosition: { x: 0, y: 0 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.nodes[0].data.componentCategory).toBe("compute")
  })

  it("returns empty arrays for stack with all missing components", () => {
    mockGetComponent.mockReturnValue(undefined)

    const stack = makeStack()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it("handles stack with zero connections", () => {
    const stack = makeStack({
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(0)
  })

  it("handles single-component stack", () => {
    const stack = makeStack({
      components: [
        { componentId: "postgresql", variantId: "single-node", relativePosition: { x: 0, y: 0 } },
      ],
      connections: [],
    })

    const result = resolveStackPlacement(stack, { x: 50, y: 50 })

    expect(result.nodes).toHaveLength(1)
    expect(result.edges).toHaveLength(0)
  })

  it("sets edge sourceArchieComponentId and targetArchieComponentId", () => {
    const stack = makeStack()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.edges[0].data?.sourceArchieComponentId).toBe("postgresql")
    expect(result.edges[0].data?.targetArchieComponentId).toBe("redis")
  })

  it("sets edge type to EDGE_TYPE_CONNECTION", () => {
    const stack = makeStack()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })

    expect(result.edges[0].type).toBe("archie-connection")
  })
})
