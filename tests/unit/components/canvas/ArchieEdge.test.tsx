import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ArchieEdge } from "@/components/canvas/ArchieEdge"
import { HEATMAP_COLORS, MAX_LABEL_OFFSET, LABEL_INCOMPATIBILITY_OFFSET } from "@/lib/constants"
import type { ArchieEdgeData } from "@/stores/architectureStore"
import type { EdgeProps, Position } from "@xyflow/react"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"

vi.mock("@xyflow/react", () => ({
  BaseEdge: ({ id, path, style, ...props }: Record<string, unknown>) => (
    <path
      data-testid="archie-edge"
      data-id={id}
      d={path as string}
      style={style as React.CSSProperties}
      {...props}
    />
  ),
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="edge-label-renderer">{children}</div>
  ),
  getSmoothStepPath: () => ["M 0 0 L 100 100", 50, 50],
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}))

// Mock Zustand stores for heatmap integration
const mockEdgeHeatmapColors = new Map<string, HeatmapStatus>()
const mockUpdateEdgeLabelOffset = vi.fn()
let mockHeatmapEnabled = false

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      edgeHeatmapColors: mockEdgeHeatmapColors,
      updateEdgeLabelOffset: mockUpdateEdgeLabelOffset,
    }),
  ),
}))

vi.mock("@/stores/uiStore", () => ({
  useUiStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ heatmapEnabled: mockHeatmapEnabled }),
  ),
}))

// Mock useLibrary hook for protocol label lookup (TD-4-3b AC-1)
const mockGetComponentById = vi.fn()
vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [],
    getComponentById: mockGetComponentById,
    getComponentsByCategory: vi.fn(),
    searchComponents: vi.fn(),
  }),
}))

