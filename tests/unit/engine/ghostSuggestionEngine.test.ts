import { describe, it, expect } from "vitest"
import { computeGhostPlacements } from "@/engine/ghostSuggestionEngine"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"
import type { PathwaySuggestion } from "@/engine/pathwayEngine"
import { GHOST_SUGGESTION_LIMIT, GHOST_OFFSET_X, CANVAS_GRID_SIZE } from "@/lib/constants"

function makeNode(id: string, x = 100, y = 100): ArchieNode {
  return {
    id,
    type: "archie-component",
    position: { x, y },
    data: {
      archieComponentId: `comp-${id}`,
      componentName: `Component ${id}`,
      componentCategory: "compute",
      activeConfigVariantId: "default",
    },
  } as ArchieNode
}

function makeEdge(source: string, target: string): ArchieEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "archie-connection",
    data: {
      isIncompatible: false,
      incompatibilityReason: null,
      sourceArchieComponentId: `comp-${source}`,
      targetArchieComponentId: `comp-${target}`,
    },
  } as ArchieEdge
}

function makeSuggestion(componentId: string, name = "Suggested"): PathwaySuggestion {
  return {
    componentId,
    componentName: name,
    category: "data-storage",
    gapClosed: "test gap",
    weightedScore: 7.5,
    isConstraintSafe: true,
    reason: `Adding ${name} closes a tier gap`,
  }
}

describe("computeGhostPlacements", () => {
  it("returns empty when no nodes", () => {
    const result = computeGhostPlacements([], [], [makeSuggestion("pg")])
    expect(result).toEqual([])
  })

  it("returns empty when no suggestions", () => {
    const result = computeGhostPlacements([makeNode("n1")], [], [])
    expect(result).toEqual([])
  })

  it("returns empty when all nodes have outgoing edges", () => {
    const nodes = [makeNode("n1"), makeNode("n2")]
    const edges = [makeEdge("n1", "n2"), makeEdge("n2", "n1")]
    const result = computeGhostPlacements(nodes, edges, [makeSuggestion("pg")])
    expect(result).toEqual([])
  })

  it("places a ghost next to a node with no outgoing edge", () => {
    const nodes = [makeNode("n1", 100, 200)]
    const result = computeGhostPlacements(nodes, [], [makeSuggestion("pg", "PostgreSQL")])

    expect(result).toHaveLength(1)
    expect(result[0].componentId).toBe("pg")
    expect(result[0].componentName).toBe("PostgreSQL")
    expect(result[0].anchorNodeId).toBe("n1")
    expect(result[0].position.x).toBe(
      Math.round((100 + GHOST_OFFSET_X) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
    )
  })

  it("only targets nodes without outgoing edges", () => {
    const nodes = [makeNode("n1"), makeNode("n2")]
    const edges = [makeEdge("n1", "n2")]
    const suggestions = [makeSuggestion("pg"), makeSuggestion("redis")]

    const result = computeGhostPlacements(nodes, edges, suggestions)

    expect(result).toHaveLength(1)
    expect(result[0].anchorNodeId).toBe("n2")
  })

  it("respects GHOST_SUGGESTION_LIMIT", () => {
    const nodes = Array.from({ length: 10 }, (_, i) => makeNode(`n${i}`, i * 200, 0))
    const suggestions = Array.from({ length: 10 }, (_, i) => makeSuggestion(`comp-${i}`, `Comp ${i}`))

    const result = computeGhostPlacements(nodes, [], suggestions)
    expect(result).toHaveLength(GHOST_SUGGESTION_LIMIT)
  })

  it("does not reuse the same suggestion for multiple anchors", () => {
    const nodes = [makeNode("n1"), makeNode("n2")]
    const suggestions = [makeSuggestion("pg"), makeSuggestion("redis")]

    const result = computeGhostPlacements(nodes, [], suggestions)
    const componentIds = result.map((p) => p.componentId)
    expect(new Set(componentIds).size).toBe(componentIds.length)
  })

  it("snaps position to grid", () => {
    const nodes = [makeNode("n1", 107, 53)]
    const result = computeGhostPlacements(nodes, [], [makeSuggestion("pg")])

    expect(result[0].position.x % CANVAS_GRID_SIZE).toBe(0)
    expect(result[0].position.y % CANVAS_GRID_SIZE).toBe(0)
  })
})
