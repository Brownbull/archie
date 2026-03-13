import { describe, it, expect } from "vitest"
import {
  StackComponentSchema,
  StackConnectionSchema,
  StackCategoryScoreSchema,
  StackDefinitionSchema,
  StackDefinitionYamlSchema,
} from "@/schemas/stackSchema"

// --- Fixtures ---

const validComponent = {
  componentId: "mongodb",
  variantId: "default",
  relativePosition: { x: 0, y: 100 },
}

const validConnection = {
  sourceComponentIndex: 0,
  targetComponentIndex: 1,
  connectionType: "tcp",
}

const validCategoryScore = {
  categoryId: "performance",
  categoryName: "Performance",
  score: 7.2,
  metricCount: 4,
  hasData: true,
}

const validStack = {
  id: "mern-stack",
  name: "MERN Stack",
  description: "MongoDB, Express, React, Node.js",
  components: [
    { componentId: "mongodb", variantId: "default", relativePosition: { x: 0, y: 0 } },
    { componentId: "node-express", variantId: "default", relativePosition: { x: 200, y: 0 } },
    { componentId: "react-app", variantId: "default", relativePosition: { x: 200, y: 200 } },
  ],
  connections: [
    { sourceComponentIndex: 0, targetComponentIndex: 1, connectionType: "tcp" },
    { sourceComponentIndex: 1, targetComponentIndex: 2, connectionType: "http" },
  ],
  tradeOffProfile: [
    { categoryId: "performance", categoryName: "Performance", score: 7.2, metricCount: 4, hasData: true },
    { categoryId: "scalability", categoryName: "Scalability", score: 6.5, metricCount: 3, hasData: true },
  ],
}

// --- StackComponentSchema ---

describe("StackComponentSchema", () => {
  it("accepts valid component", () => {
    const result = StackComponentSchema.safeParse(validComponent)
    expect(result.success).toBe(true)
  })

  it("rejects missing componentId", () => {
    const { componentId: _, ...rest } = validComponent
    expect(StackComponentSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects empty componentId", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, componentId: "" }).success).toBe(false)
  })

  it("rejects missing variantId", () => {
    const { variantId: _, ...rest } = validComponent
    expect(StackComponentSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects missing relativePosition", () => {
    const { relativePosition: _, ...rest } = validComponent
    expect(StackComponentSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects unknown keys (strict)", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, extra: "field" }).success).toBe(false)
  })

  // TD-8-1a: ID length constraints
  // Boundary strings use "a".repeat() — a single-char repeat satisfies STACK_ID_FORMAT (/^[\w-]+$/)
  // while testing length limits in isolation. If the regex tightens, update these strings.
  it("rejects componentId exceeding 200 chars", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, componentId: "a".repeat(201) }).success).toBe(false)
  })

  it("rejects variantId exceeding 200 chars", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, variantId: "a".repeat(201) }).success).toBe(false)
  })

  it("accepts componentId at 200 chars boundary", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, componentId: "a".repeat(200) }).success).toBe(true)
  })

  it("accepts variantId at 200 chars boundary", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, variantId: "a".repeat(200) }).success).toBe(true)
  })

  // TD-8-1a: ID format constraints
  it("rejects componentId with spaces", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, componentId: "invalid id" }).success).toBe(false)
  })

  it("rejects componentId with special chars", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, componentId: "comp@id!" }).success).toBe(false)
  })

  it("accepts componentId with hyphens", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, componentId: "node-express" }).success).toBe(true)
  })

  it("accepts variantId with underscores", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, variantId: "variant_v2" }).success).toBe(true)
  })

  // TD-8-1a: Position bounds
  it("rejects relativePosition.x below POSITION_MIN", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, relativePosition: { x: -10001, y: 0 } }).success).toBe(false)
  })

  it("rejects relativePosition.y above POSITION_MAX", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, relativePosition: { x: 0, y: 10001 } }).success).toBe(false)
  })

  it("accepts relativePosition at boundary values", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, relativePosition: { x: -10000, y: 10000 } }).success).toBe(true)
  })

  it("accepts relativePosition at symmetric boundary values", () => {
    expect(StackComponentSchema.safeParse({ ...validComponent, relativePosition: { x: 10000, y: -10000 } }).success).toBe(true)
  })
})

// --- StackConnectionSchema ---

