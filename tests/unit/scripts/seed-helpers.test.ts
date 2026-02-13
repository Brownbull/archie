import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { ComponentYamlSchema, ComponentSchema } from "@/schemas/componentSchema"
import {
  makeComponentYaml,
  makeServiceAccountJson,
  createMockDb,
  makeComponent,
} from "./seed-helpers"

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

describe("makeServiceAccountJson", () => {
  it("returns valid JSON string", () => {
    const json = makeServiceAccountJson()
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it("contains required fields: project_id, private_key, client_email", () => {
    const json = makeServiceAccountJson()
    const parsed = JSON.parse(json)
    expect(parsed).toHaveProperty("project_id", "my-project")
    expect(parsed).toHaveProperty("private_key")
    expect(parsed.private_key).toContain("BEGIN RSA PRIVATE KEY")
    expect(parsed).toHaveProperty("client_email", "test@my-project.iam.gserviceaccount.com")
  })

  it("applies overrides to default values", () => {
    const json = makeServiceAccountJson({ project_id: "overridden" })
    const parsed = JSON.parse(json)
    expect(parsed.project_id).toBe("overridden")
  })

  it("adds new fields from overrides", () => {
    const json = makeServiceAccountJson({ extra_field: "extra_value" })
    const parsed = JSON.parse(json)
    expect(parsed.extra_field).toBe("extra_value")
  })

  it("allows overriding field to undefined (removes it from JSON)", () => {
    const json = makeServiceAccountJson({ project_id: undefined })
    const parsed = JSON.parse(json)
    expect(parsed).not.toHaveProperty("project_id")
  })
})

describe("createMockDb", () => {
  it("returns db and mocks objects", () => {
    const result = createMockDb()
    expect(result).toHaveProperty("db")
    expect(result).toHaveProperty("mocks")
  })

  it("db has batch and collection methods", () => {
    const { db } = createMockDb()
    expect(typeof db.batch).toBe("function")
    expect(typeof db.collection).toBe("function")
  })

  it("batch returns object with set and commit methods", () => {
    const { db } = createMockDb()
    const batch = db.batch()
    expect(typeof batch.set).toBe("function")
    expect(typeof batch.commit).toBe("function")
  })

  it("batch returns object with create, update, delete stubs", () => {
    const { db } = createMockDb()
    const batch = db.batch()
    expect(typeof batch.create).toBe("function")
    expect(typeof batch.update).toBe("function")
    expect(typeof batch.delete).toBe("function")
  })

  it("mocks object exposes all individual mock functions", () => {
    const { mocks } = createMockDb()
    expect(mocks).toHaveProperty("commitFn")
    expect(mocks).toHaveProperty("setFn")
    expect(mocks).toHaveProperty("createFn")
    expect(mocks).toHaveProperty("updateFn")
    expect(mocks).toHaveProperty("deleteFn")
    expect(mocks).toHaveProperty("batchFn")
    expect(mocks).toHaveProperty("docFn")
    expect(mocks).toHaveProperty("collectionFn")
  })

  it("commit resolves to undefined by default", async () => {
    const { mocks } = createMockDb()
    const result = await mocks.commitFn()
    expect(result).toBeUndefined()
  })

  it("collection().doc() returns object with id", () => {
    const { db } = createMockDb()
    const ref = db.collection("test").doc("doc-1")
    expect(ref).toEqual({ id: "doc-1" })
  })

  it("set, create, update, delete are callable vi.fn() instances", () => {
    const { mocks } = createMockDb()
    // Call each to verify they are callable mock functions
    mocks.setFn("ref", "data")
    mocks.createFn("ref", "data")
    mocks.updateFn("ref", "data")
    mocks.deleteFn("ref")

    expect(mocks.setFn).toHaveBeenCalledWith("ref", "data")
    expect(mocks.createFn).toHaveBeenCalledWith("ref", "data")
    expect(mocks.updateFn).toHaveBeenCalledWith("ref", "data")
    expect(mocks.deleteFn).toHaveBeenCalledWith("ref")
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
