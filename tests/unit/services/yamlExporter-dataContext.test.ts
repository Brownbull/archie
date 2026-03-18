import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { DEFAULT_WEIGHT_PROFILE, type DataContextItem } from "@/lib/constants"
import { makeNode, makeEdge } from "../../helpers"

describe("yamlExporter — data context export", () => {
  const nodes = [
    makeNode({ id: "n1", data: { archieComponentId: "postgresql" } }),
    makeNode({ id: "n2", data: { archieComponentId: "redis" } }),
  ]
  const edges = [makeEdge({ id: "e1", source: "n1", target: "n2" })]

  const sampleItems: DataContextItem[] = [
    {
      id: "dci-1",
      name: "User Sessions",
      accessPattern: "read-heavy",
      averageSize: "medium",
      structureType: "simple-kv",
    },
    {
      id: "dci-2",
      name: "Order History",
      accessPattern: "write-heavy",
      averageSize: "large",
      structureType: "nested-json",
    },
  ]

  describe("AC-1: Export with data context items", () => {
    it("includes data_context per node when items exist", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const parsed = load(result) as { nodes: Record<string, unknown>[] }

      // n1 has data_context, n2 does not
      expect(parsed.nodes[0]).toHaveProperty("data_context")
      expect(parsed.nodes[1]).not.toHaveProperty("data_context")
    })

    it("exports multiple items per node", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", sampleItems)

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const parsed = load(result) as { nodes: { data_context?: Record<string, unknown>[] }[] }

      expect(parsed.nodes[0].data_context).toHaveLength(2)
    })

    it("exports items on multiple nodes", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])
      dataContextItems.set("n2", [sampleItems[1]])

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const parsed = load(result) as { nodes: { data_context?: Record<string, unknown>[] }[] }

      expect(parsed.nodes[0].data_context).toHaveLength(1)
      expect(parsed.nodes[1].data_context).toHaveLength(1)
    })
  })

  describe("AC-2: Export omits empty data context", () => {
    it("omits data_context when no nodes have items", () => {
      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [])
      const parsed = load(result) as { nodes: Record<string, unknown>[] }

      expect(parsed.nodes[0]).not.toHaveProperty("data_context")
      expect(parsed.nodes[1]).not.toHaveProperty("data_context")
    })

    it("omits data_context when dataContextItems param is undefined", () => {
      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE)
      const parsed = load(result) as { nodes: Record<string, unknown>[] }

      expect(parsed.nodes[0]).not.toHaveProperty("data_context")
    })

    it("omits data_context when map has empty arrays", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [])

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const parsed = load(result) as { nodes: Record<string, unknown>[] }

      expect(parsed.nodes[0]).not.toHaveProperty("data_context")
    })
  })

  describe("AC-ARCH-PATTERN-3: Fit results NOT exported", () => {
    it("exported data_context items contain only data definitions, not fit results", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const parsed = load(result) as { nodes: { data_context?: Record<string, unknown>[] }[] }

      const item = parsed.nodes[0].data_context![0]
      expect(item).not.toHaveProperty("fit")
      expect(item).not.toHaveProperty("fitResult")
      expect(item).not.toHaveProperty("fit_result")
      expect(item).not.toHaveProperty("level")
      expect(item).not.toHaveProperty("factors")

      // Only the 5 definition fields should exist
      expect(Object.keys(item)).toEqual(["id", "name", "access_pattern", "average_size", "structure_type"])
    })
  })

  describe("AC-ARCH-PATTERN-5: snake_case field names in YAML", () => {
    it("uses snake_case for data context fields", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", [sampleItems[0]])

      const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)
      const parsed = load(result) as { nodes: { data_context?: Record<string, unknown>[] }[] }

      const item = parsed.nodes[0].data_context![0]
      expect(item).toHaveProperty("access_pattern", "read-heavy")
      expect(item).toHaveProperty("average_size", "medium")
      expect(item).toHaveProperty("structure_type", "simple-kv")

      // camelCase should NOT be present
      expect(item).not.toHaveProperty("accessPattern")
      expect(item).not.toHaveProperty("averageSize")
      expect(item).not.toHaveProperty("structureType")
    })
  })

  describe("Schema validation", () => {
    it("validates exported YAML with data context against ArchitectureFileYamlSchema", () => {
      const dataContextItems = new Map<string, DataContextItem[]>()
      dataContextItems.set("n1", sampleItems)

      // Should not throw — exported object must pass schema validation
      expect(() => exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [], dataContextItems)).not.toThrow()
    })
  })
})
