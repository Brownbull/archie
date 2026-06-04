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
})
