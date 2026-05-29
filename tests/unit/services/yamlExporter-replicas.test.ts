import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { exportArchitecture } from "@/services/yamlExporter"
import { DEFAULT_WEIGHT_PROFILE } from "@/lib/constants"
import { makeNode, makeEdge } from "../../helpers"

describe("yamlExporter — replicas export (Epic 14)", () => {
  it("emits replicas when a node has replicaCount > 1", () => {
    const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql", replicaCount: 3 } })]
    const result = exportArchitecture(nodes, [], DEFAULT_WEIGHT_PROFILE, [])
    const parsed = load(result) as { nodes: Record<string, unknown>[] }
    expect(parsed.nodes[0].replicas).toBe(3)
  })

  it("omits replicas when replicaCount is 1 (default — file compactness)", () => {
    const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql", replicaCount: 1 } })]
    const result = exportArchitecture(nodes, [], DEFAULT_WEIGHT_PROFILE, [])
    const parsed = load(result) as { nodes: Record<string, unknown>[] }
    expect(parsed.nodes[0]).not.toHaveProperty("replicas")
  })

  it("writes schema_version 4.0.0", () => {
    const nodes = [makeNode({ id: "n1", data: { archieComponentId: "postgresql" } })]
    const result = exportArchitecture(nodes, [], DEFAULT_WEIGHT_PROFILE, [])
    const parsed = load(result) as { schema_version: string }
    expect(parsed.schema_version).toBe("4.0.0")
  })

  it("emits replicas per-node independently", () => {
    const nodes = [
      makeNode({ id: "n1", data: { archieComponentId: "postgresql", replicaCount: 5 } }),
      makeNode({ id: "n2", data: { archieComponentId: "redis", replicaCount: 1 } }),
    ]
    const edges = [makeEdge({ id: "e1", source: "n1", target: "n2" })]
    const result = exportArchitecture(nodes, edges, DEFAULT_WEIGHT_PROFILE, [])
    const parsed = load(result) as { nodes: Record<string, unknown>[] }
    expect(parsed.nodes[0].replicas).toBe(5)
    expect(parsed.nodes[1]).not.toHaveProperty("replicas")
  })
})
