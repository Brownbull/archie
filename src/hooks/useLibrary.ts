import { useMemo } from "react"
import { componentLibrary } from "@/services/componentLibrary"

export function useLibrary() {
  const isReady = componentLibrary.isInitialized()
  const components = useMemo(
    () => componentLibrary.getAllComponents(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- componentLibrary is a singleton initialized once at app startup; components list is stable after init
    [],
  )

  return {
    isReady,
    components,
    getComponentById: componentLibrary.getComponent,
    getComponentsByCategory: componentLibrary.getComponentsByCategory,
    searchComponents: componentLibrary.searchComponents,
  }
}
