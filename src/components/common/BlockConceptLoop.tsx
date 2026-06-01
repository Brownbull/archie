import { memo, type CSSProperties, type ReactNode } from "react"
import { usePreferencesStore } from "@/stores/preferencesStore"

/**
 * BlockConceptLoop — a tiny "miniblock with dots moving inside" that emulates what each
 * fundamental component TYPE *does* (a load balancer fans out, a queue releases FIFO, a cache
 * darts out-and-back…). Pure SVG + CSS keyframe loops (see `bl-*` rules in index.css): crisp at
 * any size, themeable via `color` (everything inherits currentColor), and a few hundred bytes —
 * no binary assets. Loops forever like a gif. Honors the app's animations preference and the OS
 * `prefers-reduced-motion` setting; when motion is off it renders a calm static frame.
 */
type LoopSize = "sm" | "md" | "lg"

function heightFor(size: LoopSize): number {
  switch (size) {
    case "sm":
      return 18
    case "md":
      return 28
    case "lg":
      return 44
  }
}

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` })

/** Per-type dot choreography. Each returns SVG children animated by the `bl-*` CSS classes. */
function loopContent(typeId: string): ReactNode {
  switch (typeId) {
    case "compute":
      return (
        <>
          <circle cx="8" cy="14" r="2" className="bl-dot bl-flow" />
          <circle cx="8" cy="14" r="2" className="bl-dot bl-flow" style={delay(0.55)} />
          <circle cx="8" cy="14" r="2" className="bl-dot bl-flow" style={delay(1.1)} />
        </>
      )
    case "load-balancer":
      return (
        <>
          <circle cx="10" cy="14" r="1.6" className="bl-edge-node" />
          <circle cx="10" cy="14" r="2" className="bl-dot bl-fan-top" />
          <circle cx="10" cy="14" r="2" className="bl-dot bl-fan-mid" style={delay(0.25)} />
          <circle cx="10" cy="14" r="2" className="bl-dot bl-fan-bot" style={delay(0.5)} />
        </>
      )
    case "cache":
      return (
        <>
          <rect x="6" y="10" width="4" height="8" rx="1" className="bl-store" />
          <circle cx="12" cy="14" r="2" className="bl-dot bl-bounce" />
          <circle cx="12" cy="14" r="2" className="bl-dot bl-bounce" style={delay(0.45)} />
        </>
      )
    case "cdn":
      return (
        <>
          <circle cx="24" cy="14" r="1.8" className="bl-edge-node" />
          <circle cx="24" cy="14" r="1.8" className="bl-dot bl-rad-ne" />
          <circle cx="24" cy="14" r="1.8" className="bl-dot bl-rad-nw" style={delay(0.2)} />
          <circle cx="24" cy="14" r="1.8" className="bl-dot bl-rad-se" style={delay(0.4)} />
          <circle cx="24" cy="14" r="1.8" className="bl-dot bl-rad-sw" style={delay(0.6)} />
        </>
      )
    case "message-queue":
      return (
        <>
          <line x1="9" y1="7.5" x2="9" y2="20.5" className="bl-gate" />
          <circle cx="16" cy="14" r="2" className="bl-dot bl-queue" />
          <circle cx="16" cy="14" r="2" className="bl-dot bl-queue" style={delay(0.6)} />
          <circle cx="16" cy="14" r="2" className="bl-dot bl-queue" style={delay(1.2)} />
        </>
      )
    case "event-stream":
      return (
        <>
          <line x1="18" y1="6.5" x2="18" y2="21.5" className="bl-partition" />
          <line x1="30" y1="6.5" x2="30" y2="21.5" className="bl-partition" />
          <circle cx="8" cy="14" r="1.7" className="bl-dot bl-stream" />
          <circle cx="8" cy="14" r="1.7" className="bl-dot bl-stream" style={delay(0.3)} />
          <circle cx="8" cy="14" r="1.7" className="bl-dot bl-stream" style={delay(0.6)} />
          <circle cx="8" cy="14" r="1.7" className="bl-dot bl-stream" style={delay(0.9)} />
        </>
      )
    case "realtime":
      return (
        <>
          <circle cx="8" cy="10" r="2" className="bl-dot bl-flow" />
          <circle cx="38" cy="18" r="2" className="bl-dot bl-flow-rev" />
        </>
      )
    case "relational-db":
      return (
        <>
          <line x1="9" y1="8.5" x2="39" y2="8.5" className="bl-row" />
          <line x1="9" y1="14" x2="39" y2="14" className="bl-row" />
          <line x1="9" y1="19.5" x2="39" y2="19.5" className="bl-row" />
          <circle cx="8" cy="8.5" r="1.8" className="bl-dot bl-scan" />
        </>
      )
    case "graph-db":
      return (
        <>
          <line x1="12" y1="9" x2="30" y2="20" className="bl-edge" />
          <line x1="30" y1="20" x2="37" y2="10" className="bl-edge" />
          <line x1="12" y1="9" x2="37" y2="10" className="bl-edge" />
          <circle cx="12" cy="9" r="2" className="bl-vertex" />
          <circle cx="30" cy="20" r="2" className="bl-vertex" />
          <circle cx="37" cy="10" r="2" className="bl-vertex" />
          <circle cx="12" cy="9" r="2" className="bl-dot bl-traverse" />
        </>
      )
    case "vector-store":
      return (
        <>
          <circle cx="24" cy="14" r="2.2" className="bl-query" />
          <circle cx="14" cy="9" r="1.6" className="bl-neighbor" />
          <circle cx="34" cy="19" r="1.6" className="bl-neighbor" />
          <circle cx="16" cy="20" r="1.6" className="bl-neighbor bl-pulse" />
          <circle cx="33" cy="9" r="1.6" className="bl-neighbor bl-pulse" style={delay(0.4)} />
        </>
      )
    case "object-storage":
      return (
        <>
          <path d="M14 17 h20 l-2 5 h-16 z" className="bl-bucket" />
          <circle cx="20" cy="14" r="2" className="bl-dot bl-drop" />
          <circle cx="24" cy="14" r="2" className="bl-dot bl-drop" style={delay(0.5)} />
          <circle cx="28" cy="14" r="2" className="bl-dot bl-drop" style={delay(1.0)} />
        </>
      )
    case "serverless":
      return (
        <>
          <circle cx="15" cy="11" r="2.2" className="bl-dot bl-pop" />
          <circle cx="26" cy="17" r="2.2" className="bl-dot bl-pop" style={delay(0.6)} />
          <circle cx="34" cy="10" r="2.2" className="bl-dot bl-pop" style={delay(1.2)} />
        </>
      )
    case "llm-gateway":
      return (
        <>
          <circle cx="22" cy="14" r="4" className="bl-pulse-ring" />
          <circle cx="8" cy="14" r="1.8" className="bl-dot bl-flow-in" />
          <circle cx="28" cy="14" r="1.5" className="bl-dot bl-token" style={delay(0.4)} />
          <circle cx="28" cy="14" r="1.5" className="bl-dot bl-token" style={delay(0.7)} />
          <circle cx="28" cy="14" r="1.5" className="bl-dot bl-token" style={delay(1.0)} />
        </>
      )
    case "payments":
      return (
        <>
          <circle cx="10" cy="14" r="2" className="bl-dot bl-rt" />
          <path d="M33 13.5 l1.6 1.8 l3-3.6" className="bl-check" />
        </>
      )
    case "etl":
      return (
        <>
          <line x1="16" y1="10" x2="16" y2="18" className="bl-stage" />
          <line x1="24" y1="10" x2="24" y2="18" className="bl-stage" />
          <line x1="32" y1="10" x2="32" y2="18" className="bl-stage" />
          <circle cx="8" cy="14" r="2.2" className="bl-etl" />
        </>
      )
    case "observability":
      return (
        <>
          <line x1="8" y1="14" x2="40" y2="14" className="bl-baseline" />
          <circle cx="8" cy="14" r="2" className="bl-dot bl-beat" />
        </>
      )
    case "security":
      return (
        <>
          <line x1="26" y1="6.5" x2="26" y2="21.5" className="bl-gate" />
          <circle cx="8" cy="10" r="2" className="bl-pass" />
          <circle cx="8" cy="18" r="2" className="bl-block" />
        </>
      )
    case "dns":
      // Query darts out to a resolver and the answer returns (round-trip lookup).
      return (
        <>
          <circle cx="38" cy="14" r="1.8" className="bl-edge-node" />
          <circle cx="10" cy="14" r="2" className="bl-dot bl-rt" />
        </>
      )
    case "api-gateway":
      // Requests pass a policy gate, then fan out to backend routes.
      return (
        <>
          <line x1="19" y1="7.5" x2="19" y2="20.5" className="bl-gate" />
          <circle cx="10" cy="14" r="2" className="bl-dot bl-fan-top" />
          <circle cx="10" cy="14" r="2" className="bl-dot bl-fan-mid" style={delay(0.2)} />
          <circle cx="10" cy="14" r="2" className="bl-dot bl-fan-bot" style={delay(0.4)} />
        </>
      )
    case "nosql":
      // Documents drop into flexible-schema document boxes (no fixed rows).
      return (
        <>
          <rect x="13" y="16" width="6" height="7" rx="1" className="bl-doc" />
          <rect x="21" y="16" width="6" height="7" rx="1" className="bl-doc" />
          <rect x="29" y="16" width="6" height="7" rx="1" className="bl-doc" />
          <circle cx="18" cy="12" r="2" className="bl-dot bl-drop" />
          <circle cx="26" cy="12" r="2" className="bl-dot bl-drop" style={delay(0.7)} />
        </>
      )
    case "search-engine":
      // A query sweeps across; matching results light up.
      return (
        <>
          <circle cx="16" cy="9" r="1.6" className="bl-neighbor" />
          <circle cx="30" cy="18" r="1.6" className="bl-neighbor bl-pulse" />
          <circle cx="34" cy="10" r="1.6" className="bl-neighbor bl-pulse" style={delay(0.4)} />
          <circle cx="8" cy="14" r="2" className="bl-dot bl-flow" />
        </>
      )
    case "time-series-db":
      // Points plot upward along a timeline (a rising metric series).
      return (
        <>
          <line x1="8" y1="21" x2="40" y2="21" className="bl-baseline" />
          <circle cx="8" cy="21" r="1.8" className="bl-dot bl-fan-top" />
          <circle cx="8" cy="21" r="1.8" className="bl-dot bl-fan-top" style={delay(0.5)} />
          <circle cx="8" cy="21" r="1.8" className="bl-dot bl-fan-top" style={delay(1.0)} />
        </>
      )
    case "worker":
      // Jobs are pulled in and chewed through by a processing worker (pulse).
      return (
        <>
          <circle cx="27" cy="14" r="4" className="bl-pulse-ring" />
          <circle cx="8" cy="14" r="1.8" className="bl-dot bl-flow-in" />
          <circle cx="8" cy="14" r="1.8" className="bl-dot bl-flow-in" style={delay(0.7)} />
        </>
      )
    case "stream-processor":
      // A continuous stream is transformed mid-flight (colour shifts at the stage).
      return (
        <>
          <line x1="24" y1="9" x2="24" y2="19" className="bl-stage" />
          <circle cx="8" cy="14" r="2" className="bl-etl" />
          <circle cx="8" cy="14" r="2" className="bl-etl" style={delay(0.9)} />
        </>
      )
    case "auth":
      // A request hits an identity check (lock pulse) and is let through (green).
      return (
        <>
          <circle cx="24" cy="14" r="3.5" className="bl-pulse-ring" />
          <circle cx="8" cy="14" r="2" className="bl-pass" />
        </>
      )
    case "rate-limiter":
      // Requests metered through a gate one at a time; excess is throttled (bounces).
      return (
        <>
          <line x1="26" y1="7.5" x2="26" y2="20.5" className="bl-gate" />
          <circle cx="14" cy="11" r="1.8" className="bl-dot bl-queue" />
          <circle cx="14" cy="11" r="1.8" className="bl-dot bl-queue" style={delay(0.6)} />
          <circle cx="8" cy="18" r="2" className="bl-block" />
        </>
      )
    default:
      // Generic "data flowing through a block" for any type without a bespoke loop.
      return (
        <>
          <circle cx="8" cy="14" r="2" className="bl-dot bl-flow" />
          <circle cx="8" cy="14" r="2" className="bl-dot bl-flow" style={delay(0.7)} />
        </>
      )
  }
}

interface BlockConceptLoopProps {
  /** Fundamental component type id (e.g. "compute", "cache"). Unknown ids get a generic loop. */
  typeId: string
  size?: LoopSize
  /** Themes the whole loop (frame + dots inherit currentColor). Defaults to currentColor. */
  color?: string
  /** Force motion on/off. When omitted, follows the app's animations preference. */
  animate?: boolean
  className?: string
  title?: string
}

function BlockConceptLoopBase({
  typeId,
  size = "md",
  color = "currentColor",
  animate,
  className = "",
  title,
}: BlockConceptLoopProps) {
  const prefAnimate = usePreferencesStore((s) => s.animationsEnabled)
  const motionOn = animate ?? prefAnimate
  const h = heightFor(size)
  const w = Math.round((h * 48) / 28)
  return (
    <svg
      data-testid={`block-loop-${typeId}`}
      data-animate={motionOn || undefined}
      width={w}
      height={h}
      viewBox="0 0 48 28"
      className={`block-loop ${motionOn ? "" : "block-loop--static"} ${className}`}
      style={{ color }}
      role="img"
      aria-label={title ?? `${typeId} concept animation`}
      focusable={false}
    >
      <rect x="2.5" y="3.5" width="43" height="21" rx="4" className="bl-frame" />
      {loopContent(typeId)}
    </svg>
  )
}

export const BlockConceptLoop = memo(BlockConceptLoopBase)
