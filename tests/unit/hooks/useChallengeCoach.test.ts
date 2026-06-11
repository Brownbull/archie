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

    it("a deleted traffic source is a VALIDATION failure, never an instruction (2026-06-11: tackle is gone everywhere)", () => {
      setNodes([node("c", "compute")]) // compute but no traffic source
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.modeLabel).toBe("Check")
      expect(r.current?.headline).toBe("No load origin")
    })

    it("missing required blocks are NEVER prompted — that's the solution channel (hints/HUD)", () => {
      setNodes([node("src", "traffic")]) // source present, compute/data missing
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.headline).not.toMatch(/Add a/)
      expect(r.current?.mode).toBe("run") // structurally clean → run-ready, requirements are the player's job
    })

    it("stranded blocks surface as a diagnostic", () => {
      setNodes(
        [node("src", "traffic"), node("c", "compute"), node("d", "data-storage")],
        [{ issueType: "orphan", nodeId: "d" }],
      )
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.modeLabel).toBe("Check")
      expect(r.current?.headline).toBe("Stranded blocks")
      expect(r.current?.detail).toContain("1 block")
    })

    it("ready: run prompt when structurally clean", () => {
      setNodes([node("src", "traffic"), node("c", "compute"), node("d", "data-storage")], [])
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("run")
      expect(r.current?.headline).toBe("No structural issues")
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

    it("addresses cost-per-request WITH the contrast when that's the only miss (SLOs all held)", () => {
      // D74: a cost-efficiency miss is its own failure mode — must not fall through to "overloaded".
      useChallengeStore.setState({
        activeChallenge: makeChallenge({ targetMetrics: { uptimePercent: 99, p99LatencyMs: 200, costPerRequest: 0.5 } }),
        attemptState: "scored",
        lastResult: result({ stars: 0, passedMetrics: false }),
        lastMeasured: measured({ uptimePercent: 100, p99LatencyMs: 50, costPerRequest: 0.9 }),
      })
      const { result: r } = renderHook(() => useChallengeCoach())
      expect(r.current?.mode).toBe("iterate")
      expect(r.current?.headline).toBe("Lower cost-per-request")
      expect(r.current?.detail).toContain("0.9000") // measured-vs-target contrast
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

describe("live event narration while running (S8 / D89 — free observe coaching)", () => {
  const tick = (events?: import("@/lib/simulationTypes").TickEventState[]) => ({
    tick: 0, targetRps: 100, nodes: [], totalServedRps: 100, totalFailedRps: 0,
    ...(events ? { events } : {}),
  })

  it("narrates an undetected failure hitting its target", async () => {
    const { useSimulationStore } = await import("@/stores/simulationStore")
    useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "running" })
    useSimulationStore.setState({ ticks: [tick([{ type: "component_failure", target: "data-storage", nodeIds: ["db"], detected: false }])], currentTick: 0 })
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).toBe("A failure is hitting data-storage")
    expect(r.current?.detail).toContain("observability would detect")
    useSimulationStore.getState().reset()
  })

  it("celebrates detection — the observe mechanic teaching itself", async () => {
    const { useSimulationStore } = await import("@/stores/simulationStore")
    useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "running" })
    useSimulationStore.setState({ ticks: [tick([{ type: "az_outage", target: "compute", nodeIds: ["c1"], detected: true }])], currentTick: 0 })
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).toBe("Detected — blast contained")
    expect(r.current?.detail).toContain("amber")
    useSimulationStore.getState().reset()
  })

  it("falls back to the generic watch line on event-free ticks", async () => {
    const { useSimulationStore } = await import("@/stores/simulationStore")
    useSimulationStore.getState().reset()
    useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "running" })
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).toBe("Watch the live stats")
  })
})

