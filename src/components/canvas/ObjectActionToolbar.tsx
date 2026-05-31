import type { ReactNode } from "react"

export interface ObjectAction {
  /** Stable id; also used to compose the button's data-testid (`${testId}-${id}`). */
  id: string
  /** Accessible label + tooltip. */
  label: string
  icon: ReactNode
  onClick: () => void
  /** "danger" tints the button for destructive actions (e.g. Remove). */
  variant?: "default" | "danger"
}

interface ObjectActionToolbarProps {
  actions: ObjectAction[]
  /** Root data-testid; each button gets `${testId}-${action.id}`. */
  testId: string
}

/**
 * A small floating row of icon buttons shown on a selected canvas object (node or edge).
 *
 * Presentational only — callers own the positioning (React Flow's `NodeToolbar` for nodes,
 * `EdgeLabelRenderer` for edges) and wire each action to a store mutation. `nodrag nopan`
 * stops clicks here from panning/dragging the canvas underneath.
 */
export function ObjectActionToolbar({ actions, testId }: ObjectActionToolbarProps) {
  return (
    <div
      data-testid={testId}
      role="toolbar"
      className="nodrag nopan flex items-center gap-0.5 rounded-md border border-archie-border bg-panel px-1 py-1 shadow-lg"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          data-testid={`${testId}-${action.id}`}
          aria-label={action.label}
          title={action.label}
          onClick={(e) => {
            e.stopPropagation()
            action.onClick()
          }}
          className={[
            "flex h-7 w-7 items-center justify-center rounded transition-colors",
            action.variant === "danger"
              ? "text-text-secondary hover:bg-red-500/15 hover:text-red-400"
              : "text-text-secondary hover:bg-surface hover:text-text-primary",
          ].join(" ")}
        >
          {action.icon}
        </button>
      ))}
    </div>
  )
}
