import type { TickState } from "@/lib/simulationTypes"

interface SimulationTimelineProps {
  ticks: TickState[]
  currentTick: number
}

/**
 * Hand-rolled SVG timeline (Epic 15, D24 — no charting dependency).
 * Stacked per-tick columns: served (green) + failed (red), scaled to peak RPS, with a
 * playhead at the current tick. viewBox + preserveAspectRatio="none" stretches to the container.
 */
export function SimulationTimeline({ ticks, currentTick }: SimulationTimelineProps) {
  if (ticks.length === 0) return null
  const n = ticks.length
  const H = 100
  const maxRps = Math.max(
    1,
    ...ticks.map((t) => Math.max(t.targetRps, t.totalServedRps + t.totalFailedRps)),
  )

  return (
    <svg
      data-testid="sim-timeline"
      viewBox={`0 0 ${n} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label="Requests over time — served vs failed"
    >
      {ticks.map((t, i) => {
        const served = (t.totalServedRps / maxRps) * H
        const failed = (t.totalFailedRps / maxRps) * H
        return (
          <g key={i}>
            <rect x={i} y={H - served} width={1.02} height={served} className="fill-green-500/70" />
            <rect x={i} y={H - served - failed} width={1.02} height={failed} className="fill-red-500/70" />
          </g>
        )
      })}
      <line
        data-testid="sim-timeline-playhead"
        x1={currentTick + 0.5}
        x2={currentTick + 0.5}
        y1={0}
        y2={H}
        className="stroke-white/70"
        strokeWidth={0.4}
      />
    </svg>
  )
}
