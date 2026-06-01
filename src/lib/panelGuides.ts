import { levelRank, type ExperienceLevel } from "@/lib/componentTypes"
import type { TourStep } from "@/components/onboarding/SpotlightTour"

/**
 * Per-panel guidance (P89/Phase B). Each guide powers a ⓘ explainer popover whose depth scales
 * with the user's experience level, plus an optional "walk me through it" focused spotlight tour.
 * A point with `minLevel` only shows at/above that level — beginners see the basics, advanced
 * users see the nuance — mirroring the block palette's progressive disclosure.
 */
export interface GuidePoint {
  text: string
  /** Lowest experience level at which this point shows. Defaults to beginner (always shown). */
  minLevel?: ExperienceLevel
}

export interface PanelGuide {
  id: string
  title: string
  /** One-line "what this is", always shown. */
  summary: string
  points: GuidePoint[]
  /** Optional anchored steps for the "Walk me through it" button. */
  tour?: TourStep[]
}

const GUIDES: PanelGuide[] = [
  {
    id: "toolbox",
    title: "Building blocks",
    summary: "The palette of components you drag onto the canvas to build your architecture.",
    points: [
      { text: "Drag a block onto the canvas (or press +). Each block is a TYPE — Cache, Database, Load Balancer." },
      { text: "Pick the exact vendor and tier later, in the inspector on the right." },
      { text: "Stacks add a few wired-together blocks; Blueprints replace the canvas with a full starter design.", minLevel: "intermediate" },
      { text: "Your experience level controls how many block types show — raise it (top bar) to reveal more, or open the 'More advanced blocks' drawer.", minLevel: "intermediate" },
      { text: "Search matches by concept too (\"cache\", \"queue\") and shows every block regardless of level.", minLevel: "advanced" },
    ],
    tour: [
      { title: "Your blocks live here", body: "Drag any block onto the canvas, or click its + button. Blocks are organised by category.", selector: '[data-testid="toolbox"]' },
      { title: "Blocks, Stacks, Blueprints", body: "Switch tabs: single Blocks, ready-made Stacks (added to your canvas), or full Blueprints (replace the canvas).", selector: '[data-testid="toolbox"]' },
    ],
  },
  {
    id: "inspector",
    title: "Block details",
    summary: "Inspect and tune the selected block — vendor, tier, replicas, cost and performance.",
    points: [
      { text: "Swap the vendor (e.g. Postgres → MySQL) and pick a configuration tier; cost, throughput and latency update live." },
      { text: "Set replicas with the −/＋ stepper to scale the block horizontally." },
      { text: "Gains, costs and the full metric breakdown sit in the collapsible sections lower down.", minLevel: "intermediate" },
      { text: "The code example and per-metric deltas (before → after a change) help compare options precisely.", minLevel: "advanced" },
    ],
    tour: [
      { title: "Block details", body: "Everything about the selected block lives here — swap its vendor, pick a tier, set replicas.", selector: '[data-testid="inspector-panel"]' },
      { title: "Cost · throughput · latency", body: "The summary line shows the three numbers that matter. They update the instant you change vendor or tier.", selector: '[data-testid="inspector-heading"]' },
    ],
  },
  {
    id: "optimize",
    title: "Optimize & scores",
    summary: "See how your architecture scores, set what you care about, and find what to improve.",
    points: [
      { text: "Each category bar (Performance, Reliability, Scale, Ops, Cost) scores your current design — higher is better." },
      { text: "Pathway Guidance suggests the highest-impact block to add next." },
      { text: "Priority Weights let you tell the scorer what matters most — drag a slider up and scores re-weight toward it.", minLevel: "intermediate" },
      { text: "Constraint Guardrails flag designs that break rules you set (e.g. budget, single-region).", minLevel: "advanced" },
    ],
    tour: [
      { title: "Your live scores", body: "These bars score the architecture across five categories. They recompute as you build.", selector: '[data-testid="dashboard-overlay"]' },
      { title: "Tell it what matters", body: "Drag Priority Weights to bias the score toward what you care about — cost, speed, reliability.", selector: '[data-testid="weight-sliders-toggle"]' },
      { title: "What to add next", body: "Pathway Guidance ranks the highest-impact block to add for your current goals.", selector: '[data-testid="pathway-guidance-toggle"]' },
    ],
  },
  {
    id: "tier",
    title: "Architecture tier",
    summary: "A rough maturity level for your design, from a bare prototype up to a hardened system.",
    points: [
      { text: "The tier rises as your architecture covers more concerns (caching, redundancy, observability…)." },
      { text: "Click it to see exactly what the next tier needs." },
      { text: "It's a guideline, not a grade — a simple design can be exactly right for its goal.", minLevel: "intermediate" },
    ],
    tour: [
      { title: "Your tier", body: "A quick read on how mature your design is. Click the badge to see what the next tier requires.", selector: '[data-testid="tier-badge"]' },
    ],
  },
]

// Map keeps the lookup clear of object-injection lint; unknown ids resolve to undefined.
const GUIDE_MAP = new Map<string, PanelGuide>(GUIDES.map((g) => [g.id, g]))

export function getPanelGuide(id: string): PanelGuide | undefined {
  return GUIDE_MAP.get(id)
}

/** Points visible at the given experience level (a point shows when its minLevel ≤ level). */
export function visiblePoints(guide: PanelGuide, level: ExperienceLevel): GuidePoint[] {
  return guide.points.filter((p) => levelRank(p.minLevel ?? "beginner") <= levelRank(level))
}
