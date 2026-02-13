import { describe, it, expect } from "vitest"
import { StackSchema, StackYamlSchema } from "@/schemas/stackSchema"

describe("StackSchema", () => {
  const validStack = {
    id: "mean-stack",
    name: "MEAN Stack",
    description: "MongoDB, Express, Angular, Node.js",
    componentIds: ["mongodb", "node-express", "angular"],
    tags: ["fullstack", "javascript"],
  }

  it("accepts valid stack data", () => {
    const result = StackSchema.safeParse(validStack)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validStack)
    }
  })

  it("rejects missing name", () => {
    const { name: _name, ...withoutName } = validStack
    const result = StackSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it("rejects missing componentIds", () => {
    const { componentIds: _ids, ...withoutComponents } = validStack
    const result = StackSchema.safeParse(withoutComponents)
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys with strict mode", () => {
    const result = StackSchema.safeParse({ ...validStack, extra: "field" })
    expect(result.success).toBe(false)
  })

  it("accepts empty tags array", () => {
    const result = StackSchema.safeParse({ ...validStack, tags: [] })
    expect(result.success).toBe(true)
  })

  it("accepts empty componentIds array", () => {
    const result = StackSchema.safeParse({ ...validStack, componentIds: [] })
    expect(result.success).toBe(true)
  })
})

describe("StackYamlSchema", () => {
  const validYamlStack = {
    id: "mean-stack",
    name: "MEAN Stack",
    description: "MongoDB, Express, Angular, Node.js",
    component_ids: ["mongodb", "node-express", "angular"],
    tags: ["fullstack", "javascript"],
  }

  it("transforms snake_case component_ids to camelCase componentIds", () => {
    const result = StackYamlSchema.safeParse(validYamlStack)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        id: "mean-stack",
        name: "MEAN Stack",
        description: "MongoDB, Express, Angular, Node.js",
        componentIds: ["mongodb", "node-express", "angular"],
        tags: ["fullstack", "javascript"],
      })
    }
  })

  it("rejects camelCase componentIds (expects snake_case)", () => {
    const result = StackYamlSchema.safeParse({
      id: "mean-stack",
      name: "MEAN Stack",
      description: "MongoDB, Express, Angular, Node.js",
      componentIds: ["mongodb", "node-express", "angular"],
      tags: ["fullstack", "javascript"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid data (missing required fields)", () => {
    const result = StackYamlSchema.safeParse({ id: "incomplete" })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys with strict mode", () => {
    const result = StackYamlSchema.safeParse({ ...validYamlStack, extra: "field" })
    expect(result.success).toBe(false)
  })

  it("accepts empty component_ids array", () => {
    const result = StackYamlSchema.safeParse({ ...validYamlStack, component_ids: [] })
    expect(result.success).toBe(true)
  })

  it("accepts empty tags array", () => {
    const result = StackYamlSchema.safeParse({ ...validYamlStack, tags: [] })
    expect(result.success).toBe(true)
  })

  it("round-trip: YAML output matches StackSchema shape", () => {
    const result = StackYamlSchema.safeParse(validYamlStack)
    expect(result.success).toBe(true)
    if (result.success) {
      const baseResult = StackSchema.safeParse(result.data)
      expect(baseResult.success).toBe(true)
      if (baseResult.success) {
        expect(baseResult.data).toEqual(result.data)
      }
    }
  })
})

describe("StackSchema — empty string rejection", () => {
  const validStack = {
    id: "mean-stack",
    name: "MEAN Stack",
    description: "MongoDB, Express, Angular, Node.js",
    componentIds: ["mongodb", "node-express", "angular"],
    tags: ["fullstack", "javascript"],
  }

  it("rejects empty id", () => {
    const result = StackSchema.safeParse({ ...validStack, id: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = StackSchema.safeParse({ ...validStack, name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty description", () => {
    const result = StackSchema.safeParse({ ...validStack, description: "" })
    expect(result.success).toBe(false)
  })
})

describe("StackSchema — null rejection", () => {
  const validStack = {
    id: "mean-stack",
    name: "MEAN Stack",
    description: "MongoDB, Express, Angular, Node.js",
    componentIds: ["mongodb", "node-express", "angular"],
    tags: ["fullstack", "javascript"],
  }

  it("rejects null id", () => {
    const result = StackSchema.safeParse({ ...validStack, id: null })
    expect(result.success).toBe(false)
  })

  it("rejects null name", () => {
    const result = StackSchema.safeParse({ ...validStack, name: null })
    expect(result.success).toBe(false)
  })

  it("rejects null description", () => {
    const result = StackSchema.safeParse({ ...validStack, description: null })
    expect(result.success).toBe(false)
  })
})
