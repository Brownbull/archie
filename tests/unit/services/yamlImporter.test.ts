import { describe, it, expect, vi, beforeEach } from "vitest"
import { importYaml, importYamlString } from "@/services/yamlImporter"
import { MAX_FILE_SIZE } from "@/lib/constants"

const { testComponentMap } = vi.hoisted(() => {
  type TestComponent = {
    id: string
    name: string
    category: string
    description: string
    is: string
    gain: string[]
    cost: string[]
    tags: string[]
    baseMetrics: never[]
    configVariants: { id: string; name: string; metrics: never[] }[]
    compatibility?: Record<string, string>
  }

  function buildComponent(overrides: Partial<TestComponent> & { id: string }): TestComponent {
    return {
      name: "Test Component",
      category: "compute",
      description: "A test component",
      is: "A test component for unit tests",
      gain: ["Test gain"],
      cost: ["Test cost"],
      tags: [],
      baseMetrics: [],
      configVariants: [{ id: "default", name: "Default", metrics: [] }],
      ...overrides,
    }
  }

  const map = new Map<string, TestComponent>()
  map.set("postgresql", buildComponent({
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    description: "Relational database",
    is: "An open-source relational database",
    gain: ["ACID compliance"],
    cost: ["Higher memory usage"],
    tags: ["database"],
    configVariants: [
      { id: "single-node", name: "Single Node", metrics: [] },
      { id: "replica-set", name: "Replica Set", metrics: [] },
    ],
  }))
  map.set("redis", buildComponent({
    id: "redis",
    name: "Redis",
    category: "caching",
    description: "In-memory cache",
    is: "An in-memory data store",
    gain: ["Low latency"],
    cost: ["Memory cost"],
    tags: ["cache"],
    compatibility: { "data-storage": "Caching layer may cause stale reads" },
  }))
  return { testComponentMap: map }
})

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => testComponentMap.get(id)),
    isInitialized: () => true,
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

const validYaml = `schema_version: "1.0.0"
name: "Test Architecture"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    config_variant_id: "single-node"
    position:
      x: 100
      y: 200
  - id: "node-2"
    component_id: "redis"
    config_variant_id: "default"
    position:
      x: 300
      y: 200
edges:
  - id: "edge-1"
    source_node_id: "node-1"
    target_node_id: "node-2"
`

function makeFile(content: string, name = "test.yaml", type = "application/x-yaml"): File {
  return new File([content], name, { type })
}

function makeLargeFile(sizeBytes: number): File {
  const content = "x".repeat(sizeBytes)
  return new File([content], "large.yaml", { type: "application/x-yaml" })
}

