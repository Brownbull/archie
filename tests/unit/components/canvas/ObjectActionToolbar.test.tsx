import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ObjectActionToolbar, type ObjectAction } from "@/components/canvas/ObjectActionToolbar"

function makeActions(onDup = vi.fn(), onRemove = vi.fn()): ObjectAction[] {
  return [
    { id: "duplicate", label: "Duplicate", icon: <span data-testid="icon-dup" />, onClick: onDup },
    {
      id: "remove",
      label: "Remove",
      icon: <span data-testid="icon-rm" />,
      onClick: onRemove,
      variant: "danger",
    },
  ]
}

describe("ObjectActionToolbar", () => {
  it("renders a button per action with composed test ids and aria-labels", () => {
    render(<ObjectActionToolbar testId="node-action-toolbar" actions={makeActions()} />)

    const toolbar = screen.getByTestId("node-action-toolbar")
    expect(toolbar).toHaveAttribute("role", "toolbar")

    expect(screen.getByTestId("node-action-toolbar-duplicate")).toHaveAttribute("aria-label", "Duplicate")
    expect(screen.getByTestId("node-action-toolbar-remove")).toHaveAttribute("aria-label", "Remove")
  })

  it("invokes the action onClick and stops propagation to the canvas", () => {
    const onDup = vi.fn()
    const onRemove = vi.fn()
    const parentClick = vi.fn()

    render(
      <div onClick={parentClick}>
        <ObjectActionToolbar testId="tb" actions={makeActions(onDup, onRemove)} />
      </div>,
    )

    fireEvent.click(screen.getByTestId("tb-duplicate"))
    expect(onDup).toHaveBeenCalledTimes(1)
    expect(parentClick).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId("tb-remove"))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(parentClick).not.toHaveBeenCalled()
  })

  it("tints danger actions with a destructive hover style", () => {
    render(<ObjectActionToolbar testId="tb" actions={makeActions()} />)
    expect(screen.getByTestId("tb-remove").className).toMatch(/red-/)
    expect(screen.getByTestId("tb-duplicate").className).not.toMatch(/red-/)
  })

  it("carries nodrag/nopan so canvas pan/drag is not triggered through the toolbar", () => {
    render(<ObjectActionToolbar testId="tb" actions={makeActions()} />)
    const toolbar = screen.getByTestId("tb")
    expect(toolbar.className).toContain("nodrag")
    expect(toolbar.className).toContain("nopan")
  })
})
