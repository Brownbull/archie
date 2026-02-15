import { useRef, useCallback, useState, createContext, useContext, type ReactNode } from "react"
import { toast } from "sonner"
import { importYaml } from "@/services/yamlImporter"
import { useArchitectureStore } from "@/stores/architectureStore"
import { ValidationErrors } from "@/components/import-export/ValidationErrors"

interface ImportContextType {
  triggerFilePicker: () => void
  handleFileDrop: (file: File) => void
  isImporting: boolean
}

const ImportContext = createContext<ImportContextType>({
  triggerFilePicker: () => {},
  handleFileDrop: () => {},
  isImporting: false,
})

// eslint-disable-next-line react-refresh/only-export-components -- standard context+hook pattern
export function useImportAction() {
  return useContext(ImportContext)
}

interface ImportProviderProps {
  children: ReactNode
}

export function ImportProvider({ children }: ImportProviderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const loadArchitecture = useArchitectureStore((s) => s.loadArchitecture)

  const handleFile = useCallback(async (file: File) => {
    setIsImporting(true)
    try {
      const result = await importYaml(file)

      if (result.success) {
        loadArchitecture(result.architecture.nodes, result.architecture.edges)

        const placeholderCount = result.architecture.placeholderIds.length
        const nameLabel = result.architecture.name ? `"${result.architecture.name}" ` : ""
        if (placeholderCount > 0) {
          toast.warning(`Imported ${nameLabel}with ${placeholderCount} unknown component(s)`)
        } else {
          toast.success(`${nameLabel}Imported (${result.architecture.nodes.length} components)`)
        }
      } else {
        toast.error("Import failed", {
          description: (
            <ValidationErrors errors={result.errors} />
          ),
          duration: 8000,
        })
      }
    } catch {
      toast.error("Unexpected error during import")
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [loadArchitecture])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <ImportContext.Provider value={{ triggerFilePicker, handleFileDrop: handleFile, isImporting }}>
      <input
        ref={fileInputRef}
        data-testid="import-file-input"
        type="file"
        accept=".yaml,.yml"
        className="hidden"
        onChange={handleFileChange}
        disabled={isImporting}
      />
      {children}
    </ImportContext.Provider>
  )
}
