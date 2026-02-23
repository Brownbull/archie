import { describe, it, expect } from "vitest"
import { BlueprintSchema, BlueprintYamlSchema, BlueprintFullSchema, BlueprintFullYamlSchema } from "@/schemas/blueprintSchema"

const validSkeleton = {
  schemaVersion: "1.0.0",
  nodes: [
    { id: "node-1", componentId: "nginx", configVariantId: "load-balancer", position: { x: 96, y: 192 } },
  ],
  edges: [
    { id: "edge-1", sourceNodeId: "node-1", targetNodeId: "node-2" },
  ],
}

const validSkeletonYaml = {
  schema_version: "1.0.0",
  nodes: [
    { id: "node-1", component_id: "nginx", config_variant_id: "load-balancer", position: { x: 96, y: 192 } },
  ],
  edges: [
    { id: "edge-1", source_node_id: "node-1", target_node_id: "node-2" },
  ],
}

describe("BlueprintFullSchema", () => {
  const validBlueprintFull = {
    id: "whatsapp-messaging",
    name: "WhatsApp-style Messaging",
    description: "High-throughput real-time messaging architecture",
    skeleton: validSkeleton,
  }

  it("accepts valid blueprint with skeleton", () => {
    const result = BlueprintFullSchema.safeParse(validBlueprintFull)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("whatsapp-messaging")
      expect(result.data.skeleton.schemaVersion).toBe("1.0.0")
    }
  })

  it("accepts blueprint with optional tier", () => {
    const result = BlueprintFullSchema.safeParse({ ...validBlueprintFull, tier: 2 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tier).toBe(2)
    }
  })

  it("requires skeleton field", () => {
    const { skeleton: _s, ...withoutSkeleton } = validBlueprintFull
    const result = BlueprintFullSchema.safeParse(withoutSkeleton)
    expect(result.success).toBe(false)
  })

  it("accepts skeleton with empty nodes and edges arrays", () => {
    const result = BlueprintFullSchema.safeParse({
      ...validBlueprintFull,
      skeleton: { schemaVersion: "1.0.0", nodes: [], edges: [] },
    })
    expect(result.success).toBe(true)
  })

  it("rejects skeleton with invalid node (missing componentId)", () => {
    const result = BlueprintFullSchema.safeParse({
      ...validBlueprintFull,
      skeleton: {
        schemaVersion: "1.0.0",
        nodes: [{ id: "node-1", position: { x: 0, y: 0 } }],
        edges: [],
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects skeleton with invalid edge (missing sourceNodeId)", () => {
    const result = BlueprintFullSchema.safeParse({
      ...validBlueprintFull,
      skeleton: {
        schemaVersion: "1.0.0",
        nodes: [],
        edges: [{ id: "edge-1", targetNodeId: "node-2" }],
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys at root level (strict)", () => {
    const result = BlueprintFullSchema.safeParse({ ...validBlueprintFull, extra: "field" })
    expect(result.success).toBe(false)
  })

  it("rejects missing id", () => {
    const { id: _id, ...withoutId } = validBlueprintFull
    const result = BlueprintFullSchema.safeParse(withoutId)
    expect(result.success).toBe(false)
  })

  it("rejects missing name", () => {
    const { name: _name, ...withoutName } = validBlueprintFull
    const result = BlueprintFullSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })
})

describe("BlueprintFullYamlSchema", () => {
  const validBlueprintFullYaml = {
    id: "whatsapp-messaging",
    name: "WhatsApp-style Messaging",
    description: "High-throughput real-time messaging architecture",
    skeleton: validSkeletonYaml,
  }

  it("transforms snake_case skeleton to camelCase", () => {
    const result = BlueprintFullYamlSchema.safeParse(validBlueprintFullYaml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.skeleton.schemaVersion).toBe("1.0.0")
      expect(result.data.skeleton.nodes[0]?.componentId).toBe("nginx")
      expect(result.data.skeleton.nodes[0]?.configVariantId).toBe("load-balancer")
      expect(result.data.skeleton.edges[0]?.sourceNodeId).toBe("node-1")
    }
  })

  it("round-trip: YAML output matches BlueprintFullSchema shape", () => {
    const result = BlueprintFullYamlSchema.safeParse(validBlueprintFullYaml)
    expect(result.success).toBe(true)
    if (result.success) {
      const baseResult = BlueprintFullSchema.safeParse(result.data)
      expect(baseResult.success).toBe(true)
    }
  })

  it("accepts blueprint with optional tier", () => {
    const result = BlueprintFullYamlSchema.safeParse({ ...validBlueprintFullYaml, tier: 3 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tier).toBe(3)
    }
  })

  it("requires skeleton field", () => {
    const { skeleton: _s, ...withoutSkeleton } = validBlueprintFullYaml
    const result = BlueprintFullYamlSchema.safeParse(withoutSkeleton)
    expect(result.success).toBe(false)
  })

  it("rejects invalid skeleton (missing schema_version)", () => {
    const result = BlueprintFullYamlSchema.safeParse({
      ...validBlueprintFullYaml,
      skeleton: { nodes: [], edges: [] },
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys at root level (strict)", () => {
    const result = BlueprintFullYamlSchema.safeParse({ ...validBlueprintFullYaml, extra: "field" })
    expect(result.success).toBe(false)
  })
})

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
