import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { importYamlString, importYaml, _resetImportGuard } from "@/services/yamlImporter"
import { MAX_CANVAS_NODES, MAX_FILE_SIZE } from "@/lib/constants"

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
  }))
  return { testComponentMap: map, buildComponent }
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
edges: []
`

function makeFile(content: string, name = "test.yaml"): File {
  const file = new File([content], name, { type: "application/x-yaml" })
  file.text = () => Promise.resolve(content)
  return file
}

describe("yamlImporter — adversarial inputs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    _resetImportGuard()
  })

  // --- AC-1: Deeply Nested YAML ---

  describe("deeply nested YAML", () => {
    it("rejects deeply nested YAML via .strict() without stack overflow", () => {
      // Build 60-level nested object inside extra field — .strict() rejects unknown key
      let nested = '"leaf"'
      for (let i = 0; i < 60; i++) {
        nested = `{ level_${i}: ${nested} }`
      }
      const yaml = `schema_version: "1.0.0"\nnodes: []\nedges: []\ndeep: ${nested}\n`
      const result = importYamlString(yaml)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
      }
    })

    it("does not crash on deeply nested YAML outside schema structure", () => {
      let yaml = "a:\n"
      for (let i = 0; i < 60; i++) {
        yaml += "  ".repeat(i + 1) + `level${i}:\n`
      }
      yaml += "  ".repeat(61) + "value: 1\n"
      const result = importYamlString(yaml)
      // Parses but fails schema validation — does NOT throw
      expect(result.success).toBe(false)
    })
  })

  // --- AC-2: Oversized Array Handling ---

  describe("node count limits", () => {
    it("rejects YAML with more than MAX_CANVAS_NODES nodes", () => {
      const nodes = Array.from({ length: MAX_CANVAS_NODES + 1 }, (_, i) =>
        `  - id: "node-${i}"\n    component_id: "postgresql"\n    position:\n      x: ${i * 200}\n      y: 0`,
      ).join("\n")
      const yaml = `schema_version: "1.0.0"\nnodes:\n${nodes}\nedges: []\n`

      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("TOO_MANY_NODES")
        expect(result.errors[0].message).toContain(String(MAX_CANVAS_NODES + 1))
        expect(result.errors[0].message).toContain(String(MAX_CANVAS_NODES))
      }
    })

    it("accepts exactly MAX_CANVAS_NODES nodes", () => {
      const nodes = Array.from({ length: MAX_CANVAS_NODES }, (_, i) =>
        `  - id: "node-${i}"\n    component_id: "postgresql"\n    position:\n      x: ${i * 200}\n      y: 0`,
      ).join("\n")
      const yaml = `schema_version: "1.0.0"\nnodes:\n${nodes}\nedges: []\n`

      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
    })

    it("processes MAX_CANVAS_NODES nodes in under 2 seconds", () => {
      const nodes = Array.from({ length: MAX_CANVAS_NODES }, (_, i) =>
        `  - id: "node-${i}"\n    component_id: "postgresql"\n    position:\n      x: ${i * 200}\n      y: 0`,
      ).join("\n")
      const yaml = `schema_version: "1.0.0"\nnodes:\n${nodes}\nedges: []\n`

      const start = performance.now()
      const result = importYamlString(yaml)
      const elapsed = performance.now() - start

      expect(result.success).toBe(true)
      expect(elapsed).toBeLessThan(1500)
    })
  })

  // --- File-Level Validation ---

  describe("file-level validation", () => {
    it("rejects file larger than MAX_FILE_SIZE", async () => {
      const file = makeFile(validYaml, "large.yaml")
      Object.defineProperty(file, "size", { value: MAX_FILE_SIZE + 1 })
      const result = await importYaml(file)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("FILE_TOO_LARGE")
      }
    })

    it("rejects non-YAML file extension", async () => {
      const file = makeFile(validYaml, "architecture.txt")
      const result = await importYaml(file)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("INVALID_EXTENSION")
      }
    })
  })

  // --- AC-3: Unicode Homoglyph Resilience ---

  describe("Unicode homoglyph handling", () => {
    it("NFC normalization collapses decomposed characters for ID lookup", () => {
      // "é" composed (U+00E9) vs decomposed (e + U+0301)
      const composedId = "cach\u00E9"
      const decomposedId = "cache\u0301"

      testComponentMap.set(composedId, {
        id: composedId,
        name: "Caché",
        category: "caching",
        description: "Test",
        is: "Test",
        gain: [],
        cost: [],
        tags: [],
        baseMetrics: [] as never[],
        configVariants: [{ id: "default", name: "Default", metrics: [] as never[] }],
      })

      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "${decomposedId}"
    position:
      x: 100
      y: 200
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // After NFC normalization, decomposed "é" matches composed "é"
      expect(result.architecture.nodes[0].type).toBe("archie-component")
      expect(result.architecture.placeholderIds).toHaveLength(0)

      testComponentMap.delete(composedId)
    })

    it("cross-script homoglyphs (Cyrillic vs Latin) are NOT conflated", () => {
      // Cyrillic "о" (U+043E) vs Latin "o" (U+006F) — different code points after NFC
      const cyrillicO = "\u043E"
      const componentIdWithCyrillic = `p${cyrillicO}stgresql`

      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "${componentIdWithCyrillic}"
    position:
      x: 100
      y: 200
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return

      // Cyrillic "о" != Latin "o" — library lookup fails → placeholder
      expect(result.architecture.placeholderIds).toContain("node-1")
    })
  })

  // --- AC-5: Schema Version Edge Cases ---

  describe("schema version edge cases", () => {
    it("rejects empty schema_version string", () => {
      const yaml = 'schema_version: ""\nnodes: []\nedges: []\n'
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
      }
    })

    it("rejects non-semver schema_version gracefully", () => {
      const yaml = 'schema_version: "not-semver"\nnodes: []\nedges: []\n'
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("VERSION_TOO_OLD")
      }
    })

    it("rejects schema_version '0.0.0' as too old", () => {
      const yaml = 'schema_version: "0.0.0"\nnodes: []\nedges: []\n'
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("VERSION_TOO_OLD")
      }
    })

    it("rejects schema_version '999.0.0' as too new", () => {
      const yaml = 'schema_version: "999.0.0"\nnodes: []\nedges: []\n'
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("VERSION_TOO_NEW")
      }
    })

    it("rejects null schema_version at schema layer", () => {
      const yaml = "schema_version: null\nnodes: []\nedges: []\n"
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
      }
    })

    it("rejects missing schema_version (undefined)", () => {
      const yaml = "nodes: []\nedges: []\n"
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
      }
    })

    it("rejects numeric schema_version at schema layer", () => {
      // YAML parses bare 1.0 as a number, not a string
      const yaml = "schema_version: 1.0\nnodes: []\nedges: []\n"
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR")
      }
    })
  })

  // --- AC-6: Empty/Minimal YAML Edge Cases ---

  describe("empty and minimal YAML", () => {
    it("imports empty nodes and edges successfully", () => {
      const yaml = 'schema_version: "1.0.0"\nnodes: []\nedges: []\n'
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.nodes).toHaveLength(0)
      expect(result.architecture.edges).toHaveLength(0)
    })

    it("places single node at origin (0,0) correctly", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    position:
      x: 0
      y: 0
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.nodes).toHaveLength(1)
      // snapToGrid(0) = 0
      expect(result.architecture.nodes[0].position.x).toBe(0)
      expect(result.architecture.nodes[0].position.y).toBe(0)
    })

    it("handles negative position values with grid-snap", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    position:
      x: -100
      y: -200
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      // snapToGrid(-100) = Math.round(-100/16)*16 = Math.round(-6.25)*16 = -6*16 = -96
      expect(result.architecture.nodes[0].position.x).toBe(-96)
      // snapToGrid(-200) = Math.round(-200/16)*16 = Math.round(-12.5)*16 = -12*16 = -192
      expect(result.architecture.nodes[0].position.y).toBe(-192)
    })
  })

  // --- Hydration Edge Cases ---

  describe("hydration edge cases", () => {
    it("falls back to first variant when specified variant not found", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    config_variant_id: "non-existent-variant"
    position:
      x: 100
      y: 200
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.nodes[0].data.activeConfigVariantId).toBe("single-node")
    })

    it("creates multiple placeholders for unknown components", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "unknown-service-a"
    position:
      x: 0
      y: 0
  - id: "node-2"
    component_id: "unknown-service-b"
    position:
      x: 200
      y: 0
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.placeholderIds).toHaveLength(2)
      expect(result.architecture.placeholderIds).toContain("node-1")
      expect(result.architecture.placeholderIds).toContain("node-2")
    })
  })

  // --- Duplicate Node IDs ---

  describe("duplicate node IDs", () => {
    it("rejects YAML with duplicate node IDs", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    position:
      x: 100
      y: 200
  - id: "node-1"
    component_id: "redis"
    position:
      x: 300
      y: 200
edges: []
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("DUPLICATE_NODE_IDS")
      expect(result.errors[0].message).toContain("node-1")
    })
  })

  // --- Edge Resilience (non-existent nodes) ---

  describe("edge resilience", () => {
    it("handles edge with one existing and one missing node", () => {
      const yaml = `schema_version: "1.0.0"
