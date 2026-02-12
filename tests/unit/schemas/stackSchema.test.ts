import { describe, it, expect } from "vitest"
import { StackSchema } from "@/schemas/stackSchema"

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
