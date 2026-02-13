import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { ComponentYamlSchema, ComponentSchema } from "@/schemas/componentSchema"
import { makeComponentYaml, makeComponent } from "./seed-helpers"

describe("makeComponentYaml", () => {
  it("returns a string parseable as YAML", () => {
    const yaml = makeComponentYaml("test-comp")
    const parsed = load(yaml)
    expect(parsed).toBeDefined()
    expect(typeof parsed).toBe("object")
  })

  it("produces YAML that passes ComponentYamlSchema validation", () => {
    const yaml = makeComponentYaml("valid-comp")
    const parsed = load(yaml)
    const result = ComponentYamlSchema.safeParse(parsed)
    expect(result.success).toBe(true)
  })

  it("transforms to camelCase component with correct id", () => {
    const yaml = makeComponentYaml("my-id")
    const parsed = load(yaml)
    const result = ComponentYamlSchema.parse(parsed)
    expect(result.id).toBe("my-id")
    expect(result.name).toBe("Component my-id")
    expect(result.category).toBe("data-storage")
  })

  it("includes baseMetrics after transformation", () => {
    const yaml = makeComponentYaml("metrics-comp")
    const parsed = load(yaml)
    const result = ComponentYamlSchema.parse(parsed)
    expect(result.baseMetrics).toHaveLength(1)
    expect(result.baseMetrics[0].id).toBe("latency")
    expect(result.baseMetrics[0].numericValue).toBe(3)
  })

  it("includes configVariants after transformation", () => {
    const yaml = makeComponentYaml("variants-comp")
    const parsed = load(yaml)
    const result = ComponentYamlSchema.parse(parsed)
    expect(result.configVariants).toHaveLength(1)
    expect(result.configVariants[0].id).toBe("default")
  })
})

describe("makeComponent", () => {
  it("returns an object with the given id", () => {
    const comp = makeComponent("my-comp")
    expect(comp.id).toBe("my-comp")
  })

  it("returns an object that passes ComponentSchema validation", () => {
    const comp = makeComponent("valid-comp")
    const result = ComponentSchema.safeParse(comp)
    expect(result.success).toBe(true)
  })

  it("has camelCase fields (baseMetrics, configVariants)", () => {
    const comp = makeComponent("camel-test")
    expect(comp).toHaveProperty("baseMetrics")
    expect(comp).toHaveProperty("configVariants")
    expect(comp).not.toHaveProperty("base_metrics")
    expect(comp).not.toHaveProperty("config_variants")
  })

  it("has expected default values", () => {
    const comp = makeComponent("defaults")
    expect(comp.name).toBe("Component defaults")
    expect(comp.category).toBe("data-storage")
    expect(comp.gain).toEqual(["Fast"])
    expect(comp.cost).toEqual(["Expensive"])
    expect(comp.tags).toEqual(["test"])
  })

  it("has baseMetrics with correct metric structure", () => {
    const comp = makeComponent("metrics")
    expect(comp.baseMetrics).toHaveLength(1)
    expect(comp.baseMetrics[0]).toEqual({
      id: "latency",
      value: "low",
      numericValue: 3,
      category: "performance",
    })
  })

  it("has configVariants with correct structure", () => {
    const comp = makeComponent("variants")
    expect(comp.configVariants).toHaveLength(1)
    expect(comp.configVariants[0].id).toBe("default")
    expect(comp.configVariants[0].name).toBe("Default")
    expect(comp.configVariants[0].metrics).toHaveLength(1)
  })

  it("generates unique components for different ids", () => {
    const a = makeComponent("comp-a")
    const b = makeComponent("comp-b")
    expect(a.id).not.toBe(b.id)
    expect(a.name).not.toBe(b.name)
    expect(a.description).not.toBe(b.description)
  })
})
