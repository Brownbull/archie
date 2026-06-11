import { describe, it, expect, vi, beforeEach } from "vitest"

// The recalculation math has its own tests — here we pin the ORCHESTRATION: baseline-vs-preset
// comparison, the new-bottlenecks-only rule, traffic-first seeding, and the empty-canvas guard.
const { runMock } = vi.hoisted(() => ({ runMock: vi.fn() }))
vi.mock("@/services/recalculationService", () => ({ recalculationService: { run: runMock } }))
vi.mock("@/services/failureLoader", () => ({
  getAllFailurePresets: () => [
    { id: "failure-a", name: "A", description: "", icon: "AlertTriangle", failureModifiers: { "read-latency": 0.4 } },
    { id: "failure-b", name: "B", description: "", icon: "Globe", failureModifiers: { "edge-latency": 0.3 } },
  ],
}))

import { computeBreakingFailures } from "@/services/failureImpact"

const node = (id: string, cat = "compute") => ({
  id,
  data: { archieComponentId: "c", activeConfigVariantId: "v", componentName: id, componentCategory: cat },
})
const heatmap = (entries: Record<string, "healthy" | "warning" | "bottleneck">) =>
  ({ nodeHeatmap: new Map(Object.entries(entries)) })

describe("computeBreakingFailures (P4-S4 / D94)", () => {
  beforeEach(() => runMock.mockReset())

  it("flags a preset that pushes a healthy node to bottleneck; spares one that only warns", () => {
    runMock
      .mockReturnValueOnce(heatmap({ n1: "healthy", n2: "healthy" })) // baseline
      .mockReturnValueOnce(heatmap({ n1: "bottleneck", n2: "healthy" })) // failure-a breaks n1
      .mockReturnValueOnce(heatmap({ n1: "warning", n2: "warning" })) // failure-b only degrades
    const breaking = computeBreakingFailures([node("t", "traffic"), node("n1"), node("n2")] as never, [])
    expect([...breaking]).toEqual(["failure-a"])
  })

  it("a pre-existing bottleneck does NOT make every preset glow (new reds only)", () => {
    runMock
      .mockReturnValueOnce(heatmap({ n1: "bottleneck" })) // already broken at baseline
      .mockReturnValueOnce(heatmap({ n1: "bottleneck" }))
      .mockReturnValueOnce(heatmap({ n1: "bottleneck" }))
    const breaking = computeBreakingFailures([node("t", "traffic"), node("n1")] as never, [])
    expect(breaking.size).toBe(0)
  })

  it("seeds the recalculation BFS from the traffic source (the served path is what quests grade)", () => {
    runMock.mockReturnValue(heatmap({}))
    computeBreakingFailures([node("a"), node("t", "traffic"), node("b")] as never, [])
    expect(runMock.mock.calls[0][2]).toBe("t")
  })

  it("falls back to the first node when no traffic source exists", () => {
    runMock.mockReturnValue(heatmap({}))
    computeBreakingFailures([node("a"), node("b")] as never, [])
    expect(runMock.mock.calls[0][2]).toBe("a")
  })

  it("empty canvas → empty set, zero recalculations", () => {
    expect(computeBreakingFailures([], []).size).toBe(0)
    expect(runMock).not.toHaveBeenCalled()
  })
})
