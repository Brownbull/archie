import { describe, it, expect } from "vitest"
import {
  ArchitectureFileSchema,
  ArchitectureFileYamlSchema,
  ArchitectureFileNodeSchema,
  ArchitectureFileEdgeSchema,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  checkSchemaVersion,
} from "@/schemas/architectureFileSchema"

const validNode = {
  id: "node-1",
  componentId: "postgresql",
  configVariantId: "single-node",
  position: { x: 100, y: 200 },
}

const validEdge = {
  id: "edge-1",
  sourceNodeId: "node-1",
  targetNodeId: "node-2",
}

const validArchitectureFile = {
  schemaVersion: "1.0.0",
  nodes: [validNode],
  edges: [validEdge],
}

describe("CURRENT_SCHEMA_VERSION", () => {
  it("is 1.0.0", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("1.0.0")
  })
})

describe("MIGRATIONS", () => {
  it("is an empty record for v1", () => {
    expect(MIGRATIONS).toEqual({})
  })
})

describe("ArchitectureFileNodeSchema", () => {
  it("accepts valid node", () => {
    const result = ArchitectureFileNodeSchema.safeParse(validNode)
    expect(result.success).toBe(true)
  })

  it("rejects node with missing id", () => {
    const { id: _id, ...withoutId } = validNode
    const result = ArchitectureFileNodeSchema.safeParse(withoutId)
    expect(result.success).toBe(false)
  })

  it("rejects node with missing componentId", () => {
    const { componentId: _cid, ...withoutCid } = validNode
    const result = ArchitectureFileNodeSchema.safeParse(withoutCid)
    expect(result.success).toBe(false)
  })

  it("rejects node with missing position", () => {
    const { position: _pos, ...withoutPos } = validNode
    const result = ArchitectureFileNodeSchema.safeParse(withoutPos)
    expect(result.success).toBe(false)
  })

  it("rejects node with malformed position (missing y)", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 100 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects node with malformed position (string instead of number)", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: "100", y: "200" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys (.strict())", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      unknownField: "nope",
    })
    expect(result.success).toBe(false)
  })

  it("accepts node without configVariantId (optional)", () => {
    const { configVariantId: _cvid, ...withoutCvid } = validNode
    const result = ArchitectureFileNodeSchema.safeParse(withoutCvid)
    expect(result.success).toBe(true)
  })

  it("rejects empty id", () => {
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, id: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty componentId", () => {
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, componentId: "" })
    expect(result.success).toBe(false)
  })
})

describe("ArchitectureFileEdgeSchema", () => {
  it("accepts valid edge", () => {
    const result = ArchitectureFileEdgeSchema.safeParse(validEdge)
    expect(result.success).toBe(true)
  })

  it("rejects edge with missing sourceNodeId", () => {
    const { sourceNodeId: _sid, ...withoutSid } = validEdge
    const result = ArchitectureFileEdgeSchema.safeParse(withoutSid)
    expect(result.success).toBe(false)
  })

  it("rejects edge with missing targetNodeId", () => {
    const { targetNodeId: _tid, ...withoutTid } = validEdge
    const result = ArchitectureFileEdgeSchema.safeParse(withoutTid)
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys (.strict())", () => {
    const result = ArchitectureFileEdgeSchema.safeParse({
      ...validEdge,
      unknownField: "nope",
    })
    expect(result.success).toBe(false)
  })
})

describe("ArchitectureFileSchema", () => {
  it("accepts valid architecture file", () => {
    const result = ArchitectureFileSchema.safeParse(validArchitectureFile)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.schemaVersion).toBe("1.0.0")
      expect(result.data.nodes).toHaveLength(1)
      expect(result.data.edges).toHaveLength(1)
    }
  })

  it("accepts file with optional name", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validArchitectureFile,
      name: "My Architecture",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("My Architecture")
    }
  })

  it("accepts file with optional libraryVersion", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validArchitectureFile,
      libraryVersion: "2.0.0",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.libraryVersion).toBe("2.0.0")
    }
  })

  it("accepts empty nodes and edges arrays", () => {
    const result = ArchitectureFileSchema.safeParse({
      schemaVersion: "1.0.0",
      nodes: [],
      edges: [],
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing schemaVersion", () => {
    const { schemaVersion: _sv, ...withoutVersion } = validArchitectureFile
    const result = ArchitectureFileSchema.safeParse(withoutVersion)
    expect(result.success).toBe(false)
  })

  it("rejects missing nodes", () => {
    const { nodes: _nodes, ...withoutNodes } = validArchitectureFile
    const result = ArchitectureFileSchema.safeParse(withoutNodes)
    expect(result.success).toBe(false)
  })

  it("rejects missing edges", () => {
    const { edges: _edges, ...withoutEdges } = validArchitectureFile
    const result = ArchitectureFileSchema.safeParse(withoutEdges)
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys (.strict())", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validArchitectureFile,
      unknownField: "nope",
    })
    expect(result.success).toBe(false)
  })
})

