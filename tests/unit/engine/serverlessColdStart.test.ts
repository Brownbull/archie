import { describe, it, expect } from "vitest"
import { simulateTick } from "@/engine/simulationEngine"
import type { SimGraph } from "@/lib/simulationTypes"

/**
 * TDD — Serverless Cold Start (E4). Lambda on-demand pays a latency penalty
 * on a fraction of requests (cold starts). Provisioned concurrency eliminates it.
 */

function buildLambdaGraph(coldStartLatencyMs?: number, coldStartRatio?: number): SimGraph {
  return {
    nodes: [
      { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
      {
        id: "lambda",
        category: "compute",
        effectiveMaxRps: 5000,
        baseLatencyMs: 15,
        failureMode: "shed",
        ...(coldStartLatencyMs !== undefined ? { coldStartLatencyMs } : {}),
        ...(coldStartRatio !== undefined ? { coldStartRatio } : {}),
      },
    ],
    edges: [{ source: "traffic", target: "lambda" }],
  }
}

describe("Serverless Cold Start — E4 (TDD)", () => {
  it("Lambda on-demand (10% cold starts at 200ms) has higher effective latency", () => {
    const tick = simulateTick(buildLambdaGraph(200, 0.10), 0, 1000)
    const lambda = tick.nodes.find((n) => n.nodeId === "lambda")!
    // base 15ms + cold start penalty: 200 × 0.10 = 20ms → ~35ms effective
    expect(lambda.latencyMs).toBeCloseTo(35, 0)
  })

  it("Lambda provisioned (no cold starts) has base latency only", () => {
    const tick = simulateTick(buildLambdaGraph(0, 0), 0, 1000)
    const lambda = tick.nodes.find((n) => n.nodeId === "lambda")!
    expect(lambda.latencyMs).toBe(15)
  })

  it("no cold start fields = base latency (backward compatible)", () => {
    const tick = simulateTick(buildLambdaGraph(), 0, 1000)
    const lambda = tick.nodes.find((n) => n.nodeId === "lambda")!
    expect(lambda.latencyMs).toBe(15)
  })

  it("high cold start ratio (30%) makes latency significantly worse", () => {
    const tick = simulateTick(buildLambdaGraph(300, 0.30), 0, 1000)
    const lambda = tick.nodes.find((n) => n.nodeId === "lambda")!
    // 15 + 300 × 0.30 = 105ms
    expect(lambda.latencyMs).toBeCloseTo(105, 0)
  })
})
