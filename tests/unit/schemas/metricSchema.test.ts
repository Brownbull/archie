import { describe, it, expect } from "vitest"
import {
  MetricValueSchema,
  MetricValueYamlSchema,
} from "@/schemas/metricSchema"

describe("MetricValueSchema", () => {
  const validMetric = {
    id: "latency-score",
    value: "medium" as const,
    numericValue: 5,
    category: "performance",
  }

  it("accepts valid metric data", () => {
    const result = MetricValueSchema.safeParse(validMetric)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validMetric)
    }
  })

  it("accepts low, medium, high values", () => {
    for (const value of ["low", "medium", "high"] as const) {
      const result = MetricValueSchema.safeParse({ ...validMetric, value })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid value enum", () => {
    const result = MetricValueSchema.safeParse({ ...validMetric, value: "ultra" })
    expect(result.success).toBe(false)
  })

  it("accepts numericValue at min boundary (1)", () => {
    const result = MetricValueSchema.safeParse({ ...validMetric, numericValue: 1 })
    expect(result.success).toBe(true)
  })

  it("accepts numericValue at max boundary (10)", () => {
    const result = MetricValueSchema.safeParse({ ...validMetric, numericValue: 10 })
    expect(result.success).toBe(true)
  })

  it("rejects numericValue below 1", () => {
    const result = MetricValueSchema.safeParse({ ...validMetric, numericValue: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects numericValue above 10", () => {
    const result = MetricValueSchema.safeParse({ ...validMetric, numericValue: 11 })
    expect(result.success).toBe(false)
  })

  it("rejects missing required fields", () => {
    const result = MetricValueSchema.safeParse({ id: "test" })
    expect(result.success).toBe(false)
  })

  it("rejects non-string id", () => {
    const result = MetricValueSchema.safeParse({ ...validMetric, id: 123 })
    expect(result.success).toBe(false)
  })

  it("rejects decimal numericValue (must be integer)", () => {
    const result = MetricValueSchema.safeParse({ ...validMetric, numericValue: 5.5 })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 100 characters", () => {
    const result = MetricValueSchema.safeParse({
      ...validMetric,
      name: "a".repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it("accepts name at exactly 100 characters", () => {
    const result = MetricValueSchema.safeParse({
      ...validMetric,
      name: "a".repeat(100),
    })
    expect(result.success).toBe(true)
  })
})

describe("MetricValueYamlSchema", () => {
  it("transforms snake_case numeric_value to camelCase numericValue", () => {
    const result = MetricValueYamlSchema.safeParse({
      id: "latency",
      value: "medium",
      numeric_value: 5,
      category: "performance",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.numericValue).toBe(5)
      expect(result.data.id).toBe("latency")
    }
  })

  it("rejects camelCase numericValue (expects snake_case)", () => {
    const result = MetricValueYamlSchema.safeParse({
      id: "latency",
      value: "medium",
      numericValue: 5,
      category: "performance",
    })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 100 characters (YAML variant)", () => {
    const result = MetricValueYamlSchema.safeParse({
      id: "latency",
      value: "medium",
      numeric_value: 5,
      category: "performance",
      name: "a".repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it("accepts name at exactly 100 characters (YAML variant)", () => {
    const result = MetricValueYamlSchema.safeParse({
      id: "latency",
      value: "medium",
      numeric_value: 5,
      category: "performance",
      name: "a".repeat(100),
    })
    expect(result.success).toBe(true)
  })
})

