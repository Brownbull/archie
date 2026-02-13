import { describe, it, expect } from "vitest"
import {
  makeServiceAccountJson,
  createMockDb,
} from "./seed-helpers"

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