describe("ArchitectureFileYamlSchema (snake_case to camelCase)", () => {
  const yamlInput = {
    schema_version: "1.0.0",
    nodes: [
      {
        id: "node-1",
        component_id: "postgresql",
        config_variant_id: "single-node",
        position: { x: 100, y: 200 },
      },
    ],
    edges: [
      {
        id: "edge-1",
        source_node_id: "node-1",
        target_node_id: "node-2",
      },
    ],
  }

  it("transforms snake_case to camelCase", () => {
    const result = ArchitectureFileYamlSchema.safeParse(yamlInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.schemaVersion).toBe("1.0.0")
      expect(result.data.nodes[0].componentId).toBe("postgresql")
      expect(result.data.nodes[0].configVariantId).toBe("single-node")
      expect(result.data.edges[0].sourceNodeId).toBe("node-1")
      expect(result.data.edges[0].targetNodeId).toBe("node-2")
    }
  })

  it("transforms optional snake_case fields", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlInput,
      name: "Test Architecture",
      library_version: "1.0.0",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Test Architecture")
      expect(result.data.libraryVersion).toBe("1.0.0")
    }
  })

  it("rejects invalid yaml data", () => {
    const result = ArchitectureFileYamlSchema.safeParse({ schema_version: "1.0.0" })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys in YAML input (.strict())", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlInput,
      unknown_field: "nope",
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys in YAML node (.strict())", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlInput,
      nodes: [{ ...yamlInput.nodes[0], extra_field: "nope" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys in YAML edge (.strict())", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlInput,
      edges: [{ ...yamlInput.edges[0], extra_field: "nope" }],
    })
    expect(result.success).toBe(false)
  })

  it("round-trip: YAML output matches ArchitectureFileSchema shape", () => {
    const yamlResult = ArchitectureFileYamlSchema.safeParse(yamlInput)
    expect(yamlResult.success).toBe(true)
    if (yamlResult.success) {
      const baseResult = ArchitectureFileSchema.safeParse(yamlResult.data)
      expect(baseResult.success).toBe(true)
    }
  })

  it("accepts node without config_variant_id (optional)", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlInput,
      nodes: [
        {
          id: "node-1",
          component_id: "postgresql",
          position: { x: 100, y: 200 },
        },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nodes[0].configVariantId).toBeUndefined()
    }
  })
})

describe("checkSchemaVersion", () => {
  it("returns 'compatible' for same version", () => {
    expect(checkSchemaVersion("1.0.0", "1.0.0")).toBe("compatible")
  })

  it("returns 'compatible' for newer minor version", () => {
    expect(checkSchemaVersion("1.0.0", "1.2.0")).toBe("compatible")
  })

  it("returns 'compatible' for newer patch version", () => {
    expect(checkSchemaVersion("1.0.0", "1.0.5")).toBe("compatible")
  })

  it("returns 'compatible' for older minor (same major)", () => {
    expect(checkSchemaVersion("1.2.0", "1.0.0")).toBe("compatible")
  })

  it("returns 'too-new' when file major is newer than app major", () => {
    expect(checkSchemaVersion("2.0.0", "1.0.0")).toBe("too-new")
  })

  it("returns 'too-old' when file major is older and no migration", () => {
    expect(checkSchemaVersion("0.5.0", "1.0.0")).toBe("too-old")
  })

  it("returns 'migrate' when file major is older and migration exists", () => {
    // Temporarily add a migration for testing
    const originalMigrations = { ...MIGRATIONS }
    ;(MIGRATIONS as Record<string, (data: unknown) => unknown>)["0"] = (d) => d
    expect(checkSchemaVersion("0.5.0", "1.0.0")).toBe("migrate")
    // Clean up
    delete (MIGRATIONS as Record<string, (data: unknown) => unknown>)["0"]
    expect(MIGRATIONS).toEqual(originalMigrations)
  })
})
