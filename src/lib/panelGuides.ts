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
      { text: "Pick the exact vendor and tier on the block itself, right on the canvas — the inspector on the right is read-only learning." },
      { text: "Stacks add a few wired-together blocks; Blueprints replace the canvas with a full starter design.", minLevel: "intermediate" },
      { text: "Your experience level controls how many block types show — raise it (top bar) to reveal more, or open the 'More advanced blocks' drawer.", minLevel: "intermediate" },
      { text: "Search matches by concept too (\"cache\", \"queue\") and shows every block regardless of level.", minLevel: "advanced" },
    ],
    tour: [
      { title: "Your palette", body: "Every building block lives in this panel. Drag one onto the canvas, or click its + button — you pick the exact vendor afterward.", selector: '[data-testid="toolbox-panel"]' },
      { title: "Search by concept", body: "Search by name OR by what it does — \"cache\", \"queue\", \"lb\" all find the right block, even if the vendor name doesn't match. Search also ignores your level and shows everything.", selector: '[data-testid="search-filter"]' },
      { title: "Blocks tab", body: "Single building blocks, grouped by category. This is where you build piece by piece.", selector: '[data-testid="toolbox-tab-components"]' },
      { title: "Stacks tab", body: "Ready-made patterns — a Stack drops a few already-wired blocks onto your canvas.", selector: '[data-testid="toolbox-tab-stacks"]' },
      { title: "Blueprints tab", body: "Complete starter architectures — loading a Blueprint REPLACES the whole canvas.", selector: '[data-testid="toolbox-tab-blueprints"]' },
      { title: "History tab", body: "Your past challenge attempts and their scores.", selector: '[data-testid="toolbox-tab-history"]' },
      { title: "More advanced blocks", body: "Blocks above your experience level are tucked in here. Raise your level (top bar) to surface them, or open this drawer to peek.", selector: '[data-testid="advanced-blocks-toggle"]' },
    ],
  },
  {
    id: "inspector",
    title: "Block details",
    summary: "Read-only learning for the selected block — what it is, its trade-offs, metrics and cost. Tune the vendor, tier and replicas on the block itself.",
    points: [
      { text: "Tune the vendor, tier and replicas on the block in the canvas — this panel explains the block, and the cost · throughput · latency here update live as you change it." },
      { text: "Gains, costs and the full metric breakdown sit in the collapsible sections lower down.", minLevel: "intermediate" },
      { text: "The code example and per-metric deltas (before → after a change) help compare options precisely.", minLevel: "advanced" },
    ],
    tour: [
      { title: "Block details", body: "Everything about the selected block lives in this panel — it's for understanding the block. Let's walk through it top to bottom.", selector: '[data-testid="inspector-heading"]' },
      { title: "The heading", body: "The title is the block's name/logical TYPE (Database, Cache, Load Balancer).", selector: '[data-testid="inspector-heading"]' },
      { title: "Tune on the block", body: "Vendor, configuration tier and replicas are tuned on the block ITSELF, out on the canvas — not here. This panel stays read-only so you can focus on learning. (Tuning controls disclose as quests get harder.)", selector: '[data-testid="archie-node-provider"]' },
      { title: "Vendor · tier · cost", body: "The identity rows show the chosen vendor, its tier, and the monthly cost. Throughput and latency are in the Economics section just below.", selector: '[data-testid="inspector-summary-cost"]' },
      { title: "Economics", body: "Cost, throughput and latency together — and when you change vendor or tier on the block, it shows the before → after delta so you can compare.", selector: '[data-testid="economics-section"]' },
      { title: "What it is", body: "A fuller plain-language description of what this block does and when to reach for it.", selector: '[data-testid="disclosure-is"]' },
      { title: "Gains", body: "What you get by using this block — its strengths.", selector: '[data-testid="disclosure-gains"]' },
      { title: "Costs", body: "The trade-offs — what this block costs you in complexity, money or other axes.", selector: '[data-testid="disclosure-costs"]' },
      { title: "Recommendations", body: "When a metric is weak, this suggests a tier that would improve it. (Shown when there's something to recommend.)", selector: '[data-testid="recommendations-section"]' },
      { title: "Code example", body: "A copy-paste snippet showing roughly how you'd wire up the chosen vendor. (Advanced level.)", selector: '[data-testid="disclosure-code"]' },
      { title: "Metrics", body: "The full metric breakdown by category, with a filter to focus on what you care about. (Advanced level.)", selector: '[data-testid="disclosure-metrics"]' },
      { title: "Data context", body: "How well this block fits your workload's data profile — volume, access pattern, consistency. (Advanced level.)", selector: '[data-testid="data-context-section-trigger"]' },
      { title: "Remove", body: "Drop the block from the canvas with the trash icon when you no longer need it.", selector: '[data-testid="inspector-remove-node"]' },
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
      { title: "Your live scores", body: "The top of this panel scores your architecture across five categories — Performance, Reliability, Scale, Ops, Cost. They recompute every time you change the design.", selector: '[data-testid="dashboard-overlay"]' },
      { title: "Priority Weights", body: "Tell the scorer what matters most — drag a slider up and the overall score re-weights toward it (e.g. favour cost over raw speed). (Intermediate level.)", selector: '[data-testid="weight-sliders-toggle"]' },
      { title: "Constraint Guardrails", body: "Define rules — a budget cap, single-region, etc. — and this flags any design that breaks them, with a count of violations. (Advanced level.)", selector: '[data-testid="constraint-guardrails-toggle"]' },
      { title: "Pathway Guidance", body: "The highest-impact block to add next for your current goals, ranked. The number badge is how many suggestions are waiting.", selector: '[data-testid="pathway-guidance-toggle"]' },
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
      { title: "Your tier", body: "A quick read on how mature your architecture is — it rises as you cover more concerns (caching, redundancy, observability, …).", selector: '[data-testid="tier-badge"]' },
      { title: "Progress through the tiers", body: "The N/total shows how far along you are. (Shown at intermediate+ — beginners just see the tier name.)", selector: '[data-testid="tier-fraction"]' },
      { title: "See what's next", body: "Click the badge to expand it — it lists exactly what the next tier requires, and links to suggestions for getting there.", selector: '[data-testid="tier-badge"]' },
    ],
  },
]

