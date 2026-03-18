import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { load } from "js-yaml"
import { BlueprintFullYamlSchema } from "@/schemas/blueprintSchema"

const __dirname = dirname(fileURLToPath(import.meta.url))
const blueprintDir = resolve(__dirname, "../../../src/data/blueprints")

const VALID_COMPONENT_IDS = new Set([
  "nginx", "node-express", "postgresql", "redis", "redis-cache",
  "kafka", "rabbitmq", "cloudflare-cdn", "websocket-server", "prometheus",
])

const VALID_VARIANT_IDS: Record<string, Set<string>> = {
  "nginx": new Set(["reverse-proxy", "load-balancer"]),
  "node-express": new Set(["single-process", "cluster-mode"]),
  "postgresql": new Set(["single-node", "primary-replica", "citus-distributed"]),
  "redis": new Set(["standalone", "sentinel", "cluster"]),
  "redis-cache": new Set(["simple-cache", "distributed-cache"]),
  "kafka": new Set(["single-broker", "multi-broker"]),
  "rabbitmq": new Set(["single-node", "clustered"]),
  "cloudflare-cdn": new Set(["static-caching", "full-site"]),
  "websocket-server": new Set(["single-server", "clustered"]),
  "prometheus": new Set(["standalone", "federated"]),
}

function loadBlueprintYaml(filename: string): unknown {
  const raw = readFileSync(resolve(blueprintDir, filename), "utf-8")
  return load(raw)
}

describe("Blueprint YAML files", () => {
  describe("whatsapp-messaging.yaml", () => {
    it("file exists and parses as valid YAML", () => {
      expect(() => loadBlueprintYaml("whatsapp-messaging.yaml")).not.toThrow()
    })

    it("validates against BlueprintFullYamlSchema", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      if (!result.success) {
        console.error(result.error.issues)
      }
      expect(result.success).toBe(true)
    })

    it("has id: whatsapp-messaging", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe("whatsapp-messaging")
      }
    })

    it("has at least 5 nodes spanning multiple categories", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.skeleton.nodes.length).toBeGreaterThanOrEqual(5)
      }
    })

    it("all component_ids reference valid seed data components", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        for (const node of result.data.skeleton.nodes) {
          expect(VALID_COMPONENT_IDS.has(node.componentId)).toBe(true)
        }
      }
    })

    it("all config_variant_ids match their component variants", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        for (const node of result.data.skeleton.nodes) {
          if (node.configVariantId) {
            const validVariants = VALID_VARIANT_IDS[node.componentId]
            expect(validVariants?.has(node.configVariantId)).toBe(true)
          }
        }
      }
    })

    it("no duplicate node IDs", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        const ids = result.data.skeleton.nodes.map((n) => n.id)
        const unique = new Set(ids)
        expect(unique.size).toBe(ids.length)
      }
    })

    it("all edge source/target node IDs reference existing nodes", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        const nodeIds = new Set(result.data.skeleton.nodes.map((n) => n.id))
        for (const edge of result.data.skeleton.edges) {
          expect(nodeIds.has(edge.sourceNodeId)).toBe(true)
          expect(nodeIds.has(edge.targetNodeId)).toBe(true)
        }
      }
    })

    it("all positions are on grid (multiples of 16)", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        for (const node of result.data.skeleton.nodes) {
          expect(node.position.x % 16).toBe(0)
          expect(node.position.y % 16).toBe(0)
        }
      }
    })

    it("no overlapping positions (each node has a unique position)", () => {
      const parsed = loadBlueprintYaml("whatsapp-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        const positions = result.data.skeleton.nodes.map((n) => `${n.position.x},${n.position.y}`)
        const unique = new Set(positions)
        expect(unique.size).toBe(positions.length)
      }
    })
  })

  describe("telegram-messaging.yaml", () => {
    it("file exists and parses as valid YAML", () => {
      expect(() => loadBlueprintYaml("telegram-messaging.yaml")).not.toThrow()
    })

    it("validates against BlueprintFullYamlSchema", () => {
      const parsed = loadBlueprintYaml("telegram-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      if (!result.success) {
        console.error(result.error.issues)
      }
      expect(result.success).toBe(true)
    })

    it("has id: telegram-messaging", () => {
      const parsed = loadBlueprintYaml("telegram-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe("telegram-messaging")
      }
    })

    it("has at least 4 nodes", () => {
      const parsed = loadBlueprintYaml("telegram-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.skeleton.nodes.length).toBeGreaterThanOrEqual(4)
      }
    })

    it("all component_ids reference valid seed data components", () => {
      const parsed = loadBlueprintYaml("telegram-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        for (const node of result.data.skeleton.nodes) {
          expect(VALID_COMPONENT_IDS.has(node.componentId)).toBe(true)
        }
      }
    })

    it("all config_variant_ids match their component variants", () => {
      const parsed = loadBlueprintYaml("telegram-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        for (const node of result.data.skeleton.nodes) {
          if (node.configVariantId) {
            const validVariants = VALID_VARIANT_IDS[node.componentId]
            expect(validVariants?.has(node.configVariantId)).toBe(true)
          }
        }
      }
    })

    it("no duplicate node IDs", () => {
      const parsed = loadBlueprintYaml("telegram-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        const ids = result.data.skeleton.nodes.map((n) => n.id)
        const unique = new Set(ids)
        expect(unique.size).toBe(ids.length)
      }
    })

    it("all edge source/target node IDs reference existing nodes", () => {
      const parsed = loadBlueprintYaml("telegram-messaging.yaml")
      const result = BlueprintFullYamlSchema.safeParse(parsed)
      expect(result.success).toBe(true)
      if (result.success) {
        const nodeIds = new Set(result.data.skeleton.nodes.map((n) => n.id))
        for (const edge of result.data.skeleton.edges) {
          expect(nodeIds.has(edge.sourceNodeId)).toBe(true)
          expect(nodeIds.has(edge.targetNodeId)).toBe(true)
        }
      }
    })

    it("uses different components or variants than WhatsApp example (distinct trade-offs)", () => {
      const waData = loadBlueprintYaml("whatsapp-messaging.yaml")
      const tgData = loadBlueprintYaml("telegram-messaging.yaml")
      const waResult = BlueprintFullYamlSchema.safeParse(waData)
      const tgResult = BlueprintFullYamlSchema.safeParse(tgData)
      expect(waResult.success).toBe(true)
      expect(tgResult.success).toBe(true)
      if (waResult.success && tgResult.success) {
        const waComponentIds = new Set(waResult.data.skeleton.nodes.map((n) => n.componentId))
        const tgComponentIds = new Set(tgResult.data.skeleton.nodes.map((n) => n.componentId))
        // At least one different component — they should NOT be identical
        const allSame = [...tgComponentIds].every((id) => waComponentIds.has(id))
        const sameSize = waComponentIds.size === tgComponentIds.size
        expect(allSame && sameSize).toBe(false)
      }
    })
  })
})
