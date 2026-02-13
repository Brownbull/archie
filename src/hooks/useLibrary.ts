import { useMemo } from "react"
import { componentLibrary } from "@/services/componentLibrary"

export function useLibrary() {
  const isReady = componentLibrary.isInitialized()
  const components = useMemo(
    () => componentLibrary.getAllComponents(),
    [isReady],
  )

  return {
    isReady,
    components,
    getComponentById: componentLibrary.getComponent,
    getComponentsByCategory: componentLibrary.getComponentsByCategory,
    searchComponents: componentLibrary.searchComponents,
  }
}
