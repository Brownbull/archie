import { describe, it, expect } from "vitest"
import { evaluateAttempt } from "@/engine/rubricScorer"
import type { Challenge } from "@/lib/challengeTypes"
import type { SimulationStats } from "@/lib/simulationStats"

const challenge: Challenge = {
  id: "c1",
  title: "Test",
  brief: "b",
  difficulty: "beginner",
  budgetCap: 100,
  durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"],
  targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [],
  hints: [],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
}
const stats = (uptimePercent: number, p99LatencyMs: number): SimulationStats => ({
  uptimePercent, avgLatencyMs: 0, p99LatencyMs, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0,
})

describe("evaluateAttempt (star rubric, Epic 16)", () => {
  it("0★ when metrics fail (low uptime), regardless of budget/topology", () => {
    const r = evaluateAttempt(stats(90, 100), challenge, 0, 10) // under budget, clean — but uptime < 99
    expect(r.stars).toBe(0)
    expect(r.passedMetrics).toBe(false)
  })

  it("0★ when p99 latency exceeds the target", () => {
    expect(evaluateAttempt(stats(100, 300), challenge, 0, 10).stars).toBe(0) // p99 300 > 200
  })

  it("1★ when metrics pass but over budget and dirty topology", () => {
    const r = evaluateAttempt(stats(99.5, 150), challenge, 2, 500) // pass, over budget, 2 issues
    expect(r.stars).toBe(1)
    expect(r.passedMetrics).toBe(true)
    expect(r.underBudget).toBe(false)
    expect(r.cleanTopology).toBe(false)
  })

  it("2★ when metrics pass + under budget (dirty topology)", () => {
    expect(evaluateAttempt(stats(99.5, 150), challenge, 1, 80).stars).toBe(2)
  })

  it("2★ when metrics pass + clean topology (over budget)", () => {
    expect(evaluateAttempt(stats(99.5, 150), challenge, 0, 500).stars).toBe(2)
  })

  it("3★ when metrics pass + under budget + clean topology", () => {
    const r = evaluateAttempt(stats(100, 50), challenge, 0, 100) // cost == cap (≤) counts
    expect(r.stars).toBe(3)
    expect(r.underBudget).toBe(true)
    expect(r.cleanTopology).toBe(true)
  })

  it("treats uptime/p99 exactly at target as a pass (≥ / ≤)", () => {
    expect(evaluateAttempt(stats(99, 200), challenge, 0, 100).stars).toBe(3)
  })

  it("0★ when a forbidden type is on the canvas, even with perfect metrics/budget/topology (Phase 3)", () => {
    const ch = { ...challenge, forbiddenTypes: ["serverless"] }
    const r = evaluateAttempt(stats(100, 50), ch, 0, 100, new Set(["compute", "serverless"]))
    expect(r.stars).toBe(0)
    expect(r.forbiddenTypesOk).toBe(false)
  })

  it("full stars when forbidden types are declared but none are present", () => {
    const ch = { ...challenge, forbiddenTypes: ["serverless"] }
    const r = evaluateAttempt(stats(100, 50), ch, 0, 100, new Set(["compute"]))
    expect(r.stars).toBe(3)
    expect(r.forbiddenTypesOk).toBe(true)
  })

  it("forbiddenTypesOk is true by default (no forbiddenTypes declared — the 41 built-ins)", () => {
    expect(evaluateAttempt(stats(100, 50), challenge, 0, 100).forbiddenTypesOk).toBe(true)
  })

  describe("optional p95 + cost-per-request gates (Phase 3 3a)", () => {
    it("0★ when a p95 target is set and measured p95 exceeds it (folds into metrics star)", () => {
      const ch = { ...challenge, targetMetrics: { ...challenge.targetMetrics, p95LatencyMs: 100 } }
      const r = evaluateAttempt({ ...stats(100, 150), p95LatencyMs: 120 }, ch, 0, 100) // p99 ok, p95 120 > 100
      expect(r.stars).toBe(0)
      expect(r.passedMetrics).toBe(false)
    })

    it("full stars when the p95 target is met", () => {
      const ch = { ...challenge, targetMetrics: { ...challenge.targetMetrics, p95LatencyMs: 100 } }
      expect(evaluateAttempt({ ...stats(100, 150), p95LatencyMs: 80 }, ch, 0, 100).stars).toBe(3)
    })

    it("0★ when a cost_per_request target is set and the measured ratio exceeds it", () => {
      const ch = { ...challenge, targetMetrics: { ...challenge.targetMetrics, costPerRequest: 0.01 } }
      const r = evaluateAttempt(stats(100, 50), ch, 0, 100, undefined, 0.05) // 0.05 > 0.01
      expect(r.stars).toBe(0)
      expect(r.passedMetrics).toBe(false)
    })

    it("full stars when the cost_per_request target is met", () => {
      const ch = { ...challenge, targetMetrics: { ...challenge.targetMetrics, costPerRequest: 0.1 } }
      expect(evaluateAttempt(stats(100, 50), ch, 0, 100, undefined, 0.05).stars).toBe(3)
    })

    it("fails a cost_per_request target conservatively when cost/req is unmeasured (no requests served)", () => {
      const ch = { ...challenge, targetMetrics: { ...challenge.targetMetrics, costPerRequest: 0.1 } }
      const r = evaluateAttempt(stats(100, 50), ch, 0, 100, undefined, undefined)
      expect(r.passedMetrics).toBe(false)
    })
  })

  describe("resilienceEarned (restore-redundancy, D74)", () => {
    const outageCh: Challenge = { ...challenge, scheduledEvents: [{ t: 10, type: "az_outage", target: "compute", durationS: 20 }] }
    it("a no-SPOF build that passes a zone-outage challenge earns resilience", () => {
      // basePass (uptime+p99 met) + zero topology issues (no SPOF) + the challenge exercises an az_outage
      const r = evaluateAttempt(stats(99.5, 150), outageCh, 0, 100)
      expect(r.resilienceEarned).toBe(true)
      expect(r.resilient).toBe(true)
    })
    it("NOT earned on a challenge with no zone outage (nothing to ride out)", () => {
      const r = evaluateAttempt(stats(99.5, 150), challenge, 0, 100)
      expect(r.resilient).toBe(true) // still no-SPOF...
      expect(r.resilienceEarned).toBe(false) // ...but there was no outage to survive
    })
    it("NOT earned when there is a SPOF (advisory issue), even on an outage challenge", () => {
      const r = evaluateAttempt(stats(99.5, 150), outageCh, 0, 100, undefined, undefined, undefined, 1) // advisory=1 (SPOF)
      expect(r.resilienceEarned).toBe(false)
    })
  })

  describe("required_topology folded into the clean-topology star (Phase 3 3b, D66)", () => {
    const cacheRule = { ruleType: "CACHE_BETWEEN" as const, sourceType: "compute", targetType: "relational-db" }
    const ch = { ...challenge, requiredTopology: [cacheRule] }
    // compute→cache→db satisfies CACHE_BETWEEN
    const goodGraph = {
      typeByNodeId: new Map([["c1", "compute"], ["k1", "cache"], ["d1", "relational-db"]]),
      edges: [{ source: "c1", target: "k1" }, { source: "k1", target: "d1" }],
    }
    const badGraph = {
      typeByNodeId: new Map([["c1", "compute"], ["d1", "relational-db"]]),
      edges: [{ source: "c1", target: "d1" }],
    }

    it("requiredTopologyOk is true by default (no assertions — the 41 built-ins)", () => {
      expect(evaluateAttempt(stats(100, 50), challenge, 0, 100).requiredTopologyOk).toBe(true)
    })

    it("3★ when assertions pass against the frozen graph (zero issues + wiring met)", () => {
      const r = evaluateAttempt(stats(100, 50), ch, 0, 100, undefined, undefined, goodGraph)
      expect(r.requiredTopologyOk).toBe(true)
      expect(r.stars).toBe(3)
    })

    it("loses the topology star (2★) when assertions fail despite zero topology issues", () => {
      const r = evaluateAttempt(stats(100, 50), ch, 0, 100, undefined, undefined, badGraph)
      expect(r.requiredTopologyOk).toBe(false)
      expect(r.cleanTopology).toBe(true) // zero issues — but the wiring rule is unmet
      expect(r.stars).toBe(2) // base + budget, no topology star
    })

    it("fails the topology star conservatively when assertions exist but no graph was captured", () => {
      const r = evaluateAttempt(stats(100, 50), ch, 0, 100, undefined, undefined, undefined)
      expect(r.requiredTopologyOk).toBe(false)
      expect(r.stars).toBe(2)
    })

    it("still 0★ when metrics fail, regardless of topology assertions passing", () => {
      const r = evaluateAttempt(stats(90, 50), ch, 0, 100, undefined, undefined, goodGraph) // uptime < 99
      expect(r.stars).toBe(0)
    })
  })

  describe("multi-region origin grading folded into basePass (Phase 3 3d, D55/D66)", () => {
    const multiRegion = { type: "web-users" as const, rps: 1000, kind: "steady" as const, workload: "mixed" as const, origin: "multi-region" as const }
    const oneRegion = { ...multiRegion, origin: "one-region" as const }
    const mrChallenge = { ...challenge, trafficSources: [multiRegion] }

    it("originRequirementOk is true by default (no trafficSources — the 41 built-ins)", () => {
      expect(evaluateAttempt(stats(100, 50), challenge, 0, 100, new Set(["compute"])).originRequirementOk).toBe(true)
    })

    it("originRequirementOk is true when the only source is one-region", () => {
      const ch = { ...challenge, trafficSources: [oneRegion] }
      expect(evaluateAttempt(stats(100, 50), ch, 0, 100, new Set(["compute"])).originRequirementOk).toBe(true)
    })

    it("3★ when a multi-region source is matched by CDN + DNS + a database", () => {
      const r = evaluateAttempt(stats(100, 50), mrChallenge, 0, 100, new Set(["compute", "cdn", "dns", "relational-db"]))
      expect(r.originRequirementOk).toBe(true)
      expect(r.stars).toBe(3)
    })

    it("0★ (basePass fails) when a multi-region source lacks the multi-region architecture", () => {
      const r = evaluateAttempt(stats(100, 50), mrChallenge, 0, 100, new Set(["compute", "cdn"])) // no DNS, no DB
      expect(r.originRequirementOk).toBe(false)
      expect(r.stars).toBe(0)
    })

    it("accepts any data-storage type as the database (e.g. object-storage)", () => {
      const r = evaluateAttempt(stats(100, 50), mrChallenge, 0, 100, new Set(["cdn", "dns", "object-storage"]))
      expect(r.originRequirementOk).toBe(true)
    })

    it("fails conservatively when a multi-region source exists but canvasTypeIds is unavailable", () => {
      const r = evaluateAttempt(stats(100, 50), mrChallenge, 0, 100, undefined)
      expect(r.originRequirementOk).toBe(false)
      expect(r.stars).toBe(0)
    })
  })

  describe("consistency gate (EN4/ED8, D74)", () => {
    const ch = { ...challenge, consistencyTargetMs: 100 }
    it("no target ⇒ not graded (consistencyOk true, byte-identical)", () => {
      const r = evaluateAttempt({ ...stats(100, 50), maxStalenessMs: 9999 }, challenge, 0, 100)
      expect(r.consistencyOk).toBe(true)
      expect(r.stars).toBe(3)
    })
    it("staleness within target passes", () => {
      const r = evaluateAttempt({ ...stats(100, 50), maxStalenessMs: 80 }, ch, 0, 100)
      expect(r.consistencyOk).toBe(true)
      expect(r.stars).toBe(3)
    })
    it("staleness over target fails passedMetrics ⇒ 0★", () => {
      const r = evaluateAttempt({ ...stats(100, 50), maxStalenessMs: 130 }, ch, 0, 100)
      expect(r.consistencyOk).toBe(false)
      expect(r.passedMetrics).toBe(false)
      expect(r.stars).toBe(0)
    })
    it("conservative-fail: target set but staleness unmeasured ⇒ fail (no write/read-split DB on path)", () => {
      const r = evaluateAttempt(stats(100, 50), ch, 0, 100) // maxStalenessMs undefined
      expect(r.consistencyOk).toBe(false)
      expect(r.stars).toBe(0)
    })
  })

  describe("required_types must be on the served path (ED3, D74)", () => {
    const reqCh = { ...challenge, requiredTypes: ["compute", "security"] }
    const present = new Set(["compute", "security", "message-queue"])
    const graph = (edges: { source: string; target: string }[]) => ({
      typeByNodeId: new Map([["t", "traffic-source"], ["c", "compute"], ["s", "security"]]),
      edges: [{ source: "t", target: "c" }, ...edges],
    })

    it("a non-exempt required type NOT reachable from traffic fails (disconnected block doesn't count)", () => {
      const r = evaluateAttempt(stats(99.5, 150), reqCh, 0, 100, present, undefined, graph([]))
      expect(r.hasRequiredBlocks).toBe(false) // security present but orphaned → off the served path
    })

    it("a non-exempt required type wired downstream of compute passes", () => {
      const r = evaluateAttempt(stats(99.5, 150), reqCh, 0, 100, present, undefined, graph([{ source: "c", target: "s" }]))
      expect(r.hasRequiredBlocks).toBe(true) // compute→security → directed-reachable
    })

    it("an async (exempt) required type passes even when off-path", () => {
      const ch = { ...challenge, requiredTypes: ["compute", "message-queue"] }
      const g = { typeByNodeId: new Map([["t", "traffic-source"], ["c", "compute"], ["q", "message-queue"]]), edges: [{ source: "t", target: "c" }] }
      const r = evaluateAttempt(stats(99.5, 150), ch, 0, 100, present, undefined, g) // queue orphaned, but messaging is exempt
      expect(r.hasRequiredBlocks).toBe(true)
    })

    it("falls back to canvas presence when no frozen graph (golden / no-snapshot path)", () => {
      const r = evaluateAttempt(stats(99.5, 150), reqCh, 0, 100, present) // no topologyGraph
      expect(r.hasRequiredBlocks).toBe(true) // presence-only fallback → byte-identical to pre-D74
    })
  })
})

