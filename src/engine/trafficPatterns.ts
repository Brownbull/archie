import type { TrafficCurve } from "@/lib/simulationTypes"

/**
 * How a traffic source's load varies over the simulation timeline. The source's rate (tier ×
 * stepper) sets the AVERAGE; the pattern shapes the curve around it:
 *  - steady   — constant at the average (the default ramp is handled by the caller).
 *  - wobble   — organic Gaussian variation (±~15%) so the load isn't a flat line.
 *  - periodic — repeating peaks (~3× the average) — e.g. daily rush hours.
 *  - surge    — one sustained rush (~5× the average) over a window — e.g. a Black Friday sale.
 *  - search   — frequent sharp narrow spikes (~4× the average) — e.g. bursty search/query traffic.
 *
 * `TrafficPattern` is the INTERNAL curve-shape vocabulary (keeps `wobble`/`surge` for migration).
 * The player-facing axis is `TrafficKind` (steady/realistic/periodic/search) — see `kindToPattern`.
 */
export type TrafficPattern = "steady" | "wobble" | "periodic" | "surge" | "search"

export const TRAFFIC_PATTERNS: readonly { id: TrafficPattern; label: string; hint: string }[] = [
  { id: "steady", label: "Steady", hint: "Constant load at the set rate" },
  { id: "wobble", label: "Realistic", hint: "Organic ±15% variation around the average" },
  { id: "periodic", label: "Periodic", hint: "Repeating peaks up to ~3× the average (rush hours)" },
  { id: "surge", label: "Surge", hint: "One sustained ~5× rush over a window (e.g. Black Friday)" },
]

/**
 * Player-facing traffic SHAPE (ISAPivot). Distinct from `workload` (read/write/mixed). `realistic`
 * is the renamed `wobble` curve; `search` is the new sharp-narrow-repeated-spike shape. `surge`
 * stays internal (not a kind) so existing curves built with it still render.
 */
export type TrafficKind = "steady" | "realistic" | "periodic" | "search"

export const TRAFFIC_KINDS: readonly { id: TrafficKind; label: string; hint: string }[] = [
  { id: "steady", label: "Steady", hint: "Constant load at the set rate" },
  { id: "realistic", label: "Realistic", hint: "Organic ±15% variation around the average" },
  { id: "periodic", label: "Periodic", hint: "Repeating peaks up to ~3× the average (rush hours)" },
  { id: "search", label: "Search / bursty", hint: "Frequent sharp narrow spikes up to ~4× the average" },
]

/** Map a player-facing `TrafficKind` to the internal curve-shape `TrafficPattern`. */
export function kindToPattern(kind: TrafficKind): TrafficPattern {
  switch (kind) {
    case "realistic":
      return "wobble"
    case "periodic":
      return "periodic"
    case "search":
      return "search"
    case "steady":
    default:
      return "steady"
  }
}

// Preset shape parameters (the "presets" scope — no per-spike custom config yet).
const WOBBLE_SIGMA = 0.15 // std-dev as a fraction of the average
const PERIODIC_PEAK = 3 // ×average at the top of each spike
const PERIODIC_CYCLES = 4 // number of spikes across the run
const SURGE_PEAK = 5 // ×average at the height of the surge
const SURGE_START = 0.35 // surge window start (fraction of the timeline)
const SURGE_END = 0.7 // surge window end
const SEARCH_PEAK = 4 // ×average at the top of each search spike
const SEARCH_CYCLES = 8 // spikes across the run (denser than periodic)
const SEARCH_SHARPNESS = 6 // sin^n — higher = narrower, sharper spikes
const CURVE_POINTS = 48 // sample resolution

/** Deterministic PRNG (mulberry32) — the sim must be reproducible, so no Math.random. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard-normal sample via Box-Muller, driven by the seeded PRNG. */
function nextGaussian(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Build a `[{t, rps}]` curve over `durationS` for the given pattern, centered on `baseRps`.
 * Deterministic for a given (pattern, baseRps, durationS, seed) — wobble uses a seeded PRNG so the
 * same inputs always produce the same curve (the sim's determinism contract).
 */
export function buildPatternCurve(
  pattern: TrafficPattern,
  baseRps: number,
  durationS: number,
  points: number = CURVE_POINTS,
  seed = 1,
): TrafficCurve {
  const n = Math.max(2, Math.floor(points))
  const rand = mulberry32(seed)
  const out: TrafficCurve = []
  for (let i = 0; i < n; i++) {
    const frac = i / (n - 1)
    const t = Math.round(frac * durationS)
    let rps = baseRps
    switch (pattern) {
      case "wobble":
        rps = baseRps * (1 + nextGaussian(rand) * WOBBLE_SIGMA)
        break
      case "periodic": {
        const s = Math.max(0, Math.sin(2 * Math.PI * PERIODIC_CYCLES * frac))
        rps = baseRps * (1 + (PERIODIC_PEAK - 1) * s)
        break
      }
      case "surge": {
        if (frac >= SURGE_START && frac <= SURGE_END) {
          const w = (frac - SURGE_START) / (SURGE_END - SURGE_START) // 0..1 across the window
          const bump = Math.sin(Math.PI * w) // smooth 0 → 1 → 0
          rps = baseRps * (1 + (SURGE_PEAK - 1) * bump)
        }
        break
      }
      case "search": {
        // Dense, sharp spikes: a high power of sin narrows each peak to a brief burst.
        const s = Math.pow(Math.max(0, Math.sin(2 * Math.PI * SEARCH_CYCLES * frac)), SEARCH_SHARPNESS)
        rps = baseRps * (1 + (SEARCH_PEAK - 1) * s)
        break
      }
      case "steady":
      default:
        rps = baseRps
    }
    out.push({ t, rps: Math.max(0, Math.round(rps)) })
  }
  return out
}
