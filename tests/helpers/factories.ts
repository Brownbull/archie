import type { MetricValue } from "@/schemas/metricSchema"
import type { Component, ConfigVariant } from "@/schemas/componentSchema"
import type { ArchieNode, ArchieNodeData, ArchieEdge, ArchieEdgeData } from "@/stores/architectureStore"
import { NODE_TYPE_COMPONENT, EDGE_TYPE_CONNECTION } from "@/lib/constants"
import type { ComponentCategoryId } from "@/lib/constants"

/**
 * Derives the MetricValue "value" enum from a numericValue.
 * 1-3 = "low", 4-7 = "medium", 8-10 = "high"
 */
function deriveValueEnum(numericValue: number): "low" | "medium" | "high" {
  if (numericValue <= 3) return "low"
  if (numericValue <= 7) return "medium"
  return "high"
}

/**
 * Creates a valid MetricValue with sensible defaults.
 * Supports Partial<MetricValue> overrides with shallow merge.
 * Auto-derives "value" from numericValue unless explicitly overridden.
 */
export function makeMetric(overrides?: Partial<MetricValue>): MetricValue {
  const numericValue = overrides?.numericValue ?? 5
  const derivedValue = deriveValueEnum(numericValue)

  return {
    id: crypto.randomUUID(),
    value: derivedValue,
    numericValue,
    category: "performance",
    ...overrides,
  }
}

/**
 * Creates a valid ConfigVariant with sensible defaults.
 * Supports Partial<ConfigVariant> overrides with shallow merge.
 */
export function makeConfigVariant(overrides?: Partial<ConfigVariant>): ConfigVariant {
  return {
    id: crypto.randomUUID(),
    name: "Default Variant",
    metrics: [],
    ...overrides,
  }
}

/**
 * Creates a valid Component with sensible defaults.
 * Supports Partial<Component> overrides with shallow merge.
 * All defaults pass Zod ComponentSchema validation.
 */
export function makeComponent(overrides?: Partial<Component>): Component {
  return {
    id: crypto.randomUUID(),
    name: "Test Component",
    category: "compute",
    description: "A test component",
    is: "A test component for unit tests",
    gain: ["Test gain"],
    cost: ["Test cost"],
    tags: [],
    baseMetrics: [],
    configVariants: [{ id: "default", name: "Default", metrics: [] }],
    ...overrides,
  }
}

/**
 * Creates a valid ArchieNode with sensible defaults.
 * Supports partial overrides for top-level fields and data fields.
 */
export function makeNode(overrides?: Partial<Omit<ArchieNode, "data">> & { data?: Partial<ArchieNodeData> }): ArchieNode {
  const defaultData: ArchieNodeData = {
    archieComponentId: "postgresql",
    activeConfigVariantId: "default",
    componentName: "PostgreSQL",
    componentCategory: "data-storage" as ComponentCategoryId,
  }

  const { data: dataOverrides, ...restOverrides } = overrides ?? {}

  return {
    id: crypto.randomUUID(),
    type: NODE_TYPE_COMPONENT,
    position: { x: 0, y: 0 },
    data: {
      ...defaultData,
      ...dataOverrides,
    },
    ...restOverrides,
  } as ArchieNode // Cast needed: React Flow's Node type has many optional fields not relevant to test factories
}

/**
 * Creates a valid ArchieEdge with sensible defaults.
 * Supports partial overrides for top-level fields and data fields.
 */
export function makeEdge(overrides?: Partial<Omit<ArchieEdge, "data">> & { data?: Partial<ArchieEdgeData> }): ArchieEdge {
  const defaultData: ArchieEdgeData = {
    isIncompatible: false,
    incompatibilityReason: null,
    sourceArchieComponentId: "postgresql",
    targetArchieComponentId: "redis",
  }

  const { data: dataOverrides, ...restOverrides } = overrides ?? {}

  return {
    id: crypto.randomUUID(),
    source: crypto.randomUUID(),
    target: crypto.randomUUID(),
    type: EDGE_TYPE_CONNECTION,
    data: {
      ...defaultData,
      ...dataOverrides,
    },
    ...restOverrides,
  }
}
