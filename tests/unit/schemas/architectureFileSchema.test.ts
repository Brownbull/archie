import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  ArchitectureFileSchema,
  ArchitectureFileYamlSchema,
  ArchitectureFileNodeSchema,
  ArchitectureFileEdgeSchema,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  checkSchemaVersion,
  type VersionStatus,
} from "@/schemas/architectureFileSchema"
import { METRIC_CATEGORIES, MAX_CANVAS_NODES, MAX_EDGES } from "@/lib/constants"

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
  it("is 2.0.0", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("2.0.0")
  })
})

describe("MIGRATIONS", () => {
  it("has v1-to-v2 migration registered", () => {
    expect(MIGRATIONS).toHaveProperty("1")
    expect(typeof MIGRATIONS["1"]).toBe("function")
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

describe("Defense-in-depth: PositionSchema numeric bounds (TD-5-1b)", () => {
  it("rejects x value exceeding 10000", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 10001, y: 200 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects y value exceeding 10000", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 100, y: 10001 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects x value below -10000", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: -10001, y: 200 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects y value below -10000", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 100, y: -10001 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects extreme float values like 1e308", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 1e308, y: 200 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects -1e308", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 100, y: -1e308 },
    })
    expect(result.success).toBe(false)
  })

  it("accepts position at exactly -10000", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: -10000, y: -10000 },
    })
    expect(result.success).toBe(true)
  })

  it("accepts position at exactly 10000", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 10000, y: 10000 },
    })
    expect(result.success).toBe(true)
  })

  it("rejects Infinity", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: Infinity, y: 200 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects -Infinity", () => {
    const result = ArchitectureFileNodeSchema.safeParse({
      ...validNode,
      position: { x: 100, y: -Infinity },
    })
    expect(result.success).toBe(false)
  })

  it("YAML variant also rejects out-of-bounds positions", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      schema_version: "1.0.0",
      nodes: [{ id: "node-1", component_id: "pg", position: { x: 1e308, y: 0 } }],
      edges: [],
    })
    expect(result.success).toBe(false)
  })

  it("YAML variant rejects negative out-of-bounds positions", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      schema_version: "1.0.0",
      nodes: [{ id: "node-1", component_id: "pg", position: { x: 0, y: -10001 } }],
      edges: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("Defense-in-depth: METRIC_CATEGORIES static assertion (TD-5-1a)", () => {
  it("METRIC_CATEGORIES has exactly 7 entries", () => {
    // This test mirrors the static assertion in architectureFileSchema.ts
    // If METRIC_CATEGORIES changes length, both this test AND the module assertion will catch it
    expect(METRIC_CATEGORIES).toHaveLength(7)
  })
})

describe("Defense-in-depth: METRIC_CATEGORIES static assertion throw-path (TD-5-1b)", () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it("throws when METRIC_CATEGORIES has wrong length", async () => {
    vi.resetModules()
    vi.doMock("@/lib/constants", async () => {
      const actual = await vi.importActual<typeof import("@/lib/constants")>("@/lib/constants")
      return {
        ...actual,
        METRIC_CATEGORIES: actual.METRIC_CATEGORIES.slice(0, 3),
      }
    })

    await expect(
      import("@/schemas/architectureFileSchema"),
    ).rejects.toThrow("METRIC_CATEGORIES length changed to 3 (expected 7)")
  })

  it("throws when METRIC_CATEGORIES has more than 7 entries", async () => {
    vi.resetModules()
    vi.doMock("@/lib/constants", async () => {
      const actual = await vi.importActual<typeof import("@/lib/constants")>("@/lib/constants")
      return {
        ...actual,
        METRIC_CATEGORIES: [...actual.METRIC_CATEGORIES, { id: "extra", name: "Extra", shortName: "Ex", iconName: "Star", color: "var(--extra)" }],
      }
    })

    await expect(
      import("@/schemas/architectureFileSchema"),
    ).rejects.toThrow("METRIC_CATEGORIES length changed to 8 (expected 7)")
  })
})

