import { useCallback } from "react"
import { toast } from "sonner"
import { FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArchitectureStore, getArchitectureSkeleton } from "@/stores/architectureStore"
import { exportArchitecture } from "@/services/yamlExporter"

/**
 * Export button — dehydrates current canvas state to a skeleton YAML file download.
 *
 * Blob URL lifecycle (AC-8, AC-ARCH-PATTERN-5):
 *   create Blob → URL.createObjectURL() → hidden <a> click → setTimeout(revokeObjectURL, 1000)
 */
export function ExportButton() {
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const isEmpty = nodeCount === 0

  const handleExport = useCallback(() => {
    // Self-protecting guard: disabled state is enforced in JSX, but guard here in case
    // the button is invoked programmatically or via assistive technology
    if (getArchitectureSkeleton().nodes.length === 0) return

    try {
      const { nodes, edges } = getArchitectureSkeleton()
      const yamlString = exportArchitecture(nodes, edges)

      const blob = new Blob([yamlString], { type: "application/x-yaml" })
      const url = URL.createObjectURL(blob)

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const filename = `archie-architecture-${timestamp}.yaml`

      // Append to body before click for cross-browser reliability, then remove
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      // Revoke after download has time to start (AC-ARCH-NO-3)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
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
