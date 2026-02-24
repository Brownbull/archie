import { describe, it, expect } from "vitest"
import {
  makeMetric,
  makeConfigVariant,
  makeComponent,
  makeNode,
  makeEdge,
} from "../../helpers/factories"
import { MetricValueSchema } from "@/schemas/metricSchema"
import {
  ConfigVariantSchema,
  ComponentSchema,
} from "@/schemas/componentSchema"
import { NODE_TYPE_COMPONENT, EDGE_TYPE_CONNECTION } from "@/lib/constants"

// =============================================================================
// makeMetric
// =============================================================================

describe("makeMetric", () => {
  it("returns a valid MetricValue with sensible defaults", () => {
    const metric = makeMetric()
    expect(metric.id).toBeDefined()
    expect(metric.id.length).toBeGreaterThan(0)
    expect(metric.value).toBeDefined()
    expect(["low", "medium", "high"]).toContain(metric.value)
    expect(metric.numericValue).toBeGreaterThanOrEqual(1)
    expect(metric.numericValue).toBeLessThanOrEqual(10)
    expect(metric.category).toBeDefined()
    expect(metric.category.length).toBeGreaterThan(0)
  })

  it("passes Zod MetricValueSchema validation with defaults", () => {
    const metric = makeMetric()
    const result = MetricValueSchema.safeParse(metric)
    expect(result.success).toBe(true)
  })

  it("allows overriding individual fields", () => {
    const metric = makeMetric({
      id: "custom-id",
      numericValue: 9,
      category: "security",
    })
    expect(metric.id).toBe("custom-id")
    expect(metric.numericValue).toBe(9)
    expect(metric.category).toBe("security")
  })

  it("auto-derives value enum from numericValue override", () => {
    expect(makeMetric({ numericValue: 1 }).value).toBe("low")
    expect(makeMetric({ numericValue: 3 }).value).toBe("low")
    expect(makeMetric({ numericValue: 4 }).value).toBe("medium")
    expect(makeMetric({ numericValue: 7 }).value).toBe("medium")
    expect(makeMetric({ numericValue: 8 }).value).toBe("high")
    expect(makeMetric({ numericValue: 10 }).value).toBe("high")
  })

  it("allows explicit value override even if it contradicts numericValue", () => {
    const metric = makeMetric({ numericValue: 1, value: "high" })
    expect(metric.value).toBe("high")
    expect(metric.numericValue).toBe(1)
  })

  it("passes Zod validation with overrides", () => {
    const metric = makeMetric({ id: "test-metric", numericValue: 8, category: "performance" })
    const result = MetricValueSchema.safeParse(metric)
    expect(result.success).toBe(true)
  })

  it("generates unique IDs across multiple calls (no collision)", () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeMetric().id))
    expect(ids.size).toBe(10)
  })
})

// =============================================================================
// makeConfigVariant
// =============================================================================

describe("makeConfigVariant", () => {
  it("returns a valid ConfigVariant with sensible defaults", () => {
    const variant = makeConfigVariant()
    expect(variant.id).toBeDefined()
    expect(variant.id.length).toBeGreaterThan(0)
    expect(variant.name).toBeDefined()
    expect(variant.name.length).toBeGreaterThan(0)
    expect(Array.isArray(variant.metrics)).toBe(true)
  })

  it("passes Zod ConfigVariantSchema validation with defaults", () => {
    const variant = makeConfigVariant()
    const result = ConfigVariantSchema.safeParse(variant)
    expect(result.success).toBe(true)
  })

  it("allows overriding individual fields", () => {
    const customMetrics = [makeMetric({ id: "m1", numericValue: 3, category: "performance" })]
    const variant = makeConfigVariant({
      id: "custom-variant",
      name: "Custom Variant",
      metrics: customMetrics,
    })
    expect(variant.id).toBe("custom-variant")
    expect(variant.name).toBe("Custom Variant")
    expect(variant.metrics).toEqual(customMetrics)
  })

  it("passes Zod validation with overrides", () => {
    const variant = makeConfigVariant({
      id: "test-variant",
      name: "Test",
      metrics: [makeMetric()],
    })
    const result = ConfigVariantSchema.safeParse(variant)
    expect(result.success).toBe(true)
  })

  it("generates unique IDs across multiple calls", () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeConfigVariant().id))
    expect(ids.size).toBe(10)
  })
})

// =============================================================================
// makeComponent
// =============================================================================

