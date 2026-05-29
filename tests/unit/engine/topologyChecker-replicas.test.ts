import { describe, it, expect } from "vitest"
import { detectReplicasWithoutLB, type ReplicaGraphNode } from "@/engine/topologyChecker"
import type { ComponentCategoryId } from "@/lib/constants"

const rnode = (id: string, category: ComponentCategoryId, replicaCount: number): ReplicaGraphNode => ({
  id,
  category,
  replicaCount,
})
const edge = (source: string, target: string) => ({ source, target })

describe("detectReplicasWithoutLB (Epic 14)", () => {
  it("returns empty for an empty graph", () => {
    expect(detectReplicasWithoutLB([], [])).toEqual([])
  })

  it("flags a replicated compute node with no upstream LB", () => {
    const issues = detectReplicasWithoutLB([rnode("app", "compute", 3)], [])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ nodeId: "app", issueType: "replicas-without-lb", severity: "warning" })
    expect(issues[0].description).toContain("3")
  })

  it("does NOT flag when an upstream load balancer (delivery-network) feeds the node", () => {
    const nodes = [rnode("lb", "delivery-network", 1), rnode("app", "compute", 3)]
    // edge direction: lb (source/upstream) -> app (target)
    const issues = detectReplicasWithoutLB(nodes, [edge("lb", "app")])
    expect(issues).toHaveLength(0)
  })

  it("STILL flags when the LB is downstream (wrong edge direction)", () => {
    const nodes = [rnode("lb", "delivery-network", 1), rnode("app", "compute", 3)]
    // app -> lb means lb is downstream; app has no upstream LB
    const issues = detectReplicasWithoutLB(nodes, [edge("app", "lb")])
    expect(issues).toHaveLength(1)
    expect(issues[0].nodeId).toBe("app")
  })

  it("does NOT flag a single-replica node", () => {
    expect(detectReplicasWithoutLB([rnode("app", "compute", 1)], [])).toHaveLength(0)
  })

  it("does NOT flag categories that do not require an upstream LB (caching, replicated)", () => {
    expect(detectReplicasWithoutLB([rnode("cache", "caching", 5)], [])).toHaveLength(0)
  })

  it("does NOT flag read-only replicas (data-storage, requiresUpstreamLB=false)", () => {
    expect(detectReplicasWithoutLB([rnode("db", "data-storage", 4)], [])).toHaveLength(0)
  })

  it("flags real-time and auth-security replicas (both require upstream LB)", () => {
    const issues = detectReplicasWithoutLB(
      [rnode("ws", "real-time", 2), rnode("auth", "auth-security", 3)],
      [],
    )
    expect(issues.map((i) => i.nodeId).sort()).toEqual(["auth", "ws"])
  })

  it("does NOT flag a non-scalable category (monitoring) even if replicaCount > 1", () => {
    // monitoring requiresUpstreamLB=false, so no warning regardless of replica count
    expect(detectReplicasWithoutLB([rnode("mon", "monitoring", 3)], [])).toHaveLength(0)
  })

  it("ignores an edge whose source node is not in the node set", () => {
    const issues = detectReplicasWithoutLB([rnode("app", "compute", 2)], [edge("ghost", "app")])
    expect(issues).toHaveLength(1) // ghost source unknown -> not an LB -> still flagged
  })
})
