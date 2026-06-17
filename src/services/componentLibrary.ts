import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { componentRepository } from "@/repositories/componentRepository"
import { stackRepository } from "@/repositories/stackRepository"
import { blueprintRepository } from "@/repositories/blueprintRepository"
import { metricCategoryRepository } from "@/repositories/metricCategoryRepository"
import { isCacheValid, readCached, writeCache, stampCache, clearCache } from "@/services/refDataCache"
import type { Component } from "@/schemas/componentSchema"
import type { Stack } from "@/schemas/stackSchema"
import type { BlueprintFull } from "@/schemas/blueprintSchema"
import type { MetricCategory } from "@/schemas/metricCategorySchema"

let componentMap = new Map<string, Component>()
let categoryMap = new Map<string, Component[]>()
let stackMap = new Map<string, Stack>()
let blueprintMap = new Map<string, BlueprintFull>()
let metricCategoryMap = new Map<string, MetricCategory>()
let initialized = false
let initPromise: Promise<void> | null = null

function populateMaps(
  components: Component[],
  stackData: Stack[],
  blueprintData: BlueprintFull[],
  metricCategoryData: MetricCategory[],
): void {
  const newComponentMap = new Map<string, Component>()
  const newCategoryMap = new Map<string, Component[]>()
  const newBlueprintMap = new Map<string, BlueprintFull>()
  const newMetricCategoryMap = new Map<string, MetricCategory>()
  const newStackMap = new Map<string, Stack>()

  for (const comp of components) {
    newComponentMap.set(comp.id, comp)
    const existing = newCategoryMap.get(comp.category) ?? []
    newCategoryMap.set(comp.category, [...existing, comp])
  }

  for (const bp of blueprintData) {
    newBlueprintMap.set(bp.id, bp)
  }

  for (const mc of metricCategoryData) {
    newMetricCategoryMap.set(mc.id, mc)
  }

  for (const stack of stackData) {
    newStackMap.set(stack.id, stack)
  }

  componentMap = newComponentMap
  categoryMap = newCategoryMap
  stackMap = newStackMap
  blueprintMap = newBlueprintMap
  metricCategoryMap = newMetricCategoryMap
  initialized = true
}

export const componentLibrary = {
  async initialize(): Promise<void> {
    if (initialized) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      const cacheHit = await isCacheValid()

      if (cacheHit) {
        const components = readCached<Component>("components")
        const stackData = readCached<Stack>("stacks")
        const blueprintData = readCached<BlueprintFull>("blueprints")
        const metricCategoryData = readCached<MetricCategory>("metricCategories")

        if (components && stackData && blueprintData && metricCategoryData) {
          populateMaps(components, stackData, blueprintData, metricCategoryData)
          return
        }
      }

      const [components, stackData, blueprintData, metricCategoryData] = await Promise.all([
        componentRepository.getAll(),
        stackRepository.getAll(),
        blueprintRepository.getAll(),
        metricCategoryRepository.getAll(),
      ])

      populateMaps(components, stackData, blueprintData, metricCategoryData)

      try {
        const snap = await getDoc(doc(db, "_metadata", "seed"))
        if (snap.exists()) {
          const meta = snap.data() as { version?: string; seededAt?: string }
          if (meta.version && meta.seededAt) {
            writeCache("components", components)
            writeCache("stacks", stackData)
            writeCache("blueprints", blueprintData)
            writeCache("metricCategories", metricCategoryData)
            stampCache(meta.version, meta.seededAt)
          }
        }
      } catch {
        // metadata read failed — data is loaded in memory, just skip caching
      }
    })().catch((error) => {
      initPromise = null
      throw error
    })

    return initPromise
  },

  isInitialized(): boolean {
    return initialized
  },

  getComponent(id: string): Component | undefined {
    return componentMap.get(id)
  },

  getAllComponents(): Component[] {
    return Array.from(componentMap.values())
  },

  getComponentsByCategory(category: string): Component[] {
    return categoryMap.get(category) ?? []
  },

  searchComponents(query: string): Component[] {
    const lower = query.toLowerCase()
    return Array.from(componentMap.values()).filter(
      (comp) =>
        comp.name.toLowerCase().includes(lower) ||
        comp.category.toLowerCase().includes(lower) ||
        comp.tags.some((tag) => tag.toLowerCase().includes(lower)),
    )
  },

  getStacks(): Stack[] {
    return Array.from(stackMap.values())
  },

  getStackById(id: string): Stack | undefined {
    return stackMap.get(id)
  },

  /** @deprecated Use getAllBlueprints() — kept for backward compatibility */
  getBlueprints(): BlueprintFull[] {
    return Array.from(blueprintMap.values())
  },

  getAllBlueprints(): BlueprintFull[] {
    return Array.from(blueprintMap.values())
  },

  getBlueprint(id: string): BlueprintFull | undefined {
    return blueprintMap.get(id)
  },

  getMetricCategory(id: string): MetricCategory | undefined {
    return metricCategoryMap.get(id)
  },

  getAllMetricCategories(): MetricCategory[] {
    return Array.from(metricCategoryMap.values())
  },

  invalidateCache(): void {
    clearCache()
  },

  reset(): void {
    componentMap = new Map()
    categoryMap = new Map()
    stackMap = new Map()
    blueprintMap = new Map()
    metricCategoryMap = new Map()
    initialized = false
    initPromise = null
  },
}