nodes:
  - id: "node-1"
    component_id: "postgresql"
    position:
      x: 0
      y: 0
edges:
  - id: "edge-1"
    source_node_id: "node-1"
    target_node_id: "ghost-node"
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.edges).toHaveLength(1)
      expect(result.architecture.edges[0].data?.sourceArchieComponentId).toBe("postgresql")
      expect(result.architecture.edges[0].data?.targetArchieComponentId).toBe("")
    })

    it("handles edges where both source and target are non-existent", () => {
      const yaml = `schema_version: "1.0.0"
nodes: []
edges:
  - id: "edge-1"
    source_node_id: "ghost-source"
    target_node_id: "ghost-target"
`
      const result = importYamlString(yaml)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.architecture.edges).toHaveLength(1)
      expect(result.architecture.edges[0].data?.sourceArchieComponentId).toBe("")
      expect(result.architecture.edges[0].data?.targetArchieComponentId).toBe("")
    })
  })

  // --- Whitespace/Comment-Only YAML ---

  describe("whitespace and comment-only YAML", () => {
    it("rejects YAML with only whitespace", () => {
      const result = importYamlString("   \n  \n  ")
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("YAML_PARSE_ERROR")
    })

    it("rejects YAML with only comments", () => {
      const result = importYamlString("# This is a comment\n# Another comment\n")
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].code).toBe("YAML_PARSE_ERROR")
    })
  })

  // --- AC-4: Concurrent Import Guard ---

  describe("concurrent import guard", () => {
    it("rejects second import while first is in progress", async () => {
      const file1 = makeFile(validYaml, "first.yaml")
      const file2 = makeFile(validYaml, "second.yaml")

      // Start first import (don't await)
      const promise1 = importYaml(file1)
      // Immediately start second import
      const promise2 = importYaml(file2)

      const [result1, result2] = await Promise.all([promise1, promise2])

      const results = [result1, result2]
      const successes = results.filter((r) => r.success)
      const failures = results.filter((r) => !r.success)

      expect(successes).toHaveLength(1)
      expect(failures).toHaveLength(1)
      if (!failures[0].success) {
        expect(failures[0].errors[0].code).toBe("IMPORT_IN_PROGRESS")
      }
    })

    it("allows import after previous import completes", async () => {
      const file1 = makeFile(validYaml, "first.yaml")
      const file2 = makeFile(validYaml, "second.yaml")

      const result1 = await importYaml(file1)
      expect(result1.success).toBe(true)

      const result2 = await importYaml(file2)
      expect(result2.success).toBe(true)
    })

    it("resets guard even when import fails", async () => {
      const badFile = makeFile(":::invalid", "bad.yaml")
      const goodFile = makeFile(validYaml, "good.yaml")

      const result1 = await importYaml(badFile)
      expect(result1.success).toBe(false)

      // Guard should be reset — second import works
      const result2 = await importYaml(goodFile)
      expect(result2.success).toBe(true)
    })
  })
})
