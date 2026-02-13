import { componentRepository } from "@/repositories/componentRepository"
import { stackRepository } from "@/repositories/stackRepository"
import { blueprintRepository } from "@/repositories/blueprintRepository"
import type { Component } from "@/schemas/componentSchema"
import type { Stack } from "@/schemas/stackSchema"
import type { Blueprint } from "@/schemas/blueprintSchema"

let componentMap = new Map<string, Component>()
let categoryMap = new Map<string, Component[]>()
let stacks: Stack[] = []
let blueprints: Blueprint[] = []
let initialized = false
let initPromise: Promise<void> | null = null

export const componentLibrary = {
  async initialize(): Promise<void> {
    if (initialized) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      const [components, stackData, blueprintData] = await Promise.all([
        componentRepository.getAll(),
        stackRepository.getAll(),
        blueprintRepository.getAll(),
      ])

      const newComponentMap = new Map<string, Component>()
      const newCategoryMap = new Map<string, Component[]>()

      for (const comp of components) {
        newComponentMap.set(comp.id, comp)
        const existing = newCategoryMap.get(comp.category) ?? []
        newCategoryMap.set(comp.category, [...existing, comp])
      }

      componentMap = newComponentMap
      categoryMap = newCategoryMap
      stacks = stackData
      blueprints = blueprintData
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

  getBlueprints(): Blueprint[] {
    return blueprints
  },

  reset(): void {
    componentMap = new Map()
    categoryMap = new Map()
    stacks = []
    blueprints = []
    initialized = false
    initPromise = null
  },
}
