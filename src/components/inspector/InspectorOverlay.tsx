import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useUiStore } from "@/stores/uiStore"
import { Button } from "@/components/ui/button"
import { TOOLBOX_WIDTH, Z_INDEX } from "@/lib/constants"

/**
 * Full-screen overlay for the inspector panel (AC-4, AC-5).
 *
 * Rendered as a portal to document.body (AC-ARCH-PATTERN-4) so it sits
 * outside the flex layout. Covers the viewport minus the toolbox.
 * Closes on close button click or Escape key.
 */
export function InspectorOverlay({ children }: { children: React.ReactNode }) {
  const inspectorOverlay = useUiStore((s) => s.inspectorOverlay)
  const setInspectorOverlay = useUiStore((s) => s.setInspectorOverlay)

  useEffect(() => {
    if (!inspectorOverlay) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInspectorOverlay(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [inspectorOverlay, setInspectorOverlay])

  if (!inspectorOverlay) return null

  return createPortal(
    <div
      data-testid="inspector-overlay"
      className={`fixed inset-0 ${Z_INDEX.INSPECTOR_OVERLAY} flex`}
      style={{ left: `${TOOLBOX_WIDTH}px` }}
    >
      {/* Backdrop — click to close (keyboard users use Escape or close button) */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setInspectorOverlay(false)}
        aria-hidden="true"
      />

      {/* Overlay content panel */}
      <div className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-archie-border px-4 py-2">
          <span className="text-sm font-medium text-text-primary">Inspector</span>
          <Button
            variant="ghost"
            size="icon"
            data-testid="inspector-overlay-close"
            onClick={() => setInspectorOverlay(false)}
            aria-label="Close overlay"
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
