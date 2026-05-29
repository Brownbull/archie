import { create } from "zustand"
import { runSimulation } from "@/engine/simulationEngine"
import { SIM_BASE_TICK_MS } from "@/lib/constants"
import type { SimGraph, TrafficCurve, TickState, ScheduledEvent } from "@/lib/simulationTypes"

export type SimulationStatus = "idle" | "running" | "paused" | "done"
export type PlaybackSpeed = 1 | 2 | 5 | 10

interface SimulationState {
  status: SimulationStatus
  ticks: TickState[]
  currentTick: number
  isPlaying: boolean
  speed: PlaybackSpeed
  entryNodeIds: string[]
  /**
   * Start a simulation: runs the engine over the graph + curve, then plays back tick-by-tick.
   * Calling start() while a run is active discards it and restarts from tick 0 (intentional re-run).
   */
  start: (graph: SimGraph, curve: TrafficCurve, scheduledEvents?: ScheduledEvent[]) => void
  pause: () => void
  resume: () => void
  /** Restart playback from tick 0 using the already-computed ticks. */
  replay: () => void
  setSpeed: (speed: PlaybackSpeed) => void
  /** Jump to a tick (clamped); does not change play/pause state. */
  seek: (tick: number) => void
  /** Clear all simulation state back to idle. */
  reset: () => void
}

// Module-level playback timer (kept out of state — not serializable, single active run).
let playbackTimer: ReturnType<typeof setInterval> | null = null

function stopTimer(): void {
  if (playbackTimer !== null) {
    clearInterval(playbackTimer)
    playbackTimer = null
  }
}

export const useSimulationStore = create<SimulationState>((set, get) => {
  function startTimer(): void {
    stopTimer()
    const intervalMs = SIM_BASE_TICK_MS / get().speed
    playbackTimer = setInterval(() => {
      const { currentTick, ticks } = get()
      if (currentTick >= ticks.length - 1) {
        stopTimer()
        set({ status: "done", isPlaying: false })
        return
      }
      set({ currentTick: currentTick + 1 })
    }, intervalMs)
  }

  return {
    status: "idle",
    ticks: [],
    currentTick: 0,
    isPlaying: false,
    speed: 1,
    entryNodeIds: [],

    start: (graph, curve, scheduledEvents) => {
      const result = runSimulation(graph, curve, undefined, undefined, scheduledEvents)
      stopTimer()
      const hasPlayback = result.ticks.length > 1
      set({
        ticks: result.ticks,
        entryNodeIds: result.entryNodeIds,
        currentTick: 0,
        status: hasPlayback ? "running" : "done",
        isPlaying: hasPlayback,
      })
      if (hasPlayback) startTimer()
    },

    pause: () => {
      if (get().status !== "running") return
      stopTimer()
      set({ isPlaying: false, status: "paused" })
    },

    resume: () => {
      if (get().status !== "paused") return
      set({ isPlaying: true, status: "running" })
      startTimer()
    },

    replay: () => {
      if (get().ticks.length === 0) return
      stopTimer()
      set({ currentTick: 0, status: "running", isPlaying: true })
      startTimer()
    },

    setSpeed: (speed) => {
      set({ speed })
      if (get().isPlaying) startTimer() // restart interval at the new rate
    },

    seek: (tick) => {
      if (!Number.isFinite(tick)) return // guard NaN/Infinity from a non-numeric range onChange
      const max = Math.max(0, get().ticks.length - 1)
      const clamped = Math.max(0, Math.min(max, Math.floor(tick)))
      set({ currentTick: clamped })
    },

    reset: () => {
      stopTimer()
      set({ status: "idle", ticks: [], currentTick: 0, isPlaying: false, speed: 1, entryNodeIds: [] })
    },
  }
})

/** Telemetry frame for the current tick (null when idle/no run). */
export function getCurrentTickState(state: SimulationState): TickState | null {
  return state.ticks[state.currentTick] ?? null
}

// Vite HMR: clear the module-level timer on hot-reload so an orphaned interval from the
// previous module instance doesn't keep firing against stale state during development.
if (import.meta.hot) {
  import.meta.hot.dispose(() => stopTimer())
}
