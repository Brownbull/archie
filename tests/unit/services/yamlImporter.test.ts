import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { importYaml, importYamlString, hydrateArchitectureSkeleton } from "@/services/yamlImporter"
import { MIGRATIONS } from "@/schemas/architectureFileSchema"
import { DEFAULT_WEIGHT_PROFILE, MAX_FILE_SIZE } from "@/lib/constants"

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

vi.mock("@/services/scenarioLoader", () => ({
  isKnownScenarioId: vi.fn((id: string) => id === "traffic-peak"),
  getScenarioPreset: vi.fn(),
  getAllScenarioPresets: vi.fn(() => []),
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

    it("rejects image/png MIME type with INVALID_MIME_TYPE", async () => {
      const file = makeFile(validYaml, "test.yaml", "image/png")
      const result = await importYaml(file)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("INVALID_MIME_TYPE")
    })

    it("rejects application/pdf MIME type with INVALID_MIME_TYPE", async () => {
      const file = makeFile(validYaml, "test.yaml", "application/pdf")
      const result = await importYaml(file)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("INVALID_MIME_TYPE")
    })

    it("accepts empty MIME type (browser default for .yaml files)", async () => {
      const file = makeFile(validYaml, "test.yaml", "")
      file.text = () => Promise.resolve(validYaml)
      const result = await importYaml(file)
      expect(result.success).toBe(true)
    })

    it("accepts application/octet-stream MIME type", async () => {
      const file = makeFile(validYaml, "test.yaml", "application/octet-stream")
      file.text = () => Promise.resolve(validYaml)
      const result = await importYaml(file)
      expect(result.success).toBe(true)
    })

    it("rejects video/mp4 MIME type with INVALID_MIME_TYPE", async () => {
      const file = makeFile(validYaml, "test.yaml", "video/mp4")
      const result = await importYaml(file)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("INVALID_MIME_TYPE")
    })
  })

  describe("importYamlString — size guard (TD-5-4a AC-2)", () => {
    it("rejects oversized string input with FILE_TOO_LARGE", () => {
      const oversizedText = "x".repeat(MAX_FILE_SIZE + 1)
      const result = importYamlString(oversizedText)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("FILE_TOO_LARGE")
      }
    })

    it("accepts string at exactly MAX_FILE_SIZE", () => {
      // At exactly the limit, the guard should NOT fire — content still goes through YAML parse
      const exactSizeText = "x".repeat(MAX_FILE_SIZE)
      const result = importYamlString(exactSizeText)
      // Will fail at YAML parse (not valid YAML), but NOT at size check
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).not.toBe("FILE_TOO_LARGE")
      }
    })
  })

  describe("importYamlString — YAML parsing", () => {
    it("rejects malformed YAML", () => {
      const result = importYamlString(":::invalid yaml{{{")

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("YAML_PARSE_ERROR")
    })

    it("does not echo file content in YAML parse error message (TD-6-4a AC-1)", () => {
      // Unclosed bracket triggers js-yaml YAMLException whose .message includes the line content
      const result = importYamlString("sensitive_api_key: [unclosed")

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("YAML_PARSE_ERROR")
      // Positive: verify the fixed generic message
      expect(result.errors[0].message).toBe("YAML file could not be parsed. Check file syntax.")
      // Negative: verify no content leakage from the file
      expect(result.errors[0].message).not.toContain("sensitive_api_key")
      expect(result.errors[0].message).not.toContain("unclosed")
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

  describe("importYamlString — migration", () => {
    let migrationSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      migrationSpy = vi.fn((data) => ({
        ...(data as object),
        name: "migrated-architecture",
      }))
      MIGRATIONS["0"] = migrationSpy
    })

    afterEach(() => {
      delete MIGRATIONS["0"]
    })

    it("calls migration function and reflects transformed data in output", () => {
      const yaml = `
schema_version: "0.5.0"
nodes: []
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(migrationSpy).toHaveBeenCalledTimes(1)
      expect(migrationSpy).toHaveBeenCalledWith(
        expect.objectContaining({ schemaVersion: "0.5.0", nodes: [], edges: [] }),
      )
      expect(result.architecture.name).toBe("migrated-architecture")
    })

    it("returns MIGRATION_ERROR when migration function throws", () => {
      migrationSpy.mockImplementation(() => {
        throw new Error("migration blew up")
      })

      const yaml = `
schema_version: "0.5.0"
nodes: []
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("MIGRATION_ERROR")
      expect(result.errors[0].message).toBe("migration blew up")
    })

    it("returns MIGRATION_NULL_RESULT when migration function returns null", () => {
      migrationSpy.mockReturnValue(null)

      const yaml = `
schema_version: "0.5.0"
nodes: []
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("MIGRATION_NULL_RESULT")
    })

    it("returns MIGRATION_NULL_RESULT when migration function returns undefined", () => {
      migrationSpy.mockReturnValue(undefined)

      const yaml = `
schema_version: "0.5.0"
nodes: []
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("MIGRATION_NULL_RESULT")
    })

    it("returns MIGRATION_ERROR with fallback message when migration throws a non-Error value", () => {
      migrationSpy.mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw "string error"
      })

      const yaml = `
schema_version: "0.5.0"
nodes: []
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("MIGRATION_ERROR")
      expect(result.errors[0].message).toBe("Migration function threw an error")
    })

    it("transformed nodes from migration appear in hydrated output", () => {
      migrationSpy.mockImplementation((data) => ({
        ...(data as object),
        // Migration functions receive and must return camelCase ArchitectureFile shape —
        // Zod has already transformed snake_case input before this point
        nodes: [
          {
            id: "node-1",
            componentId: "redis",
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      }))

      const yaml = `
schema_version: "0.5.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    config_variant_id: "single-node"
    position:
      x: 100
      y: 200
edges: []
`
      const result = importYamlString(yaml)

      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.nodes).toHaveLength(1)
      expect(result.architecture.nodes[0].data.archieComponentId).toBe("redis")
    })
  })
})

describe("hydrateArchitectureSkeleton", () => {
  it("hydrates a valid ArchitectureFile directly (no YAML parsing)", () => {
    const data = {
      schemaVersion: "1.0.0",
      nodes: [
        { id: "node-1", componentId: "nginx", configVariantId: "load-balancer", position: { x: 96, y: 192 } },
      ],
      edges: [],
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.nodes).toHaveLength(1)
    expect(result.architecture.nodes[0].data.archieComponentId).toBe("nginx")
  })

  it("returns placeholder for unknown component ID", () => {
    const data = {
      schemaVersion: "1.0.0",
      nodes: [
        { id: "node-1", componentId: "unknown-component", configVariantId: "default", position: { x: 96, y: 192 } },
      ],
      edges: [],
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.placeholderIds).toContain("node-1")
  })

  it("returns DEFAULT_WEIGHT_PROFILE when input has no weightProfile (TD-5-4a AC-1)", () => {
    const data = {
      schemaVersion: "1.0.0",
      nodes: [],
      edges: [],
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.weightProfile).toEqual(DEFAULT_WEIGHT_PROFILE)
  })

  it("normalizes all-zero weightProfile to DEFAULT_WEIGHT_PROFILE (TD-5-4a)", () => {
    const data = {
      schemaVersion: "1.0.0",
      nodes: [],
      edges: [],
      weightProfile: Object.fromEntries(
        Object.keys(DEFAULT_WEIGHT_PROFILE).map((k) => [k, 0]),
      ),
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.weightProfile).toEqual(DEFAULT_WEIGHT_PROFILE)
  })

  it("builds edges for the hydrated architecture", () => {
    const data = {
      schemaVersion: "1.0.0",
      nodes: [
        { id: "n1", componentId: "nginx", configVariantId: "load-balancer", position: { x: 96, y: 192 } },
        { id: "n2", componentId: "redis", configVariantId: "standalone", position: { x: 320, y: 192 } },
      ],
      edges: [{ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" }],
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.edges).toHaveLength(1)
    expect(result.architecture.edges[0].id).toBe("e1")
  })

  // Story 9-4 Task 4.5: Unknown scenario ID gracefully defaults to undefined
  it("restores activeScenarioId when it matches a known preset", () => {
    const data = {
      schemaVersion: "2.0.0",
      nodes: [{ id: "n1", componentId: "postgresql", configVariantId: "single-node", position: { x: 0, y: 0 } }],
      edges: [],
      activeScenarioId: "traffic-peak",
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.activeScenarioId).toBe("traffic-peak")
  })

  it("defaults activeScenarioId to undefined when unknown preset", () => {
    const data = {
      schemaVersion: "2.0.0",
      nodes: [{ id: "n1", componentId: "postgresql", configVariantId: "single-node", position: { x: 0, y: 0 } }],
      edges: [],
      activeScenarioId: "unknown-scenario-xyz",
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.activeScenarioId).toBeUndefined()
  })

  it("defaults activeScenarioId to undefined when not provided", () => {
    const data = {
      schemaVersion: "2.0.0",
      nodes: [{ id: "n1", componentId: "postgresql", configVariantId: "single-node", position: { x: 0, y: 0 } }],
      edges: [],
    }
    const result = hydrateArchitectureSkeleton(data)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.architecture.activeScenarioId).toBeUndefined()
  })
})
