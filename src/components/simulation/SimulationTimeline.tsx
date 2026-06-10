import type { TickState, TickEventState } from "@/lib/simulationTypes"

interface SimulationTimelineProps {
  ticks: TickState[]
  currentTick: number
}

const EVENT_LABEL: Record<TickEventState["type"], string> = {
  component_failure: "failure",
  az_outage: "zone outage",
  latency_spike: "latency spike",
}

/** Human-readable marker tooltip: "data-storage failure — detected, blast contained". */
function eventTitle(events: TickEventState[]): string {
  return events
    .map((e) => `${e.target} ${EVENT_LABEL[e.type]}${e.detected ? " — detected, blast contained" : ""}`)
    .join(" · ")
}

/**
 * Hand-rolled SVG timeline (Epic 15, D24 — no charting dependency).
 * Stacked per-tick columns: served (green) + failed (red), scaled to peak RPS, with a
 * playhead at the current tick. viewBox + preserveAspectRatio="none" stretches to the container.
 * S8 (D89): ticks with active scheduled events get a marker band along the top — red while the
 * failure is undetected, amber once monitoring detects it (the Observe-to-Recover moment made
 * visible). In-SVG text would distort under preserveAspectRatio="none", so the band + a native
 * <title> tooltip carry the annotation.
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
      aria-label="Requests over time — served vs failed; event markers flag failures and their detection"
    >
      {ticks.map((t, i) => {
        const served = (t.totalServedRps / maxRps) * H
        const failed = (t.totalFailedRps / maxRps) * H
        return (
          <g key={i}>
            <rect x={i} y={H - served} width={1.02} height={served} className="fill-green-500/70" />
            <rect x={i} y={H - served - failed} width={1.02} height={failed} className="fill-red-500/70" />
            {t.events && t.events.length > 0 && (
              <rect
                data-testid={`sim-event-marker-${i}`}
                data-detected={t.events.some((e) => e.detected) || undefined}
                x={i}
                y={0}
                width={1.02}
                height={6}
                className={t.events.some((e) => e.detected) ? "fill-amber-400/80" : "fill-red-500/90"}
              >
                <title>{eventTitle(t.events)}</title>
              </rect>
            )}
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
