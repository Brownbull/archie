import { describe, it, expect } from "vitest"
import { createMockComponentLibrary, STANDARD_TEST_COMPONENTS } from "../../helpers/mockComponentLibrary"
import { ComponentSchema } from "@/schemas/componentSchema"
import type { Component } from "@/schemas/componentSchema"

// =============================================================================
// STANDARD_TEST_COMPONENTS
// =============================================================================

describe("STANDARD_TEST_COMPONENTS", () => {
  it("includes postgresql, redis, nginx, kafka, and mongodb", () => {
    const ids = STANDARD_TEST_COMPONENTS.map((c) => c.id)
    expect(ids).toContain("postgresql")
    expect(ids).toContain("redis")
    expect(ids).toContain("nginx")
    expect(ids).toContain("kafka")
    expect(ids).toContain("mongodb")
  })

  it("has exactly 5 standard test components", () => {
    expect(STANDARD_TEST_COMPONENTS).toHaveLength(5)
  })

  it("each component passes Zod ComponentSchema validation", () => {
    for (const component of STANDARD_TEST_COMPONENTS) {
      const result = ComponentSchema.safeParse(component)
      if (!result.success) {
        throw new Error(
          `Component "${component.id}" failed Zod validation: ${result.error.message}`,
        )
      }
      expect(result.success).toBe(true)
    }
  })

  it("each component has at least 2 config variants", () => {
    for (const component of STANDARD_TEST_COMPONENTS) {
      expect(component.configVariants.length).toBeGreaterThanOrEqual(2)
    }
  })

  it("each component has different categories covering key types", () => {
    const categories = new Set(STANDARD_TEST_COMPONENTS.map((c) => c.category))
    // At minimum should have: data-storage, caching, delivery-network, messaging
    expect(categories.has("data-storage")).toBe(true)
    expect(categories.has("caching")).toBe(true)
    expect(categories.has("delivery-network")).toBe(true)
    expect(categories.has("messaging")).toBe(true)
  })

  it("each component has baseMetrics with valid MetricValues", () => {
    for (const component of STANDARD_TEST_COMPONENTS) {
      expect(component.baseMetrics.length).toBeGreaterThan(0)
      for (const metric of component.baseMetrics) {
        expect(metric.numericValue).toBeGreaterThanOrEqual(1)
        expect(metric.numericValue).toBeLessThanOrEqual(10)
        expect(["low", "medium", "high"]).toContain(metric.value)
      }
    }
  })
})

// =============================================================================
// createMockComponentLibrary
// =============================================================================

describe("createMockComponentLibrary", () => {
  it("returns an object with getComponent, getAllComponents, getComponentsByCategory, isInitialized, and reset", () => {
    const mock = createMockComponentLibrary()
    expect(typeof mock.getComponent).toBe("function")
    expect(typeof mock.getAllComponents).toBe("function")
    expect(typeof mock.getComponentsByCategory).toBe("function")
    expect(typeof mock.isInitialized).toBe("function")
    expect(typeof mock.reset).toBe("function")
  })

  it("getComponent returns standard components by ID", () => {
    const mock = createMockComponentLibrary()
    const pg = mock.getComponent("postgresql")
    expect(pg).toBeDefined()
    expect(pg!.id).toBe("postgresql")
    expect(pg!.name).toBe("PostgreSQL")

    const redis = mock.getComponent("redis")
    expect(redis).toBeDefined()
    expect(redis!.id).toBe("redis")
  })

  it("getComponent returns undefined for unknown IDs", () => {
    const mock = createMockComponentLibrary()
    expect(mock.getComponent("nonexistent")).toBeUndefined()
  })

  it("getAllComponents returns all standard components", () => {
    const mock = createMockComponentLibrary()
    const all = mock.getAllComponents()
    expect(all).toHaveLength(5)
  })

  it("getComponentsByCategory returns components filtered by category", () => {
    const mock = createMockComponentLibrary()
    const dataStorage = mock.getComponentsByCategory("data-storage")
    expect(dataStorage.length).toBeGreaterThanOrEqual(1)
    for (const comp of dataStorage) {
      expect(comp.category).toBe("data-storage")
    }
  })

  it("getComponentsByCategory returns empty array for unknown category", () => {
    const mock = createMockComponentLibrary()
    expect(mock.getComponentsByCategory("unknown")).toEqual([])
  })

  it("isInitialized returns true", () => {
    const mock = createMockComponentLibrary()
    expect(mock.isInitialized()).toBe(true)
  })

  it("accepts custom components that override or extend standard set", () => {
    const customComponent: Component = {
      id: "custom-db",
      name: "Custom DB",
      category: "data-storage",
      description: "A custom database",
      is: "A custom database component",
      gain: ["Custom gain"],
      cost: ["Custom cost"],
      tags: ["custom"],
      baseMetrics: [],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
    }

    const mock = createMockComponentLibrary([customComponent])
    expect(mock.getComponent("custom-db")).toBeDefined()
    expect(mock.getComponent("custom-db")!.name).toBe("Custom DB")
    // Standard components should still be available
    expect(mock.getComponent("postgresql")).toBeDefined()
  })

  it("custom components override standard components with same ID", () => {
    const overridePg: Component = {
      id: "postgresql",
      name: "Overridden PG",
      category: "data-storage",
      description: "Overridden",
      is: "Overridden",
      gain: ["Custom"],
      cost: ["Custom"],
      tags: [],
      baseMetrics: [],
      configVariants: [{ id: "custom", name: "Custom", metrics: [] }],
    }

    const mock = createMockComponentLibrary([overridePg])
    expect(mock.getComponent("postgresql")!.name).toBe("Overridden PG")
  })

  it("searchComponents finds by name (case-insensitive)", () => {
    const mock = createMockComponentLibrary()
    const results = mock.searchComponents("postgres")
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].id).toBe("postgresql")
  })

  it("searchComponents finds by category", () => {
    const mock = createMockComponentLibrary()
    const results = mock.searchComponents("caching")
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((c) => c.id === "redis")).toBe(true)
  })

  it("searchComponents finds by tag", () => {
    const mock = createMockComponentLibrary()
    const results = mock.searchComponents("database")
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((c) => c.id === "postgresql")).toBe(true)
  })

  it("searchComponents returns empty array for no match", () => {
    const mock = createMockComponentLibrary()
    expect(mock.searchComponents("zzz-no-match")).toEqual([])
  })
})
