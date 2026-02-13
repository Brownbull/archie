import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ArchieEdge } from "@/components/canvas/ArchieEdge"
import type { ArchieEdgeData } from "@/stores/architectureStore"
import type { EdgeProps, Position } from "@xyflow/react"

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

describe("ArchieEdge", () => {
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
})
