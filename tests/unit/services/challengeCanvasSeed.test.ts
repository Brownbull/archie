import { describe, it, expect, vi } from "vitest"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponentsByCategory: (cat: string) =>
      cat === "traffic"
        ? [{ id: "web-users", name: "Web Users", configVariants: [{ id: "moderate", maxRPS: 3000 }] }]
        : [],
    getComponent: (id: string) =>
      ({
        "web-users": { id: "web-users", name: "Web Users", category: "traffic", configVariants: [{ id: "moderate" }], ports: [{ id: "http-out", type: "http", direction: "out" }] },
        fastapi: { id: "fastapi", name: "FastAPI", category: "compute", configVariants: [{ id: "small" }, { id: "large" }], ports: [{ id: "http-in", type: "http", direction: "in" }] },
      })[id],
  },
}))
vi.mock("@/services/scenarioLoader", () => ({ isKnownScenarioId: () => true }))
vi.mock("@/services/failureLoader", () => ({ isKnownFailurePresetId: () => true }))

import { makeChallengeCanvas } from "@/services/challengeCanvasSeed"
import type { Challenge } from "@/lib/challengeTypes"

const base = {
  id: "c1", title: "t", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 800 }], requiredComponents: [],
  targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 }, scheduledEvents: [], hints: [],
  trafficSources: [{ type: "web-users", rps: 800, kind: "steady", workload: "read", origin: "one-region" }],
} as unknown as Challenge

describe("makeChallengeCanvas (P5-S1 / D95)", () => {
  it("greenfield (no seed): traffic-only nodes, no edges — the pre-Phase-5 behavior", () => {
    const { nodes, edges } = makeChallengeCanvas(base)
    expect(edges).toEqual([])
    expect(nodes).toHaveLength(1)
    expect(nodes[0].data).toMatchObject({ componentCategory: "traffic", trafficRps: 800 })
  })

  it("brownfield: hydrates the seed through the import pipeline (components, variants, edges)", () => {
    const c = {
      ...base,
      initialArchitecture: {
        nodes: [
          { id: "n-t", componentId: "web-users", configVariantId: "moderate", position: { x: 0, y: 0 }, replicas: 1, trafficRps: 800 },
          { id: "n-c", componentId: "fastapi", configVariantId: "large", position: { x: 220, y: 0 }, replicas: 2 },
        ],
        edges: [{ id: "e0", sourceNodeId: "n-t", targetNodeId: "n-c" }],
      },
    } as unknown as Challenge
    const { nodes, edges } = makeChallengeCanvas(c)
    expect(nodes).toHaveLength(2)
    const compute = nodes.find((n) => n.id === "n-c")
    expect(compute?.data).toMatchObject({ archieComponentId: "fastapi", activeConfigVariantId: "large", replicaCount: 2 })
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ source: "n-t", target: "n-c" })
  })

  it("appends the challenge traffic nodes when the seed carries no traffic source", () => {
    const c = {
      ...base,
      initialArchitecture: {
        nodes: [{ id: "n-c", componentId: "fastapi", configVariantId: "small", position: { x: 220, y: 0 }, replicas: 1 }],
        edges: [],
      },
    } as unknown as Challenge
    const { nodes } = makeChallengeCanvas(c)
    expect(nodes.some((n) => n.data.componentCategory === "traffic")).toBe(true)
    expect(nodes.some((n) => n.id === "n-c")).toBe(true)
  })

  it("an unknown variant id falls back to the component's first variant (import-pipeline semantics)", () => {
    const c = {
      ...base,
      initialArchitecture: {
        nodes: [
          { id: "n-t", componentId: "web-users", configVariantId: "moderate", position: { x: 0, y: 0 }, replicas: 1, trafficRps: 800 },
          { id: "n-c", componentId: "fastapi", configVariantId: "nope", position: { x: 220, y: 0 }, replicas: 1 },
        ],
        edges: [],
      },
    } as unknown as Challenge
    const { nodes } = makeChallengeCanvas(c)
    expect(nodes.find((n) => n.id === "n-c")?.data.activeConfigVariantId).toBe("small")
  })
})
