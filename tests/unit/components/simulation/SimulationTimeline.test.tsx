import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SimulationTimeline } from "@/components/simulation/SimulationTimeline"
import type { TickState } from "@/lib/simulationTypes"

const frame = (tick: number, over: Partial<TickState> = {}): TickState => ({
  tick,
  targetRps: 100,
  nodes: [],
  totalServedRps: 100,
  totalFailedRps: 0,
  ...over,
})

describe("SimulationTimeline — observe-to-recover event markers (S8 / D89)", () => {
  it("renders no marker on event-free ticks", () => {
    render(<SimulationTimeline ticks={[frame(0), frame(1)]} currentTick={0} />)
    expect(screen.queryByTestId(/^sim-event-marker-/)).not.toBeInTheDocument()
  })

  it("marks the ticks where an event is active, red while undetected", () => {
    const ticks = [
      frame(0),
      frame(1, { events: [{ type: "component_failure", target: "data-storage", nodeIds: ["db"], detected: false }] }),
      frame(2),
    ]
    render(<SimulationTimeline ticks={ticks} currentTick={0} />)
    const marker = screen.getByTestId("sim-event-marker-1")
    expect(marker).toBeInTheDocument()
    expect(marker).not.toHaveAttribute("data-detected")
    expect(marker.querySelector("title")?.textContent).toContain("data-storage failure")
    expect(screen.queryByTestId("sim-event-marker-0")).not.toBeInTheDocument()
  })

  it("turns the marker amber + annotates once the failure is detected (the recover moment)", () => {
    const ticks = [
      frame(0, { events: [{ type: "az_outage", target: "compute", nodeIds: ["c1"], detected: true }] }),
    ]
    render(<SimulationTimeline ticks={ticks} currentTick={0} />)
    const marker = screen.getByTestId("sim-event-marker-0")
    expect(marker).toHaveAttribute("data-detected", "true")
    expect(marker.querySelector("title")?.textContent).toContain("detected, blast contained")
  })
})

describe("latency-degraded ticks (2026-06-11 playtest: the all-green lie)", () => {
  it("a served tick past the quest's p99 target renders amber, not green", async () => {
    const { useChallengeStore } = await import("@/stores/challengeStore")
    useChallengeStore.setState({
      activeChallenge: { id: "c1", targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 } },
    } as never)
    const { container } = render(
      <SimulationTimeline ticks={[frame(0, { pathLatencyMs: 752 }), frame(1, { pathLatencyMs: 100 })]} currentTick={0} />,
    )
    // two rects per tick (served + failed): tick0 served = [0], tick1 served = [2]
    const rects = container.querySelectorAll("rect")
    expect(rects[0].getAttribute("class")).toContain("fill-yellow-500")
    expect(rects[2].getAttribute("class")).toContain("fill-green-500")
    useChallengeStore.setState({ activeChallenge: null } as never)
  })

  it("free mode (no target): green as before", () => {
    const { container } = render(<SimulationTimeline ticks={[frame(0, { pathLatencyMs: 752 })]} currentTick={0} />)
    expect(container.querySelector("rect")!.getAttribute("class")).toContain("fill-green-500")
  })
})