describe("yamlImporter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("importYamlString — successful import", () => {
    it("imports valid YAML and returns hydrated nodes and edges", () => {
      const result = importYamlString(validYaml)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.nodes).toHaveLength(2)
      expect(result.architecture.edges).toHaveLength(1)
      expect(result.architecture.placeholderIds).toHaveLength(0)
    })

    it("preserves node IDs from YAML", () => {
      const result = importYamlString(validYaml)
      if (!result.success) return

      expect(result.architecture.nodes[0].id).toBe("node-1")
      expect(result.architecture.nodes[1].id).toBe("node-2")
    })

    it("snaps node positions to grid", () => {
      const result = importYamlString(validYaml)
      if (!result.success) return

      // 100 snapped to 16-grid = 96, 200 snapped = 208
      expect(result.architecture.nodes[0].position.x).toBe(96)
      expect(result.architecture.nodes[0].position.y).toBe(208)
    })

    it("hydrates component data from library", () => {
      const result = importYamlString(validYaml)
      if (!result.success) return

      expect(result.architecture.nodes[0].data.archieComponentId).toBe("postgresql")
      expect(result.architecture.nodes[0].data.componentName).toBe("PostgreSQL")
      expect(result.architecture.nodes[0].data.componentCategory).toBe("data-storage")
    })

    it("uses requested config variant when it exists", () => {
      const result = importYamlString(validYaml)
      if (!result.success) return

      expect(result.architecture.nodes[0].data.activeConfigVariantId).toBe("single-node")
    })

    it("falls back to first variant when requested variant not found", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    config_variant_id: "nonexistent-variant"
    position:
      x: 100
      y: 200
edges: []
`
      const result = importYamlString(yaml)
      if (!result.success) return

      expect(result.architecture.nodes[0].data.activeConfigVariantId).toBe("single-node")
    })

    it("builds edges with compatibility check data", () => {
      const result = importYamlString(validYaml)
      if (!result.success) return

      expect(result.architecture.edges[0].source).toBe("node-1")
      expect(result.architecture.edges[0].target).toBe("node-2")
      expect(result.architecture.edges[0].data).toBeDefined()
    })

    it("accepts empty nodes and edges", () => {
      const yaml = "schema_version: \"1.0.0\"\nnodes: []\nedges: []\n"
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.nodes).toHaveLength(0)
      expect(result.architecture.edges).toHaveLength(0)
    })

    it("sanitizes architecture name", () => {
      const yaml = `schema_version: "1.0.0"
name: "<script>alert('xss')</script>My Arch"
nodes: []
edges: []
`
      const result = importYamlString(yaml)
      if (!result.success) return

      expect(result.architecture.name).not.toContain("<script>")
      expect(result.architecture.name).toContain("My Arch")
    })
  })

  describe("importYaml — file validation", () => {
    it("rejects file exceeding MAX_FILE_SIZE", async () => {
      const file = makeLargeFile(MAX_FILE_SIZE + 1)
      const result = await importYaml(file)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("FILE_TOO_LARGE")
    })

    it("rejects invalid file extension", async () => {
      const result = await importYaml(makeFile(validYaml, "test.json"))

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("INVALID_EXTENSION")
    })

    it("rejects .txt extension", async () => {
      const result = await importYaml(makeFile(validYaml, "test.txt"))

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("INVALID_EXTENSION")
    })

    it("does not reject .yml extension", async () => {
      const file = makeFile(validYaml, "test.yml")
      // Patch text() since jsdom File doesn't support it
      file.text = () => Promise.resolve(validYaml)
      const result = await importYaml(file)
      expect(result.success).toBe(true)
    })

    it("does not reject .yaml extension", async () => {
      const file = makeFile(validYaml, "test.yaml")
      file.text = () => Promise.resolve(validYaml)
      const result = await importYaml(file)
      expect(result.success).toBe(true)
    })
  })

  describe("importYamlString — YAML parsing", () => {
    it("rejects malformed YAML", () => {
      const result = importYamlString(":::invalid yaml{{{")

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("YAML_PARSE_ERROR")
    })

    it("rejects non-object YAML (string)", () => {
      const result = importYamlString("just a string")

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("YAML_PARSE_ERROR")
    })
  })

  describe("importYamlString — schema validation", () => {
    it("rejects missing schema_version", () => {
      const yaml = "nodes: []\nedges: []\n"
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
    })

    it("rejects unknown keys in root (.strict())", () => {
      const yaml = "schema_version: \"1.0.0\"\nnodes: []\nedges: []\nunknown_field: \"bad\"\n"
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
    })

    it("rejects unknown keys in node (.strict())", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "n1"
    component_id: "postgresql"
    position: { x: 0, y: 0 }
    extra_field: "bad"
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
    })

    it("includes Zod error paths in error messages", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "n1"
    component_id: "postgresql"
    position: { x: "not-a-number", y: 0 }
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].path).toBeDefined()
      expect(result.errors[0].path).toContain("nodes")
    })
  })

  describe("importYamlString — version check", () => {
    it("rejects too-new schema version", () => {
      const yaml = "schema_version: \"99.0.0\"\nnodes: []\nedges: []\n"
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("VERSION_TOO_NEW")
    })

    it("rejects too-old schema version with no migration", () => {
      const yaml = "schema_version: \"0.1.0\"\nnodes: []\nedges: []\n"
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("VERSION_TOO_OLD")
    })

    it("accepts same-major version", () => {
      const yaml = "schema_version: \"1.5.0\"\nnodes: []\nedges: []\n"
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
    })

    it("rejects non-numeric major version with INVALID_VERSION_FORMAT", () => {
      const yaml = 'schema_version: "abc.0.0"\nnodes: []\nedges: []\n'
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("INVALID_VERSION_FORMAT")
      expect(result.errors[0].message).toContain("abc.0.0")
    })
  })

  describe("importYamlString — unknown component handling", () => {
    it("creates placeholder for unknown component ID", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "nonexistent-component"
    position:
      x: 100
      y: 200
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.nodes).toHaveLength(1)
      expect(result.architecture.nodes[0].type).toBe("placeholder")
      expect(result.architecture.placeholderIds).toContain("node-1")
    })

    it("mixes known and unknown components", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    position:
      x: 100
      y: 200
  - id: "node-2"
    component_id: "unknown-thing"
    position:
      x: 300
      y: 200
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.nodes).toHaveLength(2)
      expect(result.architecture.nodes[0].type).toBe("archie-component")
      expect(result.architecture.nodes[1].type).toBe("placeholder")
      expect(result.architecture.placeholderIds).toEqual(["node-2"])
    })
  })

  describe("importYamlString — edge resilience", () => {
    it("handles edges referencing non-existent node IDs gracefully", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    position:
      x: 100
      y: 200
edges:
  - id: "edge-1"
    source_node_id: "node-1"
    target_node_id: "does-not-exist"
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.architecture.edges).toHaveLength(1)
      expect(result.architecture.edges[0].source).toBe("node-1")
      expect(result.architecture.edges[0].target).toBe("does-not-exist")
    })
  })
})
