import { describe, it, expect } from "vitest"
import { BlueprintSchema, BlueprintYamlSchema } from "@/schemas/blueprintSchema"

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

describe("BlueprintYamlSchema", () => {
  const validYamlBlueprint = {
    id: "whatsapp-clone",
    name: "WhatsApp Clone",
    description: "A messaging app architecture based on WhatsApp",
  }

  it("parses valid blueprint YAML and returns correct structure", () => {
    const result = BlueprintYamlSchema.safeParse(validYamlBlueprint)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        id: "whatsapp-clone",
        name: "WhatsApp Clone",
        description: "A messaging app architecture based on WhatsApp",
        tier: undefined,
      })
    }
  })

  it("accepts blueprint with optional tier", () => {
    const result = BlueprintYamlSchema.safeParse({ ...validYamlBlueprint, tier: 2 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tier).toBe(2)
    }
  })

  it("accepts blueprint without tier", () => {
    const result = BlueprintYamlSchema.safeParse(validYamlBlueprint)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tier).toBeUndefined()
    }
  })

  it("rejects invalid data (missing required fields)", () => {
    const result = BlueprintYamlSchema.safeParse({ id: "incomplete" })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys with strict mode", () => {
    const result = BlueprintYamlSchema.safeParse({ ...validYamlBlueprint, extra: "field" })
    expect(result.success).toBe(false)
  })

  it("rejects non-number tier", () => {
    const result = BlueprintYamlSchema.safeParse({ ...validYamlBlueprint, tier: "high" })
    expect(result.success).toBe(false)
  })

  it("round-trip: YAML output matches BlueprintSchema shape", () => {
    const result = BlueprintYamlSchema.safeParse(validYamlBlueprint)
    expect(result.success).toBe(true)
    if (result.success) {
      const baseResult = BlueprintSchema.safeParse(result.data)
      expect(baseResult.success).toBe(true)
      if (baseResult.success) {
        expect(baseResult.data).toEqual(result.data)
      }
    }
  })

  it("round-trip: YAML with tier matches BlueprintSchema shape", () => {
    const result = BlueprintYamlSchema.safeParse({ ...validYamlBlueprint, tier: 3 })
    expect(result.success).toBe(true)
    if (result.success) {
      const baseResult = BlueprintSchema.safeParse(result.data)
      expect(baseResult.success).toBe(true)
      if (baseResult.success) {
        expect(baseResult.data).toEqual(result.data)
      }
    }
  })
})

describe("BlueprintSchema — empty string rejection", () => {
  const validBlueprint = {
    id: "whatsapp-clone",
    name: "WhatsApp Clone",
    description: "A messaging app architecture based on WhatsApp",
  }

  it("rejects empty id", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, id: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty description", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, description: "" })
    expect(result.success).toBe(false)
  })
})

describe("BlueprintSchema — null rejection", () => {
  const validBlueprint = {
    id: "whatsapp-clone",
    name: "WhatsApp Clone",
    description: "A messaging app architecture based on WhatsApp",
  }

  it("rejects null id", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, id: null })
    expect(result.success).toBe(false)
  })

  it("rejects null name", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, name: null })
    expect(result.success).toBe(false)
  })

  it("rejects null description", () => {
    const result = BlueprintSchema.safeParse({ ...validBlueprint, description: null })
    expect(result.success).toBe(false)
  })
})
