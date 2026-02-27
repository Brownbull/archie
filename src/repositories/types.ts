import type { Component } from "@/schemas/componentSchema"
import type { Stack } from "@/schemas/stackSchema"
import type { BlueprintFull } from "@/schemas/blueprintSchema"
import type { MetricCategory } from "@/schemas/metricCategorySchema"

export interface ComponentRepository {
  getAll(): Promise<Component[]>
  getById(id: string): Promise<Component | null>
  getByCategory(category: string): Promise<Component[]>
}

export interface StackRepository {
  getAll(): Promise<Stack[]>
}

export interface BlueprintRepository {
  getAll(): Promise<BlueprintFull[]>
}

export interface MetricCategoryRepository {
  getAll(): Promise<MetricCategory[]>
}
