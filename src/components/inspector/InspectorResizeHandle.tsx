import { useRef } from "react"
import { useUiStore } from "@/stores/uiStore"
import { INSPECTOR_MIN_WIDTH, INSPECTOR_MAX_WIDTH } from "@/lib/constants"

/**
 * Drag-resize handle for the inspector panel (AC-2, AC-3).
 *
 * Uses pointer events with setPointerCapture for smooth cross-device dragging.
 * Renders as a 4px-wide vertical bar on the inspector's left edge.
 */
export function InspectorResizeHandle() {
  const startX = useRef(0)
  const startWidth = useRef(0)
  const setInspectorWidth = useUiStore((s) => s.setInspectorWidth)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startX.current = e.clientX
    // Read width imperatively to avoid re-renders on every drag pixel
    startWidth.current = useUiStore.getState().inspectorWidth
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    // Leftward drag = wider inspector (inspector is on the right)
    const delta = startX.current - e.clientX
    const newWidth = Math.max(
      INSPECTOR_MIN_WIDTH,
      Math.min(INSPECTOR_MAX_WIDTH, startWidth.current + delta),
    )
    setInspectorWidth(newWidth)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div
      data-testid="inspector-resize-handle"
      className="w-1 cursor-col-resize select-none hover:bg-archie-accent/40 active:bg-archie-accent/60"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}
