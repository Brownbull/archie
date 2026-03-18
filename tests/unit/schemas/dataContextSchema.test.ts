import { describe, it, expect } from "vitest"
import { DataContextItemSchema, ArchitectureFileNodeSchema, ArchitectureFileYamlSchema } from "@/schemas/architectureFileSchema"
import { DATA_CONTEXT_NAME_MAX_LENGTH, MAX_DATA_CONTEXT_ITEMS_PER_NODE } from "@/lib/constants"

// --- Test Helpers ---

function validItem(overrides?: Record<string, unknown>) {
  return {
    id: "dci-1",
    name: "User Sessions",
    accessPattern: "read-heavy",
    averageSize: "medium",
    structureType: "simple-kv",
    ...overrides,
  }
}

function validNode(overrides?: Record<string, unknown>) {
  return {
    id: "node-1",
    componentId: "redis",
    position: { x: 0, y: 0 },
    ...overrides,
  }
}

// --- DataContextItemSchema ---

describe("DataContextItemSchema", () => {
  it("accepts a valid data context item", () => {
    const result = DataContextItemSchema.safeParse(validItem())
    expect(result.success).toBe(true)
  })

  describe("required fields", () => {
    it("rejects missing id", () => {
      const { id: _, ...noId } = validItem()
      expect(DataContextItemSchema.safeParse(noId).success).toBe(false)
    })

    it("rejects missing name", () => {
      const { name: _, ...noName } = validItem()
      expect(DataContextItemSchema.safeParse(noName).success).toBe(false)
    })

    it("rejects missing accessPattern", () => {
      const { accessPattern: _, ...noAP } = validItem()
      expect(DataContextItemSchema.safeParse(noAP).success).toBe(false)
    })

    it("rejects missing averageSize", () => {
      const { averageSize: _, ...noSize } = validItem()
      expect(DataContextItemSchema.safeParse(noSize).success).toBe(false)
    })

    it("rejects missing structureType", () => {
      const { structureType: _, ...noST } = validItem()
      expect(DataContextItemSchema.safeParse(noST).success).toBe(false)
    })
  })

  describe("enum validation", () => {
    it.each(["read-heavy", "write-heavy", "mixed", "append-only"] as const)(
      "accepts accessPattern %s",
      (ap) => {
        expect(DataContextItemSchema.safeParse(validItem({ accessPattern: ap })).success).toBe(true)
      },
    )

    it("rejects invalid accessPattern", () => {
      expect(DataContextItemSchema.safeParse(validItem({ accessPattern: "random" })).success).toBe(false)
    })

    it.each(["small", "medium", "large", "huge"] as const)(
      "accepts averageSize %s",
      (size) => {
        expect(DataContextItemSchema.safeParse(validItem({ averageSize: size })).success).toBe(true)
      },
    )

    it("rejects invalid averageSize", () => {
      expect(DataContextItemSchema.safeParse(validItem({ averageSize: "tiny" })).success).toBe(false)
    })

    it.each(["simple-kv", "nested-json", "relational", "binary-blob"] as const)(
      "accepts structureType %s",
      (st) => {
        expect(DataContextItemSchema.safeParse(validItem({ structureType: st })).success).toBe(true)
      },
    )

    it("rejects invalid structureType", () => {
      expect(DataContextItemSchema.safeParse(validItem({ structureType: "xml-doc" })).success).toBe(false)
    })
  })

  describe("strict mode", () => {
    it("rejects unknown fields", () => {
      expect(DataContextItemSchema.safeParse(validItem({ extraField: "nope" })).success).toBe(false)
    })
  })

  describe("name sanitization", () => {
    it("strips HTML tags from name", () => {
      const result = DataContextItemSchema.parse(validItem({ name: "<b>Bold</b> name" }))
      expect(result.name).toBe("Bold name")
    })

    it("strips script tags and content", () => {
      const result = DataContextItemSchema.parse(validItem({ name: "Clean<script>alert('xss')</script>" }))
      expect(result.name).not.toContain("script")
      expect(result.name).not.toContain("alert")
    })

    it("trims whitespace", () => {
      const result = DataContextItemSchema.parse(validItem({ name: "  padded  " }))
      expect(result.name).toBe("padded")
    })

    it("truncates to max length", () => {
      const longName = "x".repeat(DATA_CONTEXT_NAME_MAX_LENGTH + 50)
      const result = DataContextItemSchema.parse(validItem({ name: longName }))
      expect(result.name.length).toBeLessThanOrEqual(DATA_CONTEXT_NAME_MAX_LENGTH)
    })
  })
})

// --- ArchitectureFileNodeSchema with dataContext ---

describe("ArchitectureFileNodeSchema + dataContext", () => {
  it("accepts node without dataContext (optional)", () => {
    const result = ArchitectureFileNodeSchema.safeParse(validNode())
    expect(result.success).toBe(true)
  })

  it("accepts node with valid dataContext array", () => {
    const result = ArchitectureFileNodeSchema.safeParse(
      validNode({ dataContext: [validItem()] }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts node with empty dataContext array", () => {
    const result = ArchitectureFileNodeSchema.safeParse(
      validNode({ dataContext: [] }),
    )
    expect(result.success).toBe(true)
  })

  it("accepts node with max data context items", () => {
    const items = Array.from({ length: MAX_DATA_CONTEXT_ITEMS_PER_NODE }, (_, i) =>
      validItem({ id: `dci-${i}` }),
    )
    const result = ArchitectureFileNodeSchema.safeParse(validNode({ dataContext: items }))
    expect(result.success).toBe(true)
  })

  it("rejects node with too many data context items", () => {
    const items = Array.from({ length: MAX_DATA_CONTEXT_ITEMS_PER_NODE + 1 }, (_, i) =>
      validItem({ id: `dci-${i}` }),
    )
    const result = ArchitectureFileNodeSchema.safeParse(validNode({ dataContext: items }))
    expect(result.success).toBe(false)
  })

  it("rejects node with invalid data context item in array", () => {
    const result = ArchitectureFileNodeSchema.safeParse(
      validNode({ dataContext: [{ id: "bad", name: "Bad" }] }),
    )
    expect(result.success).toBe(false)
  })

  it("rejects node with duplicate data context item IDs", () => {
    const result = ArchitectureFileNodeSchema.safeParse(
      validNode({ dataContext: [validItem({ id: "dup-1" }), validItem({ id: "dup-1" })] }),
    )
    expect(result.success).toBe(false)
  })
})

// --- DataContextItemYamlSchema (snake_case → camelCase round-trip) ---

describe("DataContextItemYamlSchema (via ArchitectureFileYamlSchema)", () => {
  it("transforms snake_case data_context to camelCase dataContext", () => {
    const yamlInput = {
      schema_version: "2.0.0",
      nodes: [{
        id: "node-1",
        component_id: "redis",
        position: { x: 0, y: 0 },
        data_context: [{
          id: "dci-1",
          name: "Sessions",
          access_pattern: "read-heavy",
          average_size: "medium",
          structure_type: "simple-kv",
        }],
      }],
      edges: [],
    }
    const result = ArchitectureFileYamlSchema.safeParse(yamlInput)
    expect(result.success).toBe(true)
    if (result.success) {
      const node = result.data.nodes[0]
      expect(node.dataContext).toBeDefined()
      expect(node.dataContext![0].accessPattern).toBe("read-heavy")
      expect(node.dataContext![0].averageSize).toBe("medium")
      expect(node.dataContext![0].structureType).toBe("simple-kv")
    }
  })
})
