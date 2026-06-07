import { describe, it, expect, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useChallengeCoach } from "@/hooks/useChallengeCoach"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { COMPONENT_CATEGORIES } from "@/lib/constants"
import type { Challenge, StarBreakdown, MeasuredAttempt } from "@/lib/challengeTypes"

function makeChallenge(over: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1", title: "Test", brief: "b", difficulty: "beginner",
    budgetCap: 100, durationSeconds: 60, trafficCurve: [{ t: 0, rps: 0 }],
    requiredComponents: ["compute", "data-storage"],
    targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
    scheduledEvents: [], hints: [], ...over,
  }
}

// Minimal canvas nodes — the hook only reads data.componentCategory.
const node = (id: string, cat: string) => ({ id, data: { componentCategory: cat } })
const setNodes = (nodes: ReturnType<typeof node>[], topologyIssues: { issueType: string; nodeId: string }[] = []) =>
  useArchitectureStore.setState({ nodes, topologyIssues } as never)

const result = (over: Partial<StarBreakdown>): StarBreakdown =>
  ({ stars: 0, passedMetrics: false, underBudget: false, cleanTopology: false, ...over })
const measured = (over: Partial<MeasuredAttempt>): MeasuredAttempt =>
  ({ uptimePercent: 100, p99LatencyMs: 50, totalCost: 50, topologyIssueCount: 0, ...over })

describe("useChallengeCoach (P88)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null })
    setNodes([])
  })

  it("returns null outside challenge mode", () => {
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current).toBeNull()
  })

  describe("tackle stage (building)", () => {
    beforeEach(() => {
      useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "building" })
    })

    it("first step: add a traffic source when none exists", () => {
      setNodes([node("c", "compute")]) // compute but no traffic source
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("tackle")
      expect(r.current?.headline).toBe("Add a traffic source")
    })

    it("next: add the first missing required block once a source exists", () => {
      setNodes([node("src", "traffic")]) // source present, compute/data missing
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("tackle")
      expect(r.current?.headline).toBe(`Add a ${COMPONENT_CATEGORIES["compute"].label} block`)
    })

    it("next: wire orphans once source + all required are placed", () => {
      setNodes(
        [node("src", "traffic"), node("c", "compute"), node("d", "data-storage")],
        [{ issueType: "orphan", nodeId: "d" }],
      )
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("tackle")
      expect(r.current?.headline).toBe("Wire it all together")
      expect(r.current?.detail).toContain("1 block")
    })

    it("ready: prompt to run when source + required present and no orphans", () => {
      setNodes([node("src", "traffic"), node("c", "compute"), node("d", "data-storage")], [])
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("run")
      expect(r.current?.headline).toBe("Run the simulation")
    })
  })

  it("watch stage: while the simulation is running", () => {
    useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "running" })
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.mode).toBe("watch")
    expect(r.current?.headline).toBe("Watch the live stats")
  })

  describe("iterate stage (scored, < 3 stars)", () => {
    const scoreWith = (res: Partial<StarBreakdown>, meas: Partial<MeasuredAttempt>) => {
      useChallengeStore.setState({
        activeChallenge: makeChallenge(),
        attemptState: "scored",
        lastResult: result(res),
        lastMeasured: measured(meas),
      })
    }

    it("names the uptime miss WITH the contrast when uptime missed (no bottleneck)", () => {
      scoreWith({ stars: 0, passedMetrics: false }, { uptimePercent: 80 })
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("iterate")
      expect(r.current?.headline).toBe("Uptime is too low")
      expect(r.current?.detail).toContain("80.0%") // D74: shows measured-vs-target contrast
    })

    it("cut latency when only p99 missed the target", () => {
      scoreWith({ stars: 0, passedMetrics: false }, { uptimePercent: 100, p99LatencyMs: 500 })
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("iterate")
      expect(r.current?.headline).toBe("Cut the latency")
    })

    it("trim cost when metrics passed but over budget", () => {
      scoreWith({ stars: 1, passedMetrics: true, underBudget: false }, {})
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("iterate")
      expect(r.current?.headline).toBe("Trim the cost")
    })

    it("tidy wiring when metrics + budget passed but topology dirty", () => {
      scoreWith({ stars: 2, passedMetrics: true, underBudget: true, cleanTopology: false }, {})
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("iterate")
      expect(r.current?.headline).toBe("Tidy the wiring")
    })
  })

  it("mastered stage: three stars", () => {
    useChallengeStore.setState({
      activeChallenge: makeChallenge(),
      attemptState: "scored",
      lastResult: result({ stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true }),
      lastMeasured: measured({}),
    })
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.mode).toBe("mastered")
    expect(r.current?.headline).toContain("Three stars")
  })
})
