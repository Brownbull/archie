import { componentRepository } from "@/repositories/componentRepository"
import { stackRepository } from "@/repositories/stackRepository"
import { blueprintRepository } from "@/repositories/blueprintRepository"
import { metricCategoryRepository } from "@/repositories/metricCategoryRepository"
import type { Component } from "@/schemas/componentSchema"
import type { Stack } from "@/schemas/stackSchema"
import type { BlueprintFull } from "@/schemas/blueprintSchema"
import type { MetricCategory } from "@/schemas/metricCategorySchema"

let componentMap = new Map<string, Component>()
let categoryMap = new Map<string, Component[]>()
let stacks: Stack[] = []
let blueprintMap = new Map<string, BlueprintFull>()
let metricCategoryMap = new Map<string, MetricCategory>()
let initialized = false
let initPromise: Promise<void> | null = null

export const componentLibrary = {
  async initialize(): Promise<void> {
    if (initialized) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      const [components, stackData, blueprintData, metricCategoryData] = await Promise.all([
        componentRepository.getAll(),
        stackRepository.getAll(),
        blueprintRepository.getAll(),
        metricCategoryRepository.getAll(),
      ])

      const newComponentMap = new Map<string, Component>()
      const newCategoryMap = new Map<string, Component[]>()
      const newBlueprintMap = new Map<string, BlueprintFull>()

      for (const comp of components) {
        newComponentMap.set(comp.id, comp)
        const existing = newCategoryMap.get(comp.category) ?? []
        newCategoryMap.set(comp.category, [...existing, comp])
      }

      for (const bp of blueprintData) {
        newBlueprintMap.set(bp.id, bp)
      }

      const newMetricCategoryMap = new Map<string, MetricCategory>()
      for (const mc of metricCategoryData) {
        newMetricCategoryMap.set(mc.id, mc)
      }

      componentMap = newComponentMap
      categoryMap = newCategoryMap
      stacks = stackData
      blueprintMap = newBlueprintMap
      metricCategoryMap = newMetricCategoryMap
      initialized = true
    })().catch((error) => {
      initPromise = null // Allow retry on failure
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
    return stacks
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

  reset(): void {
    componentMap = new Map()
    categoryMap = new Map()
    stacks = []
    blueprintMap = new Map()
    metricCategoryMap = new Map()
    initialized = false
    initPromise = null
  },
}
