import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SimulationBar } from "@/components/simulation/SimulationBar"
import { useSimulationStore } from "@/stores/simulationStore"
import type { TickState } from "@/lib/simulationTypes"

const frame = (tick: number, targetRps: number, served: number, failed: number): TickState => ({
  tick,
  targetRps,
  nodes: [{ nodeId: "in", incomingRps: targetRps, servedRps: served, failedRps: failed, latencyMs: 12, capacityPercent: 0.5, overloaded: false }],
  totalServedRps: served,
  totalFailedRps: failed,
})

const s = () => useSimulationStore.getState()

function setRunning() {
  useSimulationStore.setState({
    status: "running",
    isPlaying: true,
    currentTick: 1,
    speed: 1,
    ticks: [frame(0, 50, 50, 0), frame(1, 100, 80, 20)],
    entryNodeIds: ["in"],
  })
}

function setDone() {
  useSimulationStore.setState({
    status: "done",
    isPlaying: false,
    currentTick: 1,
    speed: 1,
    ticks: [frame(0, 50, 50, 0), frame(1, 100, 80, 20)],
    entryNodeIds: ["in"],
  })
}

describe("SimulationBar (Epic 15)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    s().reset()
  })
  afterEach(() => {
    s().reset()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("renders nothing when idle", () => {
    render(<SimulationBar />)
    expect(screen.queryByTestId("simulation-bar")).not.toBeInTheDocument()
  })

  it("renders stats, timeline, and playback controls when a sim is active", () => {
    setRunning()
    render(<SimulationBar />)
    expect(screen.getByTestId("simulation-bar")).toBeInTheDocument()
    expect(screen.getByTestId("sim-stats")).toBeInTheDocument()
    expect(screen.getByTestId("sim-timeline")).toBeInTheDocument()
    expect(screen.getByTestId("playback-controls")).toBeInTheDocument()
    expect(screen.getByTestId("playback-tick")).toHaveTextContent("2/2")
  })

  it("pause toggle pauses a running sim", () => {
    setRunning()
    render(<SimulationBar />)
    fireEvent.click(screen.getByTestId("playback-toggle"))
    expect(s().status).toBe("paused")
    expect(s().isPlaying).toBe(false)
  })

  it("speed button updates playback speed", () => {
    setRunning()
    render(<SimulationBar />)
    fireEvent.click(screen.getByTestId("playback-speed-5"))
    expect(s().speed).toBe(5)
  })

  it("seek scrubber repositions the current tick", () => {
    setRunning()
    render(<SimulationBar />)
    fireEvent.change(screen.getByTestId("playback-seek"), { target: { value: "0" } })
    expect(s().currentTick).toBe(0)
  })

  it("close resets the simulation to idle", () => {
    setRunning()
    render(<SimulationBar />)
    fireEvent.click(screen.getByTestId("sim-close"))
    expect(s().status).toBe("idle")
  })

  it("labels the exit control 'Exit' so getting out of the simulation is explicit", () => {
    setRunning()
    render(<SimulationBar />)
    expect(screen.getByTestId("sim-close")).toHaveTextContent("Exit")
  })

  it("surfaces a labeled 'Watch again' on the playback control once the run is done (P1/T6 relabel)", () => {
    setDone()
    render(<SimulationBar />)
    const replay = screen.getByTestId("playback-replay")
    expect(replay).toHaveTextContent("Watch again")
    fireEvent.click(replay)
    expect(s().currentTick).toBe(0)
    expect(s().status).toBe("running")
  })

  it("keeps the watch-again control icon-only (no label) during live playback", () => {
    setRunning()
    render(<SimulationBar />)
    expect(screen.getByTestId("playback-replay")).not.toHaveTextContent("Watch again")
  })

  // P1/T6: a distinct RERUN re-simulates the live canvas (and re-grades in a quest) — "Watch again"
  // only replays the recorded ticks. The button appears exactly when the run is done.
  it("offers a Rerun control once the run is done, hidden during live playback", () => {
    setDone()
    const { unmount } = render(<SimulationBar />)
    expect(screen.getByTestId("playback-rerun")).toHaveTextContent("Rerun")
    unmount()
    setRunning()
    render(<SimulationBar />)
    expect(screen.queryByTestId("playback-rerun")).not.toBeInTheDocument()
  })

  it("Rerun re-simulates from the live canvas (sandbox path → fresh run from tick 0)", () => {
    setDone()
    render(<SimulationBar />)
    fireEvent.click(screen.getByTestId("playback-rerun"))
    // launchSandboxRun → simulationStore.start() on the (empty) canvas: a fresh result replaces the
    // recorded ticks and playback state restarts.
    expect(s().currentTick).toBe(0)
  })

  it("shows the failed-request uptime drop in stats", () => {
    setRunning() // tick1: served 80 / failed 20 → cumulative 130 served / 20 failed
    render(<SimulationBar />)
    // uptime = 130/150 ≈ 86.7%
    expect(screen.getByTestId("sim-stats")).toHaveTextContent("86.7%")
  })
})
