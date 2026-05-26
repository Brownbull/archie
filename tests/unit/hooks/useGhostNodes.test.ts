import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { NODE_TYPE_GHOST } from "@/lib/constants"
import type { PathwaySuggestion } from "@/engine/pathwayEngine"

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

vi.mock("@/hooks/usePathwaySuggestions", () => ({
  usePathwaySuggestions: vi.fn(),
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getAllComponents: vi.fn(() => []),
    isInitialized: vi.fn(() => true),
  },
}))

import { useArchitectureStore } from "@/stores/architectureStore"
import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions"
import { useGhostNodes } from "@/hooks/useGhostNodes"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)
const mockUsePathwaySuggestions = vi.mocked(usePathwaySuggestions)

function makeSuggestion(id: string, name: string): PathwaySuggestion {
  return {
    componentId: id,
    componentName: name,
    category: "data-storage",
    gapClosed: "test gap",
    weightedScore: 7,
    isConstraintSafe: true,
    reason: `Adding ${name} closes a gap`,
  }
}

function setupMocks(opts: {
  nodes?: { id: string; position: { x: number; y: number }; data: Record<string, unknown> }[]
  edges?: { id: string; source: string; target: string }[]
  suggestions?: PathwaySuggestion[]
}) {
  const nodes = opts.nodes ?? []
  const edges = opts.edges ?? []

  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = { nodes, edges }
    return (selector as (s: typeof state) => unknown)(state)
  })

  mockUsePathwaySuggestions.mockReturnValue({
    suggestions: opts.suggestions ?? [],
    hasGaps: (opts.suggestions ?? []).length > 0,
    nextTierName: "Professional",
  })
}

describe("useGhostNodes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty array when no suggestions", () => {
    setupMocks({ nodes: [{ id: "n1", position: { x: 100, y: 100 }, data: {} }], suggestions: [] })
    const { result } = renderHook(() => useGhostNodes())
    expect(result.current).toEqual([])
  })

  it("returns empty array when no nodes", () => {
    setupMocks({ nodes: [], suggestions: [makeSuggestion("pg", "PostgreSQL")] })
    const { result } = renderHook(() => useGhostNodes())
    expect(result.current).toEqual([])
  })

  it("returns ghost nodes for open source handles", () => {
    setupMocks({
      nodes: [{ id: "n1", position: { x: 100, y: 100 }, data: {} }],
      edges: [],
      suggestions: [makeSuggestion("pg", "PostgreSQL")],
    })

    const { result } = renderHook(() => useGhostNodes())

    expect(result.current).toHaveLength(1)
    expect(result.current[0].type).toBe(NODE_TYPE_GHOST)
    expect(result.current[0].id).toBe("ghost-n1-pg")
    expect(result.current[0].data.ghostComponentId).toBe("pg")
    expect(result.current[0].data.anchorNodeId).toBe("n1")
    expect(result.current[0].draggable).toBe(false)
    expect(result.current[0].selectable).toBe(false)
  })

  it("returns empty when all nodes have outgoing edges", () => {
    setupMocks({
      nodes: [
        { id: "n1", position: { x: 100, y: 100 }, data: {} },
        { id: "n2", position: { x: 300, y: 100 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n1" },
      ],
      suggestions: [makeSuggestion("pg", "PostgreSQL")],
    })

    const { result } = renderHook(() => useGhostNodes())
    expect(result.current).toEqual([])
  })
})
