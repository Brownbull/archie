import { describe, it, expect } from "vitest"
import { evaluateRequiredTopology, allTopologyAssertionsPass, type TopologyGraphInput } from "@/engine/topologyAssertions"
import type { RequiredTopologyAssertion } from "@/lib/challengeTypes"

// Tiny graph builder: nodes is id→typeId, edges are [source, target] pairs (directed in storage,
// but the evaluator treats adjacency as undirected per D66).
function graph(nodes: Record<string, string>, edges: Array<[string, string]>): TopologyGraphInput {
  return { typeByNodeId: new Map(Object.entries(nodes)), edges: edges.map(([source, target]) => ({ source, target })) }
}

describe("evaluateRequiredTopology (ISAPivot Phase 3, D66 — undirected adjacency)", () => {
  describe("CACHE_BETWEEN", () => {
    const rule: RequiredTopologyAssertion = { ruleType: "CACHE_BETWEEN", sourceType: "compute", targetType: "relational-db" }

    it("passes when a cache is adjacent to both endpoints (compute→cache→db)", () => {
      const g = graph(
        { c1: "compute", k1: "cache", d1: "relational-db" },
        [["c1", "k1"], ["k1", "d1"]],
      )
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(true)
    })

    it("passes regardless of edge direction (db→cache, cache←compute) — adjacency is undirected", () => {
      const g = graph(
        { c1: "compute", k1: "cache", d1: "relational-db" },
        [["k1", "c1"], ["d1", "k1"]],
      )
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(true)
    })

    it("fails when the cache touches only one endpoint", () => {
      const g = graph(
        { c1: "compute", k1: "cache", d1: "relational-db" },
        [["c1", "k1"]], // cache adjacent to compute but not db
      )
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })

    it("fails when compute and db are directly wired with no cache between", () => {
      const g = graph({ c1: "compute", d1: "relational-db", k1: "cache" }, [["c1", "d1"]])
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })

    it("fails when sourceType or targetType is missing from the assertion", () => {
      const g = graph({ c1: "compute", k1: "cache", d1: "relational-db" }, [["c1", "k1"], ["k1", "d1"]])
      expect(evaluateRequiredTopology(g, [{ ruleType: "CACHE_BETWEEN", sourceType: "compute" }])[0].passed).toBe(false)
    })
  })

  describe("LB_UPSTREAM", () => {
    const rule: RequiredTopologyAssertion = { ruleType: "LB_UPSTREAM", targetType: "compute" }

    it("passes when every compute node is adjacent to a load balancer", () => {
      const g = graph(
        { lb: "load-balancer", c1: "compute", c2: "compute" },
        [["lb", "c1"], ["lb", "c2"]],
      )
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(true)
    })

    it("fails when one compute node has no load balancer upstream", () => {
      const g = graph(
        { lb: "load-balancer", c1: "compute", c2: "compute" },
        [["lb", "c1"]], // c2 unbalanced
      )
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })

    it("fails (not vacuously true) when there is no target node at all", () => {
      const g = graph({ lb: "load-balancer", d1: "relational-db" }, [["lb", "d1"]])
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })
  })

  describe("FAN_OUT_GTE", () => {
    it("passes when a source node fans out to ≥ minCount distinct nodes", () => {
      const g = graph(
        { lb: "load-balancer", c1: "compute", c2: "compute", c3: "compute" },
        [["lb", "c1"], ["lb", "c2"], ["lb", "c3"]],
      )
      const rule: RequiredTopologyAssertion = { ruleType: "FAN_OUT_GTE", sourceType: "load-balancer", minCount: 3 }
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(true)
    })

    it("fails when fan-out is below minCount", () => {
      const g = graph({ lb: "load-balancer", c1: "compute", c2: "compute" }, [["lb", "c1"], ["lb", "c2"]])
      const rule: RequiredTopologyAssertion = { ruleType: "FAN_OUT_GTE", sourceType: "load-balancer", minCount: 3 }
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })

    it("defaults minCount to 2 when omitted", () => {
      const g = graph({ lb: "load-balancer", c1: "compute", c2: "compute" }, [["lb", "c1"], ["lb", "c2"]])
      const rule: RequiredTopologyAssertion = { ruleType: "FAN_OUT_GTE", sourceType: "load-balancer" }
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(true)
    })

    it("counts distinct neighbors, not edge multiplicity", () => {
      // two edges to the same node should NOT satisfy a fan-out of 2
      const g = graph({ lb: "load-balancer", c1: "compute" }, [["lb", "c1"], ["c1", "lb"]])
      const rule: RequiredTopologyAssertion = { ruleType: "FAN_OUT_GTE", sourceType: "load-balancer", minCount: 2 }
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })

    it("does not count a self-loop toward fan-out (adversarial finding #1)", () => {
      // lb→lb (self-loop) + lb→c1 is only ONE real fan-out target, not two
      const g = graph({ lb: "load-balancer", c1: "compute" }, [["lb", "lb"], ["lb", "c1"]])
      const rule: RequiredTopologyAssertion = { ruleType: "FAN_OUT_GTE", sourceType: "load-balancer", minCount: 2 }
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })

    it("does not count an unresolved (typeless) neighbor toward fan-out (adversarial finding #2)", () => {
      // 'ghost' appears in an edge but has no entry in typeByNodeId — it is not a real fan-out target
      const g = graph({ lb: "load-balancer", c1: "compute" }, [["lb", "c1"], ["lb", "ghost"]])
      const rule: RequiredTopologyAssertion = { ruleType: "FAN_OUT_GTE", sourceType: "load-balancer", minCount: 2 }
      expect(evaluateRequiredTopology(g, [rule])[0].passed).toBe(false)
    })
  })

  it("allTopologyAssertionsPass is true only when every assertion passes", () => {
    const g = graph(
      { c1: "compute", k1: "cache", d1: "relational-db", lb: "load-balancer" },
      [["c1", "k1"], ["k1", "d1"], ["lb", "c1"]],
    )
    const ok: RequiredTopologyAssertion[] = [
      { ruleType: "CACHE_BETWEEN", sourceType: "compute", targetType: "relational-db" },
      { ruleType: "LB_UPSTREAM", targetType: "compute" },
    ]
    expect(allTopologyAssertionsPass(evaluateRequiredTopology(g, ok))).toBe(true)

    const mixed: RequiredTopologyAssertion[] = [...ok, { ruleType: "FAN_OUT_GTE", sourceType: "load-balancer", minCount: 5 }]
    expect(allTopologyAssertionsPass(evaluateRequiredTopology(g, mixed))).toBe(false)
  })

  it("empty assertion list trivially passes", () => {
    const g = graph({ c1: "compute" }, [])
    expect(allTopologyAssertionsPass(evaluateRequiredTopology(g, []))).toBe(true)
  })
})
