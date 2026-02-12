import type { Component } from "@/schemas/componentSchema"

export function groupByCategory(components: Component[]): Record<string, Component[]> {
  const groups: Record<string, Component[]> = Object.create(null) as Record<string, Component[]>
  for (const comp of components) {
    const cat = comp.category
    if (!groups[cat]) groups[cat] = [] // eslint-disable-line security/detect-object-injection -- cat is Zod-validated
    groups[cat].push(comp) // eslint-disable-line security/detect-object-injection
  }
  return groups
}
