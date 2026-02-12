import { describe, it, expect } from "vitest"
import { BlueprintSchema } from "@/schemas/blueprintSchema"

describe("BlueprintSchema", () => {
  const validBlueprint = {
    id: "whatsapp-clone",
    name: "WhatsApp Clone",
    description: "A messaging app architecture based on WhatsApp",
  }

  it("accepts valid blueprint data", () => {
    const result = BlueprintSchema.safeParse(validBlueprint)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validBlueprint)
    }
  })

  it("accepts blueprint with optional tier", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, tier: 2 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tier).toBe(2)
    }
  })

  it("accepts blueprint without tier", () => {
    const result = BlueprintSchema.safeParse(validBlueprint)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tier).toBeUndefined()
    }
  })

  it("rejects missing name", () => {
    const { name: _name, ...withoutName } = validBlueprint
    const result = BlueprintSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it("rejects missing description", () => {
    const { description: _desc, ...withoutDesc } = validBlueprint
    const result = BlueprintSchema.safeParse(withoutDesc)
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys with strict mode", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, extra: "field" })
    expect(result.success).toBe(false)
  })

  it("rejects non-number tier", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, tier: "high" })
    expect(result.success).toBe(false)
  })
})