describe("break-it loop narration (P4-S3 / D94)", () => {
  const trafficSources = [{ type: "web-users", rps: 1000, kind: "steady", workload: "mixed", origin: "one-region" }] as never
  const trafficNode = (over: Record<string, unknown> = {}) => ({
    id: "t1",
    data: { componentCategory: "traffic", trafficRps: 1000, trafficKind: "steady", trafficWorkload: "mixed", trafficOrigin: "one-region", ...over },
  })

  beforeEach(async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    useUserProgressStore.setState({ breaksByChallenge: {} })
  })

  it("3★ on a quest with authored traffic invites the break instead of the vendor-swap experiment", () => {
    useChallengeStore.setState({
      activeChallenge: makeChallenge({ trafficSources }),
      attemptState: "scored",
      lastResult: result({ stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true }),
      bestStars: { c1: 3 },
    })
    setNodes([trafficNode() as never])
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).toBe("Three stars — now break it!")
    expect(r.current?.detail).toContain("rps, kind, workload, origin")
  })

  it("3★ keeps the classic celebration when all four breaks are already collected", async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    useUserProgressStore.setState({ breaksByChallenge: { c1: { rps: true, kind: true, workload: true, origin: true } } })
    useChallengeStore.setState({
      activeChallenge: makeChallenge({ trafficSources }),
      attemptState: "scored",
      lastResult: result({ stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true }),
      bestStars: { c1: 3 },
    })
    setNodes([trafficNode() as never])
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).toBe("Three stars — nailed it!")
  })

  it("a deliberate post-3★ single-dial break is celebrated, not coached as a failure", () => {
    useChallengeStore.setState({
      activeChallenge: makeChallenge({ trafficSources }),
      attemptState: "scored",
      lastResult: result({ stars: 0, passedMetrics: false }),
      lastMeasured: measured({ uptimePercent: 80 }),
      bestStars: { c1: 3 },
    })
    setNodes([trafficNode({ trafficRps: 9000 }) as never])
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.modeLabel).toBe("Broke it")
    expect(r.current?.headline).toContain("rps")
    expect(r.current?.detail).toContain("kind, workload, origin")
  })

  it("a pre-3★ failed run still gets iterate coaching even if traffic deviates (imports can't fake breaks)", () => {
    useChallengeStore.setState({
      activeChallenge: makeChallenge({ trafficSources }),
      attemptState: "scored",
      lastResult: result({ stars: 0, passedMetrics: false }),
      lastMeasured: measured({ uptimePercent: 80 }),
      bestStars: {},
    })
    setNodes([trafficNode({ trafficRps: 9000 }) as never])
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.mode).toBe("iterate")
  })
})

describe("coach de-escalation — beginner-gated tackle (Plan-2 P3 / D98)", () => {
  const advanced = (over: Partial<Challenge> = {}) => makeChallenge({ difficulty: "advanced", ...over })

  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: advanced(), attemptState: "building" })
    useArchitectureStore.setState({ edges: [] } as never)
  })

  it("non-beginner: NO step-by-step build instructions — missing required categories are the HUD's job", () => {
    setNodes([node("src", "traffic")]) // compute + data-storage required but missing
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).not.toMatch(/Add a/)
    expect(r.current?.mode).toBe("run")
    expect(r.current?.headline).toBe("No structural issues")
  })

  it("non-beginner: a deleted traffic source reads as a VALIDATION failure, not an instruction", () => {
    setNodes([node("c", "compute")])
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.modeLabel).toBe("Check")
    expect(r.current?.headline).toBe("No load origin")
    expect(r.current?.headline).not.toMatch(/Add/)
  })

  it("non-beginner: port mismatches surface as a compiler-style diagnostic", () => {
    setNodes([node("src", "traffic"), node("c", "compute")])
    useArchitectureStore.setState({ edges: [{ id: "e1", source: "src", target: "c", data: { isPortMismatch: true } }] } as never)
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).toBe("1 port mismatch")
    expect(r.current?.detail).toContain("well-formed star")
  })

  it("non-beginner: stranded blocks surface as a diagnostic, not a to-do", () => {
    setNodes([node("src", "traffic"), node("d", "data-storage")], [{ issueType: "orphan", nodeId: "d" }])
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).toBe("Stranded blocks")
  })

  it("beginner quests get diagnostics too — 'Add a Data Storage block' IS the solution (2026-06-11)", () => {
    useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "building" }) // beginner
    setNodes([node("src", "traffic")])
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.headline).not.toMatch(/Add a/)
    expect(r.current?.mode).toBe("run")
  })

  it("running/scored coaching is untouched by the gate", () => {
    useChallengeStore.setState({ activeChallenge: advanced(), attemptState: "running" })
    const { result: r } = renderHook(() => useChallengeCoach())
    expect(r.current?.mode).toBe("watch")
  })
})
