import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArchitectureStore, getArchitectureSkeleton } from "@/stores/architectureStore"
import { exportArchitecture } from "@/services/yamlExporter"

// Delay before revoking the Blob URL — allows the browser to initiate the download
// before the URL is invalidated. 1s is sufficient across all major browsers.
export const BLOB_REVOKE_DELAY_MS = 1000

/**
 * Export button — dehydrates current canvas state to a skeleton YAML file download.
 *
 * Blob URL lifecycle (AC-8, AC-ARCH-PATTERN-5):
 *   create Blob → URL.createObjectURL() → hidden <a> click → setTimeout(revokeObjectURL, BLOB_REVOKE_DELAY_MS)
 *
 * Both the timeout ID and the Blob URL are stored in refs so the cleanup function can
 * cancel the timer AND revoke the URL on unmount (TD-3-2a), preventing memory leaks in
 * React Strict Mode double-invocation and rapid unmount scenarios.
 */
export function ExportButton() {
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const isEmpty = nodeCount === 0

  const revokeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (revokeTimeoutRef.current !== null) {
        clearTimeout(revokeTimeoutRef.current)
        revokeTimeoutRef.current = null
      }
      if (blobUrlRef.current !== null) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  const handleExport = useCallback(() => {
    const { nodes, edges } = getArchitectureSkeleton()
    // Self-protecting guard: disabled state is enforced in JSX, but guard here in case
    // the button is invoked programmatically or via assistive technology
    if (nodes.length === 0) return

    try {
      const yamlString = exportArchitecture(nodes, edges)

      const blob = new Blob([yamlString], { type: "application/x-yaml" })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const filename = `archie-architecture-${timestamp}.yaml`

      // Append to body before click for cross-browser reliability, then remove
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      // Revoke after download has time to start (AC-ARCH-NO-3, TD-3-2a)
      revokeTimeoutRef.current = setTimeout(() => {
        URL.revokeObjectURL(url)
        blobUrlRef.current = null
        revokeTimeoutRef.current = null
      }, BLOB_REVOKE_DELAY_MS)
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error"
      toast.error("Export failed", { description: detail })
    }
  }, [])

  return (
    <Button
      data-testid="export-button"
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={isEmpty}
      className="gap-1.5"
    >
      <FileDown className="h-3.5 w-3.5" />
      Export
    </Button>
  )
}