describe("StackConnectionSchema", () => {
  it("accepts valid connection", () => {
    const result = StackConnectionSchema.safeParse(validConnection)
    expect(result.success).toBe(true)
  })

  it("rejects negative sourceComponentIndex", () => {
    expect(StackConnectionSchema.safeParse({ ...validConnection, sourceComponentIndex: -1 }).success).toBe(false)
  })

  it("rejects negative targetComponentIndex", () => {
    expect(StackConnectionSchema.safeParse({ ...validConnection, targetComponentIndex: -1 }).success).toBe(false)
  })

  it("rejects non-integer sourceComponentIndex", () => {
    expect(StackConnectionSchema.safeParse({ ...validConnection, sourceComponentIndex: 1.5 }).success).toBe(false)
  })

  it("rejects missing connectionType", () => {
    const { connectionType: _, ...rest } = validConnection
    expect(StackConnectionSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects empty connectionType", () => {
    expect(StackConnectionSchema.safeParse({ ...validConnection, connectionType: "" }).success).toBe(false)
  })

  it("rejects unknown keys (strict)", () => {
    expect(StackConnectionSchema.safeParse({ ...validConnection, extra: true }).success).toBe(false)
  })
})

// --- StackCategoryScoreSchema ---

describe("StackCategoryScoreSchema", () => {
  it("accepts valid category score", () => {
    const result = StackCategoryScoreSchema.safeParse(validCategoryScore)
    expect(result.success).toBe(true)
  })

  it("rejects score > 10", () => {
    expect(StackCategoryScoreSchema.safeParse({ ...validCategoryScore, score: 11 }).success).toBe(false)
  })

  it("rejects negative score", () => {
    expect(StackCategoryScoreSchema.safeParse({ ...validCategoryScore, score: -1 }).success).toBe(false)
  })

  it("rejects negative metricCount", () => {
    expect(StackCategoryScoreSchema.safeParse({ ...validCategoryScore, metricCount: -1 }).success).toBe(false)
  })

  it("rejects non-integer metricCount", () => {
    expect(StackCategoryScoreSchema.safeParse({ ...validCategoryScore, metricCount: 2.5 }).success).toBe(false)
  })

  it("rejects invalid categoryId not in METRIC_CATEGORIES", () => {
    expect(StackCategoryScoreSchema.safeParse({ ...validCategoryScore, categoryId: "nonexistent" }).success).toBe(false)
  })
})

// --- StackDefinitionSchema ---

describe("StackDefinitionSchema", () => {
  it("accepts valid stack definition", () => {
    const result = StackDefinitionSchema.safeParse(validStack)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("mern-stack")
      expect(result.data.components).toHaveLength(3)
      expect(result.data.connections).toHaveLength(2)
      expect(result.data.tradeOffProfile).toHaveLength(2)
    }
  })

  it("rejects empty id", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, id: "" }).success).toBe(false)
  })

  it("rejects empty name", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, name: "" }).success).toBe(false)
  })

  it("rejects empty description", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, description: "" }).success).toBe(false)
  })

  it("rejects missing required fields", () => {
    expect(StackDefinitionSchema.safeParse({ id: "incomplete" }).success).toBe(false)
  })

  // TD-8-1a review: id field uses same STACK_ID_FORMAT constraint
  it("rejects id with invalid format", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, id: "invalid id!" }).success).toBe(false)
  })

  it("rejects id exceeding 200 chars", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, id: "a".repeat(201) }).success).toBe(false)
  })

  it("rejects empty components array", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, components: [] }).success).toBe(false)
  })

  it("accepts empty connections array", () => {
    const result = StackDefinitionSchema.safeParse({ ...validStack, connections: [] })
    expect(result.success).toBe(true)
  })

  it("accepts empty tradeOffProfile array", () => {
    const result = StackDefinitionSchema.safeParse({ ...validStack, tradeOffProfile: [] })
    expect(result.success).toBe(true)
  })

  it("rejects unknown keys (strict)", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, extra: "field" }).success).toBe(false)
  })

  it("rejects connection with sourceComponentIndex >= components.length", () => {
    const stack = {
      ...validStack,
      connections: [{ sourceComponentIndex: 5, targetComponentIndex: 0, connectionType: "tcp" }],
    }
    expect(StackDefinitionSchema.safeParse(stack).success).toBe(false)
  })

  it("rejects connection with targetComponentIndex >= components.length", () => {
    const stack = {
      ...validStack,
      connections: [{ sourceComponentIndex: 0, targetComponentIndex: 10, connectionType: "tcp" }],
    }
    expect(StackDefinitionSchema.safeParse(stack).success).toBe(false)
  })

  it("rejects self-connection (source === target)", () => {
    const stack = {
      ...validStack,
      connections: [{ sourceComponentIndex: 0, targetComponentIndex: 0, connectionType: "tcp" }],
    }
    expect(StackDefinitionSchema.safeParse(stack).success).toBe(false)
  })

  it("accepts null id as invalid", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, id: null }).success).toBe(false)
  })

  it("accepts null name as invalid", () => {
    expect(StackDefinitionSchema.safeParse({ ...validStack, name: null }).success).toBe(false)
  })
})

