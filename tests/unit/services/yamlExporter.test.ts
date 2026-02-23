import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { ArchitectureFileYamlSchema, CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

// No mocks needed — yamlExporter is a pure function (no external service dependencies)

function makeNode(overrides: {
  id: string
  archieComponentId: string
  activeConfigVariantId?: string
  x?: number
  y?: number
  nodeType?: string
}): ArchieNode {
  return {
    id: overrides.id,
    type: (overrides.nodeType ?? "component") as "component",
    position: { x: overrides.x ?? 96, y: overrides.y ?? 208 },
    data: {
      archieComponentId: overrides.archieComponentId,
      activeConfigVariantId: overrides.activeConfigVariantId ?? "default",
      componentName: "Test Component",
      componentCategory: "compute" as const,
    },
    width: 200,
  } as unknown as ArchieNode
}

function makeEdge(id: string, source: string, target: string): ArchieEdge {
  return {
    id,
    source,
    target,
    type: "connection",
    data: {
      isIncompatible: false,
      incompatibilityReason: null,
      sourceArchieComponentId: source,
      targetArchieComponentId: target,
    },
  } as unknown as ArchieEdge
}

describe("yamlExporter", () => {
  describe("exportArchitecture", () => {
    it("returns a string for a single node export", () => {
      const nodes = [makeNode({ id: "node-1", archieComponentId: "postgresql" })]
      const result = exportArchitecture(nodes, [])

      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })

    it("includes schema_version matching CURRENT_SCHEMA_VERSION", () => {
      const nodes = [makeNode({ id: "node-1", archieComponentId: "postgresql" })]
      const result = exportArchitecture(nodes, [])

      const parsed = load(result) as Record<string, unknown>
      expect(parsed.schema_version).toBe(CURRENT_SCHEMA_VERSION)
    })

    it("exports multi-node with edges", () => {
      const nodes = [
        makeNode({ id: "node-1", archieComponentId: "postgresql", x: 96, y: 208 }),
        makeNode({ id: "node-2", archieComponentId: "redis", x: 352, y: 208 }),
        makeNode({ id: "node-3", archieComponentId: "nginx", x: 608, y: 208 }),
      ]
      const edges = [
        makeEdge("edge-1", "node-1", "node-2"),
        makeEdge("edge-2", "node-2", "node-3"),
      ]

      const result = exportArchitecture(nodes, edges)
      const parsed = load(result) as { nodes: unknown[]; edges: unknown[] }

      expect(parsed.nodes).toHaveLength(3)
      expect(parsed.edges).toHaveLength(2)
    })

    it("exports empty canvas without error and with empty arrays", () => {
      expect(() => exportArchitecture([], [])).not.toThrow()

      const result = exportArchitecture([], [])
      const parsed = load(result) as { nodes: unknown[]; edges: unknown[] }

      expect(parsed.nodes).toHaveLength(0)
      expect(parsed.edges).toHaveLength(0)
    })

    it("excludes runtime state fields from exported YAML", () => {
      const nodes = [makeNode({ id: "node-1", archieComponentId: "postgresql" })]
      const result = exportArchitecture(nodes, [])
      const parsed = load(result) as Record<string, unknown>

      // Top-level runtime state must not appear
      expect(parsed).not.toHaveProperty("computedMetrics")
      expect(parsed).not.toHaveProperty("heatmapColors")
      expect(parsed).not.toHaveProperty("rippleActiveNodeIds")
      expect(parsed).not.toHaveProperty("currentTier")

      // Node-level runtime state must not appear
      const parsedNodes = parsed.nodes as Record<string, unknown>[]
      const firstNode = parsedNodes[0]
      expect(firstNode).not.toHaveProperty("type")
      expect(firstNode).not.toHaveProperty("width")
      expect(firstNode).not.toHaveProperty("selected")
      expect(firstNode).not.toHaveProperty("componentName")
      expect(firstNode).not.toHaveProperty("componentCategory")
    })

    it("uses snake_case field names — camelCase inverse of import transform", () => {
      const nodes = [
        makeNode({
          id: "node-1",
          archieComponentId: "postgresql",
          activeConfigVariantId: "single-node",
          x: 96,
          y: 208,
        }),
      ]
      const edges = [makeEdge("edge-1", "node-1", "node-1")]

      const result = exportArchitecture(nodes, edges)
      const parsed = load(result) as {
        schema_version: string
        nodes: Record<string, unknown>[]
        edges: Record<string, unknown>[]
      }

      // Node fields: snake_case
      expect(parsed.nodes[0]).toHaveProperty("component_id", "postgresql")
      expect(parsed.nodes[0]).toHaveProperty("config_variant_id", "single-node")
      expect(parsed.nodes[0]).toHaveProperty("position")

      // Edge fields: snake_case
      expect(parsed.edges[0]).toHaveProperty("source_node_id", "node-1")
      expect(parsed.edges[0]).toHaveProperty("target_node_id", "node-1")

      // camelCase must NOT appear
      expect(parsed.nodes[0]).not.toHaveProperty("componentId")
      expect(parsed.nodes[0]).not.toHaveProperty("configVariantId")
      expect(parsed.edges[0]).not.toHaveProperty("sourceNodeId")
      expect(parsed.edges[0]).not.toHaveProperty("targetNodeId")
    })

    it("omits config_variant_id when activeConfigVariantId is empty string", () => {
      const nodes = [
        makeNode({
          id: "node-1",
          archieComponentId: "placeholder-comp",
          activeConfigVariantId: "",
        }),
      ]
      const result = exportArchitecture(nodes, [])
      const parsed = load(result) as { nodes: Record<string, unknown>[] }

      // Empty string must become absent (z.string().min(1) would reject "")
      expect(parsed.nodes[0]).not.toHaveProperty("config_variant_id")
    })

    it("includes placeholder nodes with their original component_id", () => {
      const nodes = [
        makeNode({
          id: "node-1",
          archieComponentId: "unknown-future-component",
          nodeType: "placeholder",
          activeConfigVariantId: "",
        }),
      ]

      const result = exportArchitecture(nodes, [])
      const parsed = load(result) as { nodes: Record<string, unknown>[] }

      expect(parsed.nodes).toHaveLength(1)
      expect(parsed.nodes[0]).toHaveProperty("id", "node-1")
      expect(parsed.nodes[0]).toHaveProperty("component_id", "unknown-future-component")
    })

    it("produces output that passes ArchitectureFileYamlSchema validation", () => {
      const nodes = [
        makeNode({
          id: "node-1",
          archieComponentId: "postgresql",
          activeConfigVariantId: "single-node",
          x: 96,
          y: 208,
        }),
        makeNode({
          id: "node-2",
          archieComponentId: "redis",
          activeConfigVariantId: "default",
          x: 352,
          y: 208,
        }),
      ]
      const edges = [makeEdge("edge-1", "node-1", "node-2")]

      const result = exportArchitecture(nodes, edges)
      const parsed = load(result)

      const validation = ArchitectureFileYamlSchema.safeParse(parsed)
      expect(validation.success).toBe(true)
    })

    it("preserves node and edge IDs exactly", () => {
      const nodes = [makeNode({ id: "abc-123", archieComponentId: "postgresql" })]
      const edges = [makeEdge("edge-xyz", "abc-123", "abc-123")]

      const result = exportArchitecture(nodes, edges)
      const parsed = load(result) as {
        nodes: Record<string, unknown>[]
        edges: Record<string, unknown>[]
      }

      expect(parsed.nodes[0]).toHaveProperty("id", "abc-123")
      expect(parsed.edges[0]).toHaveProperty("id", "edge-xyz")
    })

    it("preserves node positions exactly", () => {
      const nodes = [makeNode({ id: "node-1", archieComponentId: "postgresql", x: 160, y: 320 })]
      const result = exportArchitecture(nodes, [])
      const parsed = load(result) as { nodes: { position: { x: number; y: number } }[] }

      expect(parsed.nodes[0].position.x).toBe(160)
      expect(parsed.nodes[0].position.y).toBe(320)
    })
  })
})
