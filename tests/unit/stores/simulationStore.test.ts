import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useSimulationStore, getCurrentTickState } from "@/stores/simulationStore"
import { SIM_TICKS, SIM_BASE_TICK_MS } from "@/lib/constants"
import type { SimGraph, TrafficCurve } from "@/lib/simulationTypes"

const graph: SimGraph = {
  nodes: [
    { id: "in", category: "compute", effectiveMaxRps: 80, baseLatencyMs: 10, failureMode: "shed" },
    { id: "db", category: "data-storage", effectiveMaxRps: 1000, baseLatencyMs: 5, failureMode: "shed" },
  ],
  edges: [{ source: "in", target: "db" }],
}
const ramp: TrafficCurve = [{ t: 0, rps: 0 }, { t: 90, rps: 100 }]

const s = () => useSimulationStore.getState()

describe("simulationStore — playback state machine (Epic 15)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    s().reset()
  })
  afterEach(() => {
    s().reset()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("starts running with precomputed ticks at tick 0", () => {
    s().start(graph, ramp)
    expect(s().status).toBe("running")
    expect(s().isPlaying).toBe(true)
    expect(s().currentTick).toBe(0)
    expect(s().ticks).toHaveLength(SIM_TICKS)
    expect(s().entryNodeIds).toEqual(["in"])
  })

  it("advances one tick per SIM_BASE_TICK_MS at 1× speed", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS)
    expect(s().currentTick).toBe(1)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * 3)
    expect(s().currentTick).toBe(4)
  })

  it("reaches 'done' at the last tick and stops advancing", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * (SIM_TICKS + 5))
    expect(s().status).toBe("done")
    expect(s().isPlaying).toBe(false)
    expect(s().currentTick).toBe(SIM_TICKS - 1)
  })

  it("pause freezes the tick; advancing timers does not progress", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * 2)
    expect(s().currentTick).toBe(2)
    s().pause()
    expect(s().status).toBe("paused")
    expect(s().isPlaying).toBe(false)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * 5)
    expect(s().currentTick).toBe(2) // frozen
  })

  it("resume continues from the paused tick", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * 2)
    s().pause()
    s().resume()
    expect(s().status).toBe("running")
    vi.advanceTimersByTime(SIM_BASE_TICK_MS)
    expect(s().currentTick).toBe(3)
  })

  it("replay restarts playback from tick 0", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * (SIM_TICKS + 2)) // run to done
    expect(s().status).toBe("done")
    s().replay()
    expect(s().currentTick).toBe(0)
    expect(s().status).toBe("running")
    vi.advanceTimersByTime(SIM_BASE_TICK_MS)
    expect(s().currentTick).toBe(1)
  })

  it("setSpeed accelerates advancement (10× advances ~10 ticks per base interval)", () => {
    s().start(graph, ramp)
    s().setSpeed(10)
    expect(s().speed).toBe(10)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS) // = 10 intervals at 10×
    expect(s().currentTick).toBe(10)
  })

  it("seek clamps to [0, ticks.length - 1] and does not change play state", () => {
    s().start(graph, ramp)
    s().pause()
    s().seek(999)
    expect(s().currentTick).toBe(SIM_TICKS - 1)
    s().seek(-5)
    expect(s().currentTick).toBe(0)
    s().seek(3.9)
    expect(s().currentTick).toBe(3) // floored
    expect(s().status).toBe("paused")
  })

  it("seek ignores a non-finite value (NaN from a bad range onChange)", () => {
    s().start(graph, ramp)
    s().seek(5)
    s().seek(Number.NaN)
    expect(s().currentTick).toBe(5) // unchanged, never NaN
  })

  it("reset returns to idle, clears ticks, and restores default speed", () => {
    s().start(graph, ramp)
    s().setSpeed(10)
    s().reset()
    expect(s().status).toBe("idle")
    expect(s().ticks).toHaveLength(0)
    expect(s().currentTick).toBe(0)
    expect(s().isPlaying).toBe(false)
    expect(s().speed).toBe(1)
  })

  it("replay while running restarts from 0 without leaking a timer", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * 5)
    expect(s().currentTick).toBe(5)
    s().replay()
    expect(s().currentTick).toBe(0)
    expect(s().status).toBe("running")
    vi.advanceTimersByTime(SIM_BASE_TICK_MS)
    expect(s().currentTick).toBe(1) // single timer — advances by exactly 1, not 2
  })

  it("start while running discards the in-progress run and restarts from 0", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * 10)
    expect(s().currentTick).toBe(10)
    s().start(graph, ramp)
    expect(s().currentTick).toBe(0)
    expect(s().status).toBe("running")
    vi.advanceTimersByTime(SIM_BASE_TICK_MS)
    expect(s().currentTick).toBe(1) // exactly one active timer
  })

  it("pause is a no-op when not running; resume a no-op when not paused", () => {
    s().pause() // idle
    expect(s().status).toBe("idle")
    s().resume() // idle
    expect(s().status).toBe("idle")
  })

  it("getCurrentTickState returns the frame at currentTick (null when idle)", () => {
    expect(getCurrentTickState(s())).toBeNull()
    s().start(graph, ramp)
    s().seek(5)
    expect(getCurrentTickState(s())?.tick).toBe(5)
  })

  it("does not leak a timer after reaching done (no further state changes)", () => {
    s().start(graph, ramp)
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * (SIM_TICKS + 2))
    expect(s().status).toBe("done")
    const tickAtDone = s().currentTick
    vi.advanceTimersByTime(SIM_BASE_TICK_MS * 10)
    expect(s().currentTick).toBe(tickAtDone) // timer stopped, no drift
  })
})
