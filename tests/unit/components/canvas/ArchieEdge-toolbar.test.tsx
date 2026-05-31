import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ArchieEdge } from "@/components/canvas/ArchieEdge"
import type { ArchieEdgeData } from "@/stores/architectureStore"
import type { EdgeProps, Position } from "@xyflow/react"

// On-object edge toolbar (P1) — focused coverage kept in its own file so the large
// ArchieEdge.test.tsx stays under the size budget.

vi.mock("@xyflow/react", () => ({
  BaseEdge: ({ id, path }: Record<string, unknown>) => (
    <path data-testid="archie-edge" data-id={id as string} d={path as string} />
  ),
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="edge-label-renderer">{children}</div>
  ),
  getBezierPath: () => ["M 0 0 L 100 100", 50, 50],
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}))

const mockRemoveEdges = vi.fn()
let mockSelectedEdgeId: string | null = null

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      edgeHeatmapColors: new Map(),
      updateEdgeLabelOffset: vi.fn(),
      removeEdges: mockRemoveEdges,
    }),
  ),
}))

vi.mock("@/stores/uiStore", () => ({
  useUiStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ heatmapEnabled: false, selectedEdgeId: mockSelectedEdgeId }),
  ),
}))

vi.mock("@/stores/preferencesStore", () => ({
  usePreferencesStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ animationsEnabled: false }),
  ),
}))

vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({ getComponentById: vi.fn() }),
}))

vi.mock("@/hooks/useConnectionHealth", () => ({
  useConnectionHealth: () => ({ density: 0, status: "healthy" as const }),
}))

vi.mock("@/hooks/useEdgeOverlay", () => ({
  useEdgeOverlay: () => null,
}))

vi.mock("@/components/canvas/EdgeParticles", () => ({
  EdgeParticles: () => null,
}))

function createEdgeProps(overrides: Partial<EdgeProps<ArchieEdgeData>> = {}): EdgeProps<ArchieEdgeData> {
  return {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: "right" as Position,
    targetPosition: "left" as Position,
    data: {
      isIncompatible: false,
      incompatibilityReason: null,
      sourceArchieComponentId: "comp-1",
      targetArchieComponentId: "comp-2",
    },
    selected: false,
    markerEnd: undefined,
    ...overrides,
  } as EdgeProps<ArchieEdgeData>
}

function renderEdge(overrides: Partial<EdgeProps<ArchieEdgeData>> = {}) {
  return render(
    <svg>
      <ArchieEdge {...createEdgeProps(overrides)} />
    </svg>,
  )
}

describe("ArchieEdge on-object toolbar (P1)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedEdgeId = null
  })

  it("does not show the toolbar when the edge is not the selected edge", () => {
    mockSelectedEdgeId = "other-edge"
    renderEdge()
    expect(screen.queryByTestId("edge-action-toolbar")).toBeNull()
  })

  it("shows a Remove toolbar when the edge is selected", () => {
    mockSelectedEdgeId = "edge-1"
    renderEdge()
    expect(screen.getByTestId("edge-action-toolbar")).toBeInTheDocument()
    expect(screen.getByTestId("edge-action-toolbar-remove")).toBeInTheDocument()
  })

  it("Remove deletes this edge via removeEdges([id])", () => {
    mockSelectedEdgeId = "edge-1"
    renderEdge()
    fireEvent.click(screen.getByTestId("edge-action-toolbar-remove"))
    expect(mockRemoveEdges).toHaveBeenCalledWith(["edge-1"])
  })
})