/**
 * Fluidity P3: the bespoke cross-region "full journey" — one curated walkthrough from picking blocks
 * to reading the score, launchable from Settings ("Take the full tour"). The launcher filters steps to
 * those whose anchor is on screen, so it's tier-aware: locked on-block tuning + an unselected inspector
 * are skipped automatically, and a beginner sees a shorter lap than an advanced player.
 */
export const FULL_JOURNEY: TourStep[] = [
  { title: "The full tour", body: "A quick guided lap of Archie — from picking blocks to reading your score. Anything you haven't unlocked or opened yet is skipped automatically." },
  { title: "1 · Pick your blocks", body: "Everything starts here. Drag a building block onto the canvas, or click its +. Each block is a TYPE — you choose the exact vendor on the block itself.", selector: '[data-testid="toolbox"]' },
  { title: "2 · Build on the canvas", body: "Drop blocks here and wire them together by dragging from a block's side handles. This is your architecture.", selector: '[data-testid="canvas"]' },
  { title: "3 · Tune on the block", body: "Tune each block right here — vendor, configuration tier, replicas. In quests these reveal as you progress; in free mode they're all available.", selector: '[data-testid="archie-node-provider"]' },
  { title: "4 · Learn in the right panel", body: "Select a block and this panel explains it — what it is, its trade-offs, metrics and cost. It's read-only: tuning stays on the block.", selector: '[data-testid="inspector-panel"]' },
  { title: "5 · Stress-test it", body: "Inject a failure here, then run the simulation to see how your design holds up. Demand itself is set on the traffic-source block.", selector: '[data-testid="test-conditions"]' },
  { title: "6 · Read your score", body: "The bottom bar scores your architecture live — tier, budget, and your weakest category. Open it for the full per-category breakdown.", selector: '[data-testid="dashboard"]' },
  { title: "7 · Climb the tiers", body: "Your architecture maturity tier rises as you cover more concerns. Click it to see what the next tier needs.", selector: '[data-testid="tier-badge"]' },
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
