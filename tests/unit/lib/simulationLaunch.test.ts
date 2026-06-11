import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: (id: string) =>
      ({
        "web-users": {
          id: "web-users", name: "Web Users", category: "traffic", typeId: "traffic-web",
          configVariants: [{ id: "moderate", maxRPS: 3000, monthlyCost: 0 }],
        },
      })[id],
    getComponentsByCategory: () => [],
  },
}))

import { launchChallengeAttempt } from "@/lib/simulationLaunch"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import type { Challenge } from "@/lib/challengeTypes"

const challenge = {
  id: "c1", title: "t", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 500 }], requiredComponents: [],
  targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 }, scheduledEvents: [], hints: [],
  trafficSources: [{ type: "web-users", rps: 800, kind: "steady", workload: "read", origin: "one-region" }],
} as unknown as Challenge

const trafficNode = (over: Record<string, unknown> = {}) => ({
  id: "t1", type: "archie-component", position: { x: 0, y: 0 },
  data: {
    archieComponentId: "web-users", activeConfigVariantId: "moderate", componentName: "Web Users",
    componentCategory: "traffic", replicaCount: 1,
    trafficRps: 800, trafficKind: "steady", trafficWorkload: "read", trafficOrigin: "one-region", ...over,
  },
})

const startMock = vi.fn()
const peakOf = (curve: ReadonlyArray<{ rps: number }>) => Math.max(...curve.map((p) => p.rps))

/**
 * The break-it loop's launch seam (P4-S3, D94): pre-3★ the authored demand is authoritative (D20);
 * post-3★ the canvas dials drive the curve, workload blend, and the multi-region flag.
 */
describe("launchChallengeAttempt — post-3★ canvas-wins seam (P4-S3 / D94)", () => {
  beforeEach(() => {
    startMock.mockClear()
    useSimulationStore.setState({ start: startMock } as never)
    useArchitectureStore.setState({ nodes: [trafficNode()] as never, edges: [], topologyIssues: [] })
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "building", lastResult: null, bestStars: {}, attemptSnapshot: null })
  })

  it("pre-3★: the authored demand wins — a deviated dial changes nothing", () => {
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000, trafficWorkload: "write", trafficOrigin: "multi-region" })] as never })
    launchChallengeAttempt(challenge)
    expect(startMock).toHaveBeenCalledTimes(1)
    const [graph, curve] = startMock.mock.calls[0]
    expect(peakOf(curve)).toBe(800) // authored rps, not the dial's 9000
    expect(graph.writePressure).toBe(0) // authored read workload, not the dial's write
    expect(graph.multiRegion).toBeUndefined() // authored one-region
  })

  it("post-3★: the rps dial drives the simulated load", () => {
    useChallengeStore.setState({ bestStars: { c1: 3 } })
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    launchChallengeAttempt(challenge)
    const [, curve] = startMock.mock.calls[0]
    expect(peakOf(curve)).toBe(9000)
  })

  it("post-3★: the origin dial sets the multi-region flag (RTT stays authored)", () => {
    useChallengeStore.setState({ bestStars: { c1: 3 } })
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficOrigin: "multi-region" })] as never })
    launchChallengeAttempt(challenge)
    const [graph] = startMock.mock.calls[0]
    expect(graph.multiRegion).toBe(true)
  })

  it("post-3★ with matching dials reproduces the authored peak (a clean replay isn't perturbed)", () => {
    useChallengeStore.setState({ bestStars: { c1: 3 } })
    launchChallengeAttempt(challenge)
    const [graph, curve] = startMock.mock.calls[0]
    expect(peakOf(curve)).toBe(800)
    expect(graph.multiRegion).toBeUndefined()
  })

  it("post-3★ with no traffic node falls back to the authored demand", () => {
    useChallengeStore.setState({ bestStars: { c1: 3 } })
    useArchitectureStore.setState({ nodes: [] })
    launchChallengeAttempt(challenge)
    const [, curve] = startMock.mock.calls[0]
    expect(peakOf(curve)).toBe(800)
  })
})

describe("post-3★ per-block failure injection (P5-S3 / D95)", () => {
  beforeEach(() => {
    startMock.mockClear()
    useChallengeStore.setState({ injectedBlockFailure: null })
  })

  it("post-3★ with an injection: the run carries an extra component_failure on the chosen node", () => {
    useChallengeStore.setState({ bestStars: { c1: 3 }, injectedBlockFailure: "n-api" })
    launchChallengeAttempt(challenge)
    const events = startMock.mock.calls[0][2]
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: "component_failure", target: "n-api", t: 24, durationS: 15 })
  })

  it("pre-3★: the injection is ignored — the quest's conditions are the fixed problem statement", () => {
    useChallengeStore.setState({ bestStars: {}, injectedBlockFailure: "n-api" })
    launchChallengeAttempt(challenge)
    expect(startMock.mock.calls[0][2]).toEqual(challenge.scheduledEvents)
  })

  it("no injection: authored events pass through untouched", () => {
    useChallengeStore.setState({ bestStars: { c1: 3 } })
    launchChallengeAttempt(challenge)
    expect(startMock.mock.calls[0][2]).toEqual(challenge.scheduledEvents)
  })
})
