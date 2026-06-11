import { describe, it, expect, beforeEach } from "vitest"
import { saveChainBuild, loadChainBuild } from "@/services/chainCarryForward"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"

const node = (over: Record<string, unknown> = {}): ArchieNode => ({
  id: "n1", type: "archie-component", position: { x: 100, y: 60 },
  data: {
    archieComponentId: "node-express", activeConfigVariantId: "single-process",
    componentName: "Express", componentCategory: "compute", replicaCount: 2, ...over,
  },
} as unknown as ArchieNode)
const edge: ArchieEdge = { id: "e1", source: "n1", target: "n2", sourceHandle: "http-out", targetHandle: null, type: "archie-connection", data: {} } as unknown as ArchieEdge

describe("chainCarryForward (P5-S5 / D95)", () => {
  beforeEach(() => localStorage.clear())

  it("round-trips a build through the validated ArchitectureFile shape", () => {
    saveChainBuild("async-pipeline", [node()], [edge])
    const loaded = loadChainBuild("async-pipeline")
    expect(loaded).not.toBeNull()
    expect(loaded!.nodes[0]).toMatchObject({ id: "n1", componentId: "node-express", configVariantId: "single-process", replicas: 2 })
    expect(loaded!.edges[0]).toMatchObject({ id: "e1", sourceNodeId: "n1", targetNodeId: "n2", sourceHandleId: "http-out" })
    expect(loaded!.edges[0].targetHandleId).toBeUndefined()
  })

  it("absent / corrupt / schema-rejected snapshots all return null (localStorage is untrusted)", () => {
    expect(loadChainBuild("nothing-saved")).toBeNull()
    localStorage.setItem("archie-chain-build:corrupt", "{not json")
    expect(loadChainBuild("corrupt")).toBeNull()
    localStorage.setItem("archie-chain-build:bad-shape", JSON.stringify({ schemaVersion: "2.0.0", nodes: [{ id: "x", componentId: "c", position: { x: 0, y: 0 }, bogus: 1 }], edges: [] }))
    expect(loadChainBuild("bad-shape")).toBeNull()
  })

  it("preserves traffic dial fields through the round-trip", () => {
    saveChainBuild("c1", [node({ componentCategory: "traffic", trafficRps: 1500, trafficKind: "realistic", trafficWorkload: "write", trafficOrigin: "one-region" })], [])
    expect(loadChainBuild("c1")!.nodes[0]).toMatchObject({ trafficRps: 1500, trafficKind: "realistic", trafficWorkload: "write" })
  })
})