describe("Defense-in-depth: string length limits (TD-5-1a)", () => {
  const longString = "a".repeat(257)

  it("rejects node id exceeding 256 chars", () => {
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, id: longString })
    expect(result.success).toBe(false)
  })

  it("rejects node componentId exceeding 256 chars", () => {
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, componentId: longString })
    expect(result.success).toBe(false)
  })

  it("rejects edge id exceeding 256 chars", () => {
    const result = ArchitectureFileEdgeSchema.safeParse({ ...validEdge, id: longString })
    expect(result.success).toBe(false)
  })

  it("rejects edge sourceNodeId exceeding 256 chars", () => {
    const result = ArchitectureFileEdgeSchema.safeParse({ ...validEdge, sourceNodeId: longString })
    expect(result.success).toBe(false)
  })

  it("rejects edge targetNodeId exceeding 256 chars", () => {
    const result = ArchitectureFileEdgeSchema.safeParse({ ...validEdge, targetNodeId: longString })
    expect(result.success).toBe(false)
  })

  it("rejects schemaVersion exceeding 256 chars", () => {
    const result = ArchitectureFileSchema.safeParse({ ...validArchitectureFile, schemaVersion: longString })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 256 chars", () => {
    const result = ArchitectureFileSchema.safeParse({ ...validArchitectureFile, name: longString })
    expect(result.success).toBe(false)
  })

  it("rejects libraryVersion exceeding 256 chars", () => {
    const result = ArchitectureFileSchema.safeParse({ ...validArchitectureFile, libraryVersion: longString })
    expect(result.success).toBe(false)
  })

  it("accepts strings at exactly 256 chars", () => {
    const maxString = "a".repeat(256)
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, id: maxString, componentId: maxString })
    expect(result.success).toBe(true)
  })

  it("rejects empty string for node id (.min(1))", () => {
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, id: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty string for edge sourceNodeId (.min(1))", () => {
    const result = ArchitectureFileEdgeSchema.safeParse({ ...validEdge, sourceNodeId: "" })
    expect(result.success).toBe(false)
  })

  it("rejects configVariantId exceeding 256 chars", () => {
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, configVariantId: longString })
    expect(result.success).toBe(false)
  })

  it("rejects non-string type for node id", () => {
    const result = ArchitectureFileNodeSchema.safeParse({ ...validNode, id: 123 })
    expect(result.success).toBe(false)
  })

  it("rejects non-string type for edge id", () => {
    const result = ArchitectureFileEdgeSchema.safeParse({ ...validEdge, id: 456 })
    expect(result.success).toBe(false)
  })
})