function createEdgeProps(
  overrides: Partial<EdgeProps<ArchieEdgeData>> = {},
): EdgeProps<ArchieEdgeData> {
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

// jsdom does not implement setPointerCapture/releasePointerCapture
const mockSetPointerCapture = vi.fn()
const mockReleasePointerCapture = vi.fn()

describe("ArchieEdge", () => {
  beforeEach(() => {
    mockEdgeHeatmapColors.clear()
    mockHeatmapEnabled = false
    mockGetComponentById.mockReset()
    mockUpdateEdgeLabelOffset.mockReset()
    mockSetPointerCapture.mockReset()
    mockReleasePointerCapture.mockReset()
    // Use Element.prototype — label div inside <svg> may be in SVG namespace in jsdom
    Element.prototype.setPointerCapture = mockSetPointerCapture as unknown as (pointerId: number) => void
    Element.prototype.releasePointerCapture = mockReleasePointerCapture as unknown as (pointerId: number) => void
  })

  it("renders edge path", () => {
    render(
      <svg>
        <ArchieEdge {...createEdgeProps()} />
      </svg>,
    )
    expect(screen.getByTestId("archie-edge")).toBeInTheDocument()
  })

  it("does not show warning when compatible", () => {
    render(
      <svg>
        <ArchieEdge {...createEdgeProps()} />
      </svg>,
    )
    expect(screen.queryByTestId("connection-warning")).not.toBeInTheDocument()
  })

  it("shows warning when incompatible", () => {
    render(
      <svg>
        <ArchieEdge
          {...createEdgeProps({
            data: {
              isIncompatible: true,
              incompatibilityReason: "Stale reads risk",
              sourceArchieComponentId: "comp-1",
              targetArchieComponentId: "comp-2",
            },
          })}
        />
      </svg>,
    )
    expect(screen.getByTestId("connection-warning")).toBeInTheDocument()
  })

  it("passes incompatibility reason to ConnectionWarning", () => {
    render(
      <svg>
        <ArchieEdge
          {...createEdgeProps({
            data: {
              isIncompatible: true,
              incompatibilityReason: "Cache stale reads",
              sourceArchieComponentId: "comp-1",
              targetArchieComponentId: "comp-2",
            },
          })}
        />
      </svg>,
    )
    expect(screen.getByTestId("connection-warning")).toHaveAttribute(
      "title",
      "Cache stale reads",
    )
  })

  it("applies default stroke style when compatible", () => {
    render(
      <svg>
        <ArchieEdge {...createEdgeProps()} />
      </svg>,
    )
    const edge = screen.getByTestId("archie-edge")
    expect(edge).toHaveStyle({ strokeWidth: 1.5 })
  })

  it("applies dashed stroke when incompatible", () => {
    render(
      <svg>
        <ArchieEdge
          {...createEdgeProps({
            data: {
              isIncompatible: true,
              incompatibilityReason: "Test",
              sourceArchieComponentId: "a",
              targetArchieComponentId: "b",
            },
          })}
        />
      </svg>,
    )
    const edge = screen.getByTestId("archie-edge")
    expect(edge).toHaveStyle({ strokeDasharray: "5 3" })
  })

  it("applies thicker stroke when selected", () => {
    render(
      <svg>
        <ArchieEdge {...createEdgeProps({ selected: true })} />
      </svg>,
    )
    const edge = screen.getByTestId("archie-edge")
    expect(edge).toHaveStyle({ strokeWidth: 2.5 })
  })

  it("applies amber color and thick stroke when selected AND incompatible", () => {
    render(
      <svg>
        <ArchieEdge
          {...createEdgeProps({
            selected: true,
            data: {
              isIncompatible: true,
              incompatibilityReason: "Test",
              sourceArchieComponentId: "a",
              targetArchieComponentId: "b",
            },
          })}
        />
      </svg>,
    )
    const edge = screen.getByTestId("archie-edge")
    expect(edge).toHaveStyle({ strokeWidth: 2.5, strokeDasharray: "5 3" })
  })

  describe("heatmap stroke", () => {
    it("applies heatmap stroke color when enabled and status exists", () => {
      mockHeatmapEnabled = true
      mockEdgeHeatmapColors.set("edge-1", "warning")
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const edge = screen.getByTestId("archie-edge")
      expect(edge).toHaveStyle({ stroke: HEATMAP_COLORS.warning, strokeWidth: 2 })
    })

    it("reverts to default stroke when heatmap disabled", () => {
      mockHeatmapEnabled = false
      mockEdgeHeatmapColors.set("edge-1", "bottleneck")
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const edge = screen.getByTestId("archie-edge")
      expect(edge).toHaveStyle({ stroke: "var(--archie-border)" })
    })

    it("preserves dashed pattern for incompatible edges when heatmap active", () => {
      mockHeatmapEnabled = true
      mockEdgeHeatmapColors.set("edge-1", "bottleneck")
      render(
        <svg>
          <ArchieEdge
            {...createEdgeProps({
              data: {
                isIncompatible: true,
                incompatibilityReason: "Test",
                sourceArchieComponentId: "a",
                targetArchieComponentId: "b",
              },
            })}
          />
        </svg>,
      )
      const edge = screen.getByTestId("archie-edge")
      expect(edge).toHaveStyle({
        stroke: HEATMAP_COLORS.bottleneck,
        strokeDasharray: "5 3",
      })
    })

    it("ConnectionWarning still visible for incompatible edges when heatmap active", () => {
      mockHeatmapEnabled = true
      mockEdgeHeatmapColors.set("edge-1", "warning")
      render(
        <svg>
          <ArchieEdge
            {...createEdgeProps({
              data: {
                isIncompatible: true,
                incompatibilityReason: "Stale reads",
                sourceArchieComponentId: "a",
                targetArchieComponentId: "b",
              },
            })}
          />
        </svg>,
      )
      expect(screen.getByTestId("connection-warning")).toBeInTheDocument()
    })

    it("has transition style for smooth stroke changes", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const edge = screen.getByTestId("archie-edge")
      expect(edge).toHaveStyle({ transition: "stroke 300ms ease, stroke-width 300ms ease" })
    })

    it("selected edge increases stroke width regardless of heatmap", () => {
      mockHeatmapEnabled = true
      mockEdgeHeatmapColors.set("edge-1", "healthy")
      render(
        <svg>
          <ArchieEdge {...createEdgeProps({ selected: true })} />
        </svg>,
      )
      const edge = screen.getByTestId("archie-edge")
      expect(edge).toHaveStyle({ strokeWidth: 2.5 })
    })

    it("selected edge keeps heatmap color when heatmap enabled", () => {
      mockHeatmapEnabled = true
      mockEdgeHeatmapColors.set("edge-1", "bottleneck")
      render(
        <svg>
          <ArchieEdge {...createEdgeProps({ selected: true })} />
        </svg>,
      )
      const edge = screen.getByTestId("archie-edge")
      expect(edge).toHaveStyle({
        stroke: HEATMAP_COLORS.bottleneck,
        strokeWidth: 2.5,
      })
    })

    it("selected edge uses accent color when heatmap disabled and compatible", () => {
      mockHeatmapEnabled = false
      render(
        <svg>
          <ArchieEdge {...createEdgeProps({ selected: true })} />
        </svg>,
      )
      const edge = screen.getByTestId("archie-edge")
      expect(edge).toHaveStyle({
        stroke: "var(--archie-accent)",
        strokeWidth: 2.5,
      })
    })
  })

  describe("protocol label", () => {
    it("renders protocol label when source component has connectionProperties", () => {
      mockGetComponentById.mockReturnValue({
        connectionProperties: {
          protocol: "gRPC",
          communicationPatterns: ["streaming"],
          typicalLatency: "1ms",
          coLocationPotential: true,
        },
      })
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      expect(screen.getByTestId("edge-label-edge-1")).toBeInTheDocument()
      expect(screen.getByText("gRPC")).toBeInTheDocument()
      expect(mockGetComponentById).toHaveBeenCalledWith("comp-1")
    })

    it("does not render protocol label when source component has no connectionProperties", () => {
      mockGetComponentById.mockReturnValue({ connectionProperties: undefined })
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      expect(screen.queryByTestId("edge-label-edge-1")).not.toBeInTheDocument()
    })

    it("does not render protocol label when source component not found", () => {
      mockGetComponentById.mockReturnValue(undefined)
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      expect(screen.queryByTestId("edge-label-edge-1")).not.toBeInTheDocument()
    })

    it("protocol label applies stored labelOffset to position", () => {
      mockGetComponentById.mockReturnValue({
        connectionProperties: {
          protocol: "TCP",
          communicationPatterns: [],
          typicalLatency: "5ms",
          coLocationPotential: false,
        },
      })
      render(
        <svg>
          <ArchieEdge
            {...createEdgeProps({
              data: {
                isIncompatible: false,
                incompatibilityReason: null,
                sourceArchieComponentId: "comp-1",
                targetArchieComponentId: "comp-2",
                labelOffset: { x: 20, y: -10 },
              },
            })}
          />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      // labelX=50, labelY=50 (from getSmoothStepPath mock) + offset
      expect(label.style.transform).toContain("70px")
      expect(label.style.transform).toContain("40px")
    })

    it("protocol label shifts up by LABEL_INCOMPATIBILITY_OFFSET when incompatible", () => {
      mockGetComponentById.mockReturnValue({
        connectionProperties: {
          protocol: "gRPC",
          communicationPatterns: ["streaming"],
          typicalLatency: "1ms",
          coLocationPotential: true,
        },
      })
      render(
        <svg>
          <ArchieEdge
            {...createEdgeProps({
              data: {
                isIncompatible: true,
                incompatibilityReason: "Stale reads",
                sourceArchieComponentId: "comp-1",
                targetArchieComponentId: "comp-2",
              },
            })}
          />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      // labelY=50 (from getSmoothStepPath mock) - LABEL_INCOMPATIBILITY_OFFSET = 34
      expect(label.style.transform).toContain(`${50 - LABEL_INCOMPATIBILITY_OFFSET}px`)
    })

    it("protocol label has pointer-events-auto class for drag interaction", () => {
      mockGetComponentById.mockReturnValue({
        connectionProperties: {
          protocol: "HTTP",
          communicationPatterns: [],
          typicalLatency: "10ms",
          coLocationPotential: false,
        },
      })
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      expect(label.getAttribute("class")).toContain("pointer-events-auto")
    })
  })

  describe("drag interaction", () => {
    const connectionProps = {
      protocol: "gRPC",
      communicationPatterns: ["streaming"],
      typicalLatency: "1ms",
      coLocationPotential: true,
    }

    beforeEach(() => {
      mockGetComponentById.mockReturnValue({ connectionProperties: connectionProps })
    })

    it("pointerdown captures pointer on the label element", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 100, clientY: 100, pointerId: 1 })
      expect(mockSetPointerCapture).toHaveBeenCalledWith(1)
    })

    it("pointermove does NOT call updateEdgeLabelOffset during drag", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: 130, clientY: 110, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: 150, clientY: 120, pointerId: 1 })
      expect(mockUpdateEdgeLabelOffset).not.toHaveBeenCalled()
    })

    it("pointerup commits offset to store exactly once with correct delta", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: 130, clientY: 110, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: 150, clientY: 120, pointerId: 1 })
      fireEvent.pointerUp(label, { clientX: 150, clientY: 120, pointerId: 1 })
      expect(mockUpdateEdgeLabelOffset).toHaveBeenCalledTimes(1)
      expect(mockUpdateEdgeLabelOffset).toHaveBeenCalledWith("edge-1", { x: 50, y: 20 })
    })

    it("pointerup calls releasePointerCapture", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerUp(label, { clientX: 120, clientY: 100, pointerId: 1 })
      expect(mockReleasePointerCapture).toHaveBeenCalledWith(1)
    })

    it("clamps positive offset to MAX_LABEL_OFFSET before store commit", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 0, clientY: 0, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: 999, clientY: 999, pointerId: 1 })
      fireEvent.pointerUp(label, { clientX: 999, clientY: 999, pointerId: 1 })
      expect(mockUpdateEdgeLabelOffset).toHaveBeenCalledWith("edge-1", {
        x: MAX_LABEL_OFFSET,
        y: MAX_LABEL_OFFSET,
      })
    })

    it("clamps negative offset to -MAX_LABEL_OFFSET before store commit", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 0, clientY: 0, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: -999, clientY: -999, pointerId: 1 })
      fireEvent.pointerUp(label, { clientX: -999, clientY: -999, pointerId: 1 })
      expect(mockUpdateEdgeLabelOffset).toHaveBeenCalledWith("edge-1", {
        x: -MAX_LABEL_OFFSET,
        y: -MAX_LABEL_OFFSET,
      })
    })

    it("incorporates existing labelOffset into drag delta", () => {
      render(
        <svg>
          <ArchieEdge
            {...createEdgeProps({
              data: {
                isIncompatible: false,
                incompatibilityReason: null,
                sourceArchieComponentId: "comp-1",
                targetArchieComponentId: "comp-2",
                labelOffset: { x: 10, y: -5 },
              },
            })}
          />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: 120, clientY: 90, pointerId: 1 })
      fireEvent.pointerUp(label, { clientX: 120, clientY: 90, pointerId: 1 })
      // originOffset (10, -5) + delta (20, -10) = (30, -15)
      expect(mockUpdateEdgeLabelOffset).toHaveBeenCalledWith("edge-1", { x: 30, y: -15 })
    })

    it("commits store on pointercancel (same as pointerup)", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: 130, clientY: 110, pointerId: 1 })
      fireEvent.pointerCancel(label, { clientX: 130, clientY: 110, pointerId: 1 })
      expect(mockUpdateEdgeLabelOffset).toHaveBeenCalledTimes(1)
      expect(mockReleasePointerCapture).toHaveBeenCalledWith(1)
    })

    it("does not call updateEdgeLabelOffset on pointerup without prior pointerdown", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerUp(label, { clientX: 50, clientY: 50, pointerId: 1 })
      expect(mockUpdateEdgeLabelOffset).not.toHaveBeenCalled()
      expect(mockReleasePointerCapture).toHaveBeenCalledWith(1)
    })

    it("passes through offset at exact MAX_LABEL_OFFSET boundary without clamping", () => {
      render(
        <svg>
          <ArchieEdge {...createEdgeProps()} />
        </svg>,
      )
      const label = screen.getByTestId("edge-label-edge-1")
      fireEvent.pointerDown(label, { clientX: 0, clientY: 0, pointerId: 1 })
      fireEvent.pointerMove(label, { clientX: MAX_LABEL_OFFSET, clientY: -MAX_LABEL_OFFSET, pointerId: 1 })
      fireEvent.pointerUp(label, { clientX: MAX_LABEL_OFFSET, clientY: -MAX_LABEL_OFFSET, pointerId: 1 })
      expect(mockUpdateEdgeLabelOffset).toHaveBeenCalledWith("edge-1", {
        x: MAX_LABEL_OFFSET,
        y: -MAX_LABEL_OFFSET,
      })
    })
  })
})
