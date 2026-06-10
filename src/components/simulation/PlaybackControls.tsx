import { Play, Pause, RotateCcw, RefreshCw } from "lucide-react"
import { useSimulationStore, type PlaybackSpeed } from "@/stores/simulationStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { launchChallengeAttempt, launchSandboxRun } from "@/lib/simulationLaunch"

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10]

export function PlaybackControls() {
  const status = useSimulationStore((s) => s.status)
  const isPlaying = useSimulationStore((s) => s.isPlaying)
  const speed = useSimulationStore((s) => s.speed)
  const currentTick = useSimulationStore((s) => s.currentTick)
  const totalTicks = useSimulationStore((s) => s.ticks.length)
  const pause = useSimulationStore((s) => s.pause)
  const resume = useSimulationStore((s) => s.resume)
  const replay = useSimulationStore((s) => s.replay)
  const setSpeed = useSimulationStore((s) => s.setSpeed)
  const seek = useSimulationStore((s) => s.seek)
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)

  // P1/T6: RERUN re-simulates the LIVE canvas (and re-grades in challenge mode) — the gap that forced
  // "close the sim, click Start Challenge again" after every architecture tweak. Distinct from the
  // playback-only "Watch again". The challenge path re-arms the attempt first (selectChallenge →
  // building) so startAttempt's anti-double-score guard is honored.
  const onRerun = () => {
    if (activeChallenge) {
      selectChallenge(activeChallenge)
      launchChallengeAttempt(activeChallenge)
    } else {
      launchSandboxRun()
    }
  }

  const onPlayPause = () => {
    if (isPlaying) pause()
    else if (status === "done") replay()
    else resume()
  }

  const lastTick = Math.max(0, totalTicks - 1)

  return (
    <div data-testid="playback-controls" className="flex items-center gap-2">
      <button
        type="button"
        data-testid="playback-toggle"
        aria-label={isPlaying ? "Pause" : status === "done" ? "Replay" : "Play"}
        onClick={onPlayPause}
        className="flex h-6 w-6 items-center justify-center rounded text-text-primary hover:bg-surface"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : status === "done" ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        data-testid="playback-replay"
        aria-label="Watch the recorded run again"
        title="Watch the recorded run again (does not re-simulate)"
        onClick={() => replay()}
        className={`flex items-center gap-1 rounded text-text-secondary hover:bg-surface hover:text-text-primary ${status === "done" ? "px-1.5 py-0.5 text-[0.625rem] font-medium" : "h-6 w-6 justify-center"}`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {/* "Watch again" replays the RECORDED ticks; renamed from "Replay", which read as
            "re-run the simulation" and sent players hunting for a way to get re-graded. */}
        {status === "done" && <span>Watch again</span>}
      </button>
      {status === "done" && (
        <button
          type="button"
          data-testid="playback-rerun"
          aria-label="Rerun the simulation on the current architecture"
          title="Re-simulate the current canvas — in a quest this re-grades the attempt"
          onClick={onRerun}
          className="flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white hover:bg-emerald-500"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Rerun</span>
        </button>
      )}

      <input
        type="range"
        data-testid="playback-seek"
        aria-label="Seek"
        min={0}
        max={lastTick}
        value={currentTick}
        onChange={(e) => seek(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer accent-blue-500"
      />
      <span data-testid="playback-tick" className="w-12 text-right text-[0.625rem] tabular-nums text-text-secondary">
        {currentTick + 1}/{totalTicks}
      </span>

      <div className="flex items-center gap-0.5">
        {SPEEDS.map((sp) => (
          <button
            key={sp}
            type="button"
            data-testid={`playback-speed-${sp}`}
            aria-pressed={speed === sp}
            onClick={() => setSpeed(sp)}
            className={`rounded px-1 text-[0.625rem] font-semibold ${speed === sp ? "bg-blue-500 text-white" : "text-text-secondary hover:bg-surface"}`}
          >
            {sp}×
          </button>
        ))}
      </div>
    </div>
  )
}