describe("makeComponent", () => {
  it("returns a valid Component with sensible defaults", () => {
    const component = makeComponent()
    expect(component.id).toBeDefined()
    expect(component.id.length).toBeGreaterThan(0)
    expect(component.name).toBeDefined()
    expect(component.name.length).toBeGreaterThan(0)
    expect(component.category.length).toBeGreaterThan(0)
    expect(component.description.length).toBeGreaterThan(0)
    expect(component.is.length).toBeGreaterThan(0)
    expect(component.gain.length).toBeGreaterThanOrEqual(1)
    expect(component.cost.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(component.tags)).toBe(true)
    expect(Array.isArray(component.baseMetrics)).toBe(true)
    expect(component.configVariants.length).toBeGreaterThanOrEqual(1)
  })

  it("passes Zod ComponentSchema validation with defaults", () => {
    const component = makeComponent()
    const result = ComponentSchema.safeParse(component)
    expect(result.success).toBe(true)
  })

  it("allows overriding individual fields", () => {
    const component = makeComponent({
      id: "my-component",
      name: "My Component",
      category: "messaging",
    })
    expect(component.id).toBe("my-component")
    expect(component.name).toBe("My Component")
    expect(component.category).toBe("messaging")
  })

  it("preserves non-overridden default fields when overriding", () => {
    const component = makeComponent({ id: "custom-id" })
    // Other defaults should still be valid
    expect(component.description.length).toBeGreaterThan(0)
    expect(component.gain.length).toBeGreaterThanOrEqual(1)
    expect(component.cost.length).toBeGreaterThanOrEqual(1)
    expect(component.configVariants.length).toBeGreaterThanOrEqual(1)
  })

  it("passes Zod validation with overrides", () => {
    const component = makeComponent({
      id: "test-comp",
      name: "Test",
      category: "compute",
      baseMetrics: [makeMetric({ id: "m1", numericValue: 5, category: "performance" })],
    })
    const result = ComponentSchema.safeParse(component)
    expect(result.success).toBe(true)
  })

  it("generates unique IDs across multiple calls", () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeComponent().id))
    expect(ids.size).toBe(10)
  })

  it("allows overriding configVariants", () => {
    const customVariants = [
      makeConfigVariant({ id: "v1", name: "Variant 1" }),
      makeConfigVariant({ id: "v2", name: "Variant 2" }),
    ]
    const component = makeComponent({ configVariants: customVariants })
    expect(component.configVariants).toHaveLength(2)
    expect(component.configVariants[0].id).toBe("v1")
    expect(component.configVariants[1].id).toBe("v2")
  })
})

// =============================================================================
// makeNode
// =============================================================================

describe("makeNode", () => {
  it("returns a valid ArchieNode with sensible defaults", () => {
    const node = makeNode()
    expect(node.id).toBeDefined()
    expect(node.id.length).toBeGreaterThan(0)
    expect(node.type).toBe(NODE_TYPE_COMPONENT)
    expect(node.position).toBeDefined()
    expect(typeof node.position.x).toBe("number")
    expect(typeof node.position.y).toBe("number")
    expect(node.data).toBeDefined()
    expect(node.data.archieComponentId).toBeDefined()
    expect(node.data.activeConfigVariantId).toBeDefined()
    expect(node.data.componentName).toBeDefined()
    expect(node.data.componentCategory).toBeDefined()
  })

  it("allows overriding position", () => {
    const node = makeNode({ position: { x: 100, y: 200 } })
    expect(node.position).toEqual({ x: 100, y: 200 })
  })

  it("allows overriding data fields", () => {
    const node = makeNode({
      data: {
        archieComponentId: "redis",
        activeConfigVariantId: "sentinel",
        componentName: "Redis",
        componentCategory: "caching",
      },
    })
    expect(node.data.archieComponentId).toBe("redis")
    expect(node.data.activeConfigVariantId).toBe("sentinel")
    expect(node.data.componentName).toBe("Redis")
    expect(node.data.componentCategory).toBe("caching")
  })

  it("always has type set to NODE_TYPE_COMPONENT", () => {
    const node = makeNode()
    expect(node.type).toBe(NODE_TYPE_COMPONENT)
  })

  it("generates unique IDs across multiple calls", () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeNode().id))
    expect(ids.size).toBe(10)
  })

  it("allows overriding id", () => {
    const node = makeNode({ id: "custom-node-id" })
    expect(node.id).toBe("custom-node-id")
  })
})

// =============================================================================
// makeEdge
// =============================================================================

describe("makeEdge", () => {
  it("returns a valid ArchieEdge with sensible defaults", () => {
    const edge = makeEdge()
    expect(edge.id).toBeDefined()
    expect(edge.id.length).toBeGreaterThan(0)
    expect(edge.source).toBeDefined()
    expect(edge.source.length).toBeGreaterThan(0)
    expect(edge.target).toBeDefined()
    expect(edge.target.length).toBeGreaterThan(0)
    expect(edge.type).toBe(EDGE_TYPE_CONNECTION)
    expect(edge.data).toBeDefined()
    expect(typeof edge.data!.isIncompatible).toBe("boolean")
    expect(edge.data!.sourceArchieComponentId).toBeDefined()
    expect(edge.data!.targetArchieComponentId).toBeDefined()
  })

  it("defaults to compatible (isIncompatible: false)", () => {
    const edge = makeEdge()
    expect(edge.data!.isIncompatible).toBe(false)
    expect(edge.data!.incompatibilityReason).toBeNull()
  })

  it("allows overriding source and target", () => {
    const edge = makeEdge({ source: "node-a", target: "node-b" })
    expect(edge.source).toBe("node-a")
    expect(edge.target).toBe("node-b")
  })

  it("allows overriding data fields", () => {
    const edge = makeEdge({
      data: {
        isIncompatible: true,
        incompatibilityReason: "Protocol mismatch",
        sourceArchieComponentId: "redis",
        targetArchieComponentId: "postgresql",
      },
    })
    expect(edge.data!.isIncompatible).toBe(true)
    expect(edge.data!.incompatibilityReason).toBe("Protocol mismatch")
    expect(edge.data!.sourceArchieComponentId).toBe("redis")
    expect(edge.data!.targetArchieComponentId).toBe("postgresql")
  })

  it("always has type set to EDGE_TYPE_CONNECTION", () => {
    const edge = makeEdge()
    expect(edge.type).toBe(EDGE_TYPE_CONNECTION)
  })

  it("generates unique IDs across multiple calls", () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeEdge().id))
    expect(ids.size).toBe(10)
  })

  it("allows overriding id", () => {
    const edge = makeEdge({ id: "custom-edge-id" })
    expect(edge.id).toBe("custom-edge-id")
  })
})
