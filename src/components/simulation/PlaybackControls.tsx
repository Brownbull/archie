import { Play, Pause, RotateCcw } from "lucide-react"
import { useSimulationStore, type PlaybackSpeed } from "@/stores/simulationStore"

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
        aria-label="Replay from start"
        onClick={() => replay()}
        className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>

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