describe("port enforcement gate (D87 — the well-formed star)", () => {
  // A perfect 3★ baseline: metrics pass, under budget, clean topology, required types absent (c1 has none).
  it("drops the otherwise-clean 3★ to 2★ when a start-time port mismatch exists", () => {
    const clean = evaluateAttempt(stats(100, 50), challenge, 0, 100) // no port arg → 0 → 3★
    expect(clean.stars).toBe(3)
    expect(clean.portsWellFormed).toBe(true)

    const mismatched = evaluateAttempt(stats(100, 50), challenge, 0, 100, undefined, undefined, undefined, 0, 1)
    expect(mismatched.stars).toBe(2) // loses the well-formed star
    expect(mismatched.portsWellFormed).toBe(false)
    expect(mismatched.cleanTopology).toBe(true) // structural topology is still clean — only ports gate the star
    expect(mismatched.underBudget).toBe(true)
  })

  it("port mismatch never resurrects a failed base pass (still 0★)", () => {
    const r = evaluateAttempt(stats(0, 50), challenge, 0, 100, undefined, undefined, undefined, 0, 3)
    expect(r.stars).toBe(0)
    expect(r.portsWellFormed).toBe(false)
  })

  it("portMismatchCount === 0 is the identity — byte-identical to omitting the arg", () => {
    const omitted = evaluateAttempt(stats(100, 50), challenge, 0, 100)
    const explicitZero = evaluateAttempt(stats(100, 50), challenge, 0, 100, undefined, undefined, undefined, 0, 0)
    expect(explicitZero.stars).toBe(omitted.stars)
    expect(explicitZero.portsWellFormed).toBe(true)
  })

  it("defaults portsWellFormed to true when the arg is omitted (legacy callers + the 41 built-ins)", () => {
    expect(evaluateAttempt(stats(100, 50), challenge, 0, 100).portsWellFormed).toBe(true)
  })

  it("a build already missing the topology star (dirty topology) stays 2★ — ports don't double-penalize", () => {
    // dirty topology already removed the well-formed star; a port mismatch can't drop it twice.
    const r = evaluateAttempt(stats(100, 50), challenge, 2, 100, undefined, undefined, undefined, 0, 1)
    expect(r.stars).toBe(2) // base + budget; well-formed already lost to topology
    expect(r.portsWellFormed).toBe(false)
  })
})