// --- StackDefinitionYamlSchema ---

describe("StackDefinitionYamlSchema", () => {
  const validYamlStack = {
    id: "mern-stack",
    name: "MERN Stack",
    description: "MongoDB, Express, React, Node.js",
    components: [
      { component_id: "mongodb", variant_id: "default", relative_position: { x: 0, y: 0 } },
      { component_id: "node-express", variant_id: "default", relative_position: { x: 200, y: 0 } },
    ],
    connections: [
      { source_component_index: 0, target_component_index: 1, connection_type: "tcp" },
    ],
    trade_off_profile: [
      { category_id: "performance", category_name: "Performance", score: 7.2, metric_count: 4, has_data: true },
    ],
  }

  it("transforms snake_case to camelCase", () => {
    const result = StackDefinitionYamlSchema.safeParse(validYamlStack)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.components[0].componentId).toBe("mongodb")
      expect(result.data.components[0].variantId).toBe("default")
      expect(result.data.components[0].relativePosition).toEqual({ x: 0, y: 0 })
      expect(result.data.connections[0].sourceComponentIndex).toBe(0)
      expect(result.data.connections[0].targetComponentIndex).toBe(1)
      expect(result.data.connections[0].connectionType).toBe("tcp")
      expect(result.data.tradeOffProfile[0].categoryId).toBe("performance")
      expect(result.data.tradeOffProfile[0].categoryName).toBe("Performance")
      expect(result.data.tradeOffProfile[0].metricCount).toBe(4)
      expect(result.data.tradeOffProfile[0].hasData).toBe(true)
    }
  })

  it("rejects camelCase input (expects snake_case)", () => {
    const result = StackDefinitionYamlSchema.safeParse(validStack)
    expect(result.success).toBe(false)
  })

  it("rejects missing required fields", () => {
    expect(StackDefinitionYamlSchema.safeParse({ id: "incomplete" }).success).toBe(false)
  })

  it("rejects unknown keys (strict)", () => {
    expect(StackDefinitionYamlSchema.safeParse({ ...validYamlStack, extra: "field" }).success).toBe(false)
  })

  it("round-trip: YAML output matches StackDefinitionSchema shape", () => {
    const yamlResult = StackDefinitionYamlSchema.safeParse(validYamlStack)
    expect(yamlResult.success).toBe(true)
    if (yamlResult.success) {
      const baseResult = StackDefinitionSchema.safeParse(yamlResult.data)
      expect(baseResult.success).toBe(true)
    }
  })

  it("rejects connection with out-of-bounds indices after transform", () => {
    const yamlStack = {
      ...validYamlStack,
      connections: [{ source_component_index: 5, target_component_index: 0, connection_type: "tcp" }],
    }
    expect(StackDefinitionYamlSchema.safeParse(yamlStack).success).toBe(false)
  })

  // TD-8-1a: YAML variant ID constraints
  it("rejects YAML component_id exceeding 200 chars", () => {
    const yamlStack = {
      ...validYamlStack,
      components: [
        { component_id: "a".repeat(201), variant_id: "default", relative_position: { x: 0, y: 0 } },
        { component_id: "node-express", variant_id: "default", relative_position: { x: 200, y: 0 } },
      ],
    }
    expect(StackDefinitionYamlSchema.safeParse(yamlStack).success).toBe(false)
  })

  it("rejects YAML component_id with invalid format", () => {
    const yamlStack = {
      ...validYamlStack,
      components: [
        { component_id: "invalid id!", variant_id: "default", relative_position: { x: 0, y: 0 } },
        { component_id: "node-express", variant_id: "default", relative_position: { x: 200, y: 0 } },
      ],
    }
    expect(StackDefinitionYamlSchema.safeParse(yamlStack).success).toBe(false)
  })

  // TD-8-1a: YAML variant position bounds
  it("rejects YAML relative_position.x below POSITION_MIN", () => {
    const yamlStack = {
      ...validYamlStack,
      components: [
        { component_id: "mongodb", variant_id: "default", relative_position: { x: -10001, y: 0 } },
        { component_id: "node-express", variant_id: "default", relative_position: { x: 200, y: 0 } },
      ],
    }
    expect(StackDefinitionYamlSchema.safeParse(yamlStack).success).toBe(false)
  })

  it("rejects YAML relative_position.y above POSITION_MAX", () => {
    const yamlStack = {
      ...validYamlStack,
      components: [
        { component_id: "mongodb", variant_id: "default", relative_position: { x: 0, y: 10001 } },
        { component_id: "node-express", variant_id: "default", relative_position: { x: 200, y: 0 } },
      ],
    }
    expect(StackDefinitionYamlSchema.safeParse(yamlStack).success).toBe(false)
  })
})
