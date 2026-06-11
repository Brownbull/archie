import type { PortType } from "@/lib/constants"

/**
 * Link-visualization dimensions v1 (P5-S6, D95 — owner fork: ship scoped v1).
 *
 * Two dimensions join the existing kind-color dots:
 * - PROTOCOL → line style: each port type gets a distinct dash pattern in the DEFAULT canvas view.
 *   Heatmap mode keeps owning dasharray (solid/dashed/dotted = health — the colour-blind a11y cue)
 *   so the two encodings never collide; protocol style yields whenever health is on display.
 * - THROUGHPUT → particle speed: the more a link's downstream tier can swallow, the faster its
 *   dots travel ("if we have more, they should go faster"). Log-scaled — capacity spans 1k→10M rps.
 *
 * Glow/aura and the remaining dimensions are consciously deferred — see
 * docs/gabe/design/link-viz-dimensions.md (P5-S7).
 */

/** Per-protocol line styles for the default view. `undefined` = solid (http — the common case). */
export const PORT_DASHARRAYS: Record<PortType, string | undefined> = {
  http: undefined, // solid — the workhorse reads clean
  database: "8 4", // long dash
  cache: "2 3", // dotted
  stream: "12 4 2 4", // dash-dot
  monitor: "1 4", // sparse dots
  auth: "6 3 2 3", // dash-dot, tighter
  cdn: "10 6", // wide dash
}

/**
 * Particle-speed multiplier from the link's downstream capacity (effective maxRPS).
 * 1k rps → ~0.7× · 10k → ~1.0× · 100k → ~1.3× · 1M+ → up to 1.8×. Unknown/zero capacity → 1
 * (neutral — never punish a link the model can't size).
 */
export function throughputSpeedFactor(maxRps: number | undefined): number {
  if (!maxRps || maxRps <= 0 || !Number.isFinite(maxRps)) return 1
  const factor = 0.7 + 0.3 * Math.log10(maxRps / 1000)
  return Math.min(1.8, Math.max(0.6, factor))
}