describe("Defense-in-depth: YAML variant string length parity (TD-5-1a)", () => {
  const longString = "a".repeat(257)

  it("rejects YAML node component_id exceeding 256 chars", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      schema_version: "1.0.0",
      nodes: [{ id: "node-1", component_id: longString, position: { x: 0, y: 0 } }],
      edges: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects YAML edge source_node_id exceeding 256 chars", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      schema_version: "1.0.0",
      nodes: [],
      edges: [{ id: "edge-1", source_node_id: longString, target_node_id: "node-2" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("Defense-in-depth: array size limits (TD-5-1a)", () => {
  it("rejects nodes array exceeding MAX_CANVAS_NODES", () => {
    const oversizedNodes = Array.from({ length: MAX_CANVAS_NODES + 1 }, (_, i) => ({
      id: `node-${i}`,
      componentId: `comp-${i}`,
      position: { x: i * 10, y: i * 10 },
    }))
    const result = ArchitectureFileSchema.safeParse({
      ...validArchitectureFile,
      nodes: oversizedNodes,
    })
    expect(result.success).toBe(false)
  })

  it("accepts nodes array at exactly MAX_CANVAS_NODES", () => {
    const maxNodes = Array.from({ length: MAX_CANVAS_NODES }, (_, i) => ({
      id: `node-${i}`,
      componentId: `comp-${i}`,
      position: { x: i * 10, y: i * 10 },
    }))
    const result = ArchitectureFileSchema.safeParse({
      ...validArchitectureFile,
      nodes: maxNodes,
    })
    expect(result.success).toBe(true)
  })

  it("rejects edges array exceeding MAX_EDGES", () => {
    const oversizedEdges = Array.from({ length: MAX_EDGES + 1 }, (_, i) => ({
      id: `edge-${i}`,
      sourceNodeId: `node-${i}`,
      targetNodeId: `node-${i + 1}`,
    }))
    const result = ArchitectureFileSchema.safeParse({
      ...validArchitectureFile,
      edges: oversizedEdges,
    })
    expect(result.success).toBe(false)
  })

  it("accepts edges array at exactly MAX_EDGES", () => {
    const maxEdges = Array.from({ length: MAX_EDGES }, (_, i) => ({
      id: `edge-${i}`,
      sourceNodeId: `node-${i}`,
      targetNodeId: `node-${i + 1}`,
    }))
    const result = ArchitectureFileSchema.safeParse({
      ...validArchitectureFile,
      edges: maxEdges,
    })
    expect(result.success).toBe(true)
  })
})

describe("checkSchemaVersion", () => {
  it("returns compatible for same version", () => {
    expect(checkSchemaVersion("1.0.0", "1.0.0")).toEqual({ status: "compatible" })
  })

  it("returns compatible for newer minor version", () => {
    expect(checkSchemaVersion("1.0.0", "1.2.0")).toEqual({ status: "compatible" })
  })

  it("returns compatible for newer patch version", () => {
    expect(checkSchemaVersion("1.0.0", "1.0.5")).toEqual({ status: "compatible" })
  })

  it("returns compatible for older minor (same major)", () => {
    expect(checkSchemaVersion("1.2.0", "1.0.0")).toEqual({ status: "compatible" })
  })

  it("returns too-new when file major is newer than app major", () => {
    expect(checkSchemaVersion("2.0.0", "1.0.0")).toEqual({ status: "too-new" })
  })

  it("returns too-old when file major is older and no migration", () => {
    expect(checkSchemaVersion("0.5.0", "1.0.0")).toEqual({ status: "too-old" })
  })

  describe("migrate branch", () => {
    beforeEach(() => {
      MIGRATIONS["0"] = (d) => d
    })
    afterEach(() => {
      delete MIGRATIONS["0"]
    })

    it("returns migrate status with correct migrationKey", () => {
      expect(checkSchemaVersion("0.5.0", "1.0.0")).toEqual({ status: "migrate", migrationKey: 0 })
    })
  })

  it("returns invalid-format for non-numeric file major version", () => {
    const result = checkSchemaVersion("abc.0.0", "1.0.0")
    expect(result.status).toBe("invalid-format")
    if (result.status === "invalid-format") {
      expect(result.reason).toContain("abc.0.0")
    }
  })

  it("returns invalid-format for non-numeric app major version", () => {
    const result = checkSchemaVersion("1.0.0", "xyz.0.0")
    expect(result.status).toBe("invalid-format")
    if (result.status === "invalid-format") {
      expect(result.reason).toContain("xyz.0.0")
    }
  })

  it("returns too-old for empty file version (defensive — Zod min(1) prevents this in practice)", () => {
    // Number("") → 0, which passes the isNaN guard. Major 0 < 1 → too-old.
    // In the real pipeline, Zod's min(1) rejects empty strings before this function runs.
    const result = checkSchemaVersion("", "1.0.0")
    expect(result).toEqual({ status: "too-old" })
  })

  it("VersionStatus discriminated union is exhaustive (compile-time check)", () => {
    // This test exists to verify the VersionStatus type covers all variants.
    // If a variant is added to VersionStatus without updating this switch,
    // TypeScript will error on the `never` assignment below.
    const result: VersionStatus = checkSchemaVersion("1.0.0", "1.0.0")
    switch (result.status) {
      case "compatible":
      case "too-new":
      case "too-old":
      case "migrate":
      case "invalid-format":
        expect(result.status).toBe("compatible")
        break
      default: {
        const _exhaustive: never = result
        void _exhaustive
      }
    }
  })
})
