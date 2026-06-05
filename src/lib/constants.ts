// Layout dimensions (UX1)
export const TOOLBAR_HEIGHT = 44
export const TOOLBOX_WIDTH = 260
export const INSPECTOR_DEFAULT_WIDTH = 300
export const INSPECTOR_EXPANDED_WIDTH = 500
export const INSPECTOR_MIN_WIDTH = 200
export const INSPECTOR_MAX_WIDTH = 700
export const INSPECTOR_COLLAPSED_WIDTH = 40
export const DASHBOARD_HEIGHT = 100
// Canvas node width. NODE_MIN_WIDTH (176 = 11× the 16px grid) is the grid-aligned floor that keeps
// placement/layout math consistent; NODE_MAX_WIDTH caps how far a node grows to fit its content
// (variable-width blocks, no truncation). NODE_WIDTH aliases the min so existing importers
// (drop-position math, layout spacing) keep using 176 as their spacing basis.
export const NODE_MIN_WIDTH = 176
export const NODE_MAX_WIDTH = 280
export const NODE_WIDTH = NODE_MIN_WIDTH
export const BORDER_RADIUS = 6

// Spacing scale (UX16 — 4px base)
export const SPACING_XS = 4
export const SPACING_SM = 8
export const SPACING_MD = 12
export const SPACING_LG = 16
export const SPACING_XL = 24

// File limits (NFR7)
export const MAX_FILE_SIZE = 1_048_576 // 1MB in bytes

// Economics disclaimer — values are AI-generated approximations, not real cloud pricing
export const ECONOMICS_DISCLAIMER = "Approximate values for educational comparison — not real cloud pricing"

// Schema string limits — defense-in-depth against memory exhaustion from malformed YAML (TD-5-1a, Story 9-0)
export const MAX_SCHEMA_STRING_LENGTH = 256

// Component categories (AC-ARCH-PATTERN-10)
export const COMPONENT_CATEGORIES = {
  compute: { label: "Compute", color: "var(--color-cat-compute)", iconName: "Cpu" },
  "data-storage": { label: "Data Storage", color: "var(--color-cat-data-storage)", iconName: "Database" },
  caching: { label: "Caching", color: "var(--color-cat-caching)", iconName: "Flame" },
  messaging: { label: "Messaging", color: "var(--color-cat-messaging)", iconName: "MessageSquare" },
  "delivery-network": { label: "Delivery/Network", color: "var(--color-cat-delivery)", iconName: "Globe" },
  "real-time": { label: "Real-Time", color: "var(--color-cat-realtime)", iconName: "Radio" },
  "auth-security": { label: "Auth/Security", color: "var(--color-cat-auth)", iconName: "Shield" },
  monitoring: { label: "Monitoring", color: "var(--color-cat-monitoring)", iconName: "Activity" },
  search: { label: "Search", color: "var(--color-cat-search)", iconName: "Search" },
  devops: { label: "DevOps", color: "var(--color-cat-devops)", iconName: "Settings" },
  // Traffic sources (Users / API clients / sensors) — the explicit ORIGIN of request load.
  traffic: { label: "Traffic", color: "var(--color-cat-traffic)", iconName: "Users" },
} as const

export type ComponentCategoryId = keyof typeof COMPONENT_CATEGORIES

// Horizontal scaling rules per component category (Epic 14: Replicas & Horizontal Scaling)
// - scalable: component supports a replica count > 1
// - replicaType: 'full' = stateless linear scaling; 'read-only' = read-replica scaling (e.g. SQL); 'none' = singleton
// - requiresUpstreamLB: replicas > 1 need a load balancer upstream (else topology warning)
// - actsAsLoadBalancer: this category can serve as the upstream LB that satisfies requiresUpstreamLB
export type ReplicaType = "full" | "read-only" | "none"

export interface ScalingRule {
  scalable: boolean
  replicaType: ReplicaType
  requiresUpstreamLB: boolean
  actsAsLoadBalancer: boolean
}

export const CATEGORY_SCALING_RULES: Readonly<Record<ComponentCategoryId, ScalingRule>> = Object.freeze({
  compute: { scalable: true, replicaType: "full", requiresUpstreamLB: true, actsAsLoadBalancer: false },
  "data-storage": { scalable: true, replicaType: "read-only", requiresUpstreamLB: false, actsAsLoadBalancer: false },
  caching: { scalable: true, replicaType: "full", requiresUpstreamLB: false, actsAsLoadBalancer: false },
  messaging: { scalable: true, replicaType: "full", requiresUpstreamLB: false, actsAsLoadBalancer: false },
  "delivery-network": { scalable: true, replicaType: "full", requiresUpstreamLB: false, actsAsLoadBalancer: true },
  "real-time": { scalable: true, replicaType: "full", requiresUpstreamLB: true, actsAsLoadBalancer: false },
  "auth-security": { scalable: true, replicaType: "full", requiresUpstreamLB: true, actsAsLoadBalancer: false },
  monitoring: { scalable: false, replicaType: "none", requiresUpstreamLB: false, actsAsLoadBalancer: false },
  search: { scalable: true, replicaType: "read-only", requiresUpstreamLB: false, actsAsLoadBalancer: false },
  devops: { scalable: false, replicaType: "none", requiresUpstreamLB: false, actsAsLoadBalancer: false },
  // A traffic source originates load; it isn't infrastructure you replicate for capacity.
  traffic: { scalable: false, replicaType: "none", requiresUpstreamLB: false, actsAsLoadBalancer: false },
})

/** Returns the scaling rule for a category, defaulting to non-scalable for unknown categories. */
export function getScalingRule(category: ComponentCategoryId): ScalingRule {
  return CATEGORY_SCALING_RULES[category] ?? { scalable: false, replicaType: "none", requiresUpstreamLB: false, actsAsLoadBalancer: false }
}

// Metrics (directional scale 1-10)
export const METRIC_MAX_VALUE = 10

// Canvas configuration (UX7, UX8)
export const CANVAS_GRID_SIZE = 16
export const CANVAS_MIN_ZOOM = 0.3
export const CANVAS_MAX_ZOOM = 2
/** Snap radius (px) for drag-to-connect — enlarged from React Flow's 20px default for more forgiving wiring. */
export const CANVAS_CONNECTION_RADIUS = 40
/** Padding (fraction) used when auto-fitting the viewport to the graph after a load/import. */
export const CANVAS_FIT_PADDING = 0.35
export const NODE_TYPE_COMPONENT = "archie-component" as const
export const NODE_TYPE_PLACEHOLDER = "placeholder" as const
export const NODE_TYPE_GHOST = "ghost" as const
export const EDGE_TYPE_CONNECTION = "archie-connection" as const

// Canvas node limit — defense-in-depth against client-side performance degradation (TD-1-3a)
export const MAX_CANVAS_NODES = 50

// Replica count bounds per node (Epic 14). Upper bound keeps monthlyCost × replicas well under
// MAX_MONTHLY_COST (100k) and reflects realistic horizontal-scaling fan-out on a 50-node canvas.
export const MIN_REPLICAS = 1
export const MAX_REPLICAS = 20

/**
 * Buildability ceiling on a challenge's combined peak RPS (D71). The front tier (DNS/CDN) must INGEST
 * the full peak — caching only absorbs requests that reach it BEHIND the CDN — and the best front-tier
 * variant does ~100k rps/replica. So a single front-tier node tops out at MAX_REPLICAS × 100k = 2M rps.
 * Authoring a challenge whose summed traffic-source peak exceeds this produces a quest no player can
 * build (it cleared the old uncapped harness only with thousands of replicas). The challenge creator
 * enforces this maximum, and the solvability harness scores capped at MAX_REPLICAS to back it up.
 */
export const MAX_BUILDABLE_PEAK_RPS = 2_000_000

/**
 * Discrete requests/sec scale for the Traffic Source stepper — the source's AVERAGE load. Non-linear
 * so a handful of clicks spans a small demo (3k) to hyperscale (10M). A traffic node's `replicaCount`
 * doubles as the 1-based index into this scale (see getNodeCost), so it persists via the existing
 * `replicas` field. Length is exactly MAX_REPLICAS, so the stepper's [MIN_REPLICAS, MAX_REPLICAS]
 * bounds already map 1:1 onto the scale — no separate clamp needed.
 */
export const TRAFFIC_RPS_STEPS = [
  3_000, 6_000, 9_000, 12_000, 15_000, 30_000, 60_000, 120_000, 300_000, 500_000,
  1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_500_000, 4_000_000, 5_000_000, 6_000_000, 8_000_000, 10_000_000,
] as const

// Simulation engine (Epic 15). Fixed tick count keeps telemetry buffers bounded and playback smooth.
export const SIM_TICKS = 50
export const SIM_DEFAULT_DURATION_S = 90
// Latency-under-load coefficient: latency = baseLatencyMs × (1 + max(0, load−1) × LATENCY_LOAD_K).
// At 2× capacity, latency ≈ baseLatency × (1 + LATENCY_LOAD_K). Tuned for visible-but-not-extreme growth.
export const LATENCY_LOAD_K = 2
// Wall-clock ms per tick at 1× playback speed; divided by playback speed (1/2/5/10×) in the store.
export const SIM_BASE_TICK_MS = 1000
// Default ramp target (req/sec) used when running a simulation with no scenario traffic curve.
export const DEFAULT_SIM_TARGET_RPS = 1000

// Canvas edge limit — defense-in-depth against memory exhaustion from malformed YAML (TD-5-1a)
export const MAX_EDGES = 200

// Canvas position bounds — defense-in-depth against extreme float injection from malicious YAML (TD-5-1b)
export const POSITION_MIN = -10000
export const POSITION_MAX = 10000

// Canvas spatial tolerances
export const POSITION_EPSILON = 1 // px tolerance for floating-point position comparison

// Recalculation ripple animation (UX3, Story 2-1)
export const RIPPLE_DELAY_MS = 100 // ms delay per BFS hop for visual ripple propagation
export const RIPPLE_ANIMATION_DURATION_MS = 200 // ms duration of the CSS pulse animation per node

// Metric categories (Story 2-3, Dashboard)
export const METRIC_CATEGORIES = [
  { id: "performance", name: "Performance", shortName: "Perf", iconName: "Gauge", color: "var(--color-metric-performance)" },
  { id: "reliability", name: "Reliability", shortName: "Rel", iconName: "ShieldCheck", color: "var(--color-metric-reliability)" },
  { id: "scalability", name: "Scalability", shortName: "Scale", iconName: "TrendingUp", color: "var(--color-metric-scalability)" },
  { id: "security", name: "Security", shortName: "Sec", iconName: "Lock", color: "var(--color-metric-security)" },
  { id: "operational-complexity", name: "Operational Simplicity", shortName: "Ops", iconName: "Wrench", color: "var(--color-metric-ops)" },
  { id: "cost-efficiency", name: "Cost Efficiency", shortName: "Cost", iconName: "DollarSign", color: "var(--color-metric-cost)" },
  { id: "developer-experience", name: "Developer Experience", shortName: "DX", iconName: "Code", color: "var(--color-metric-dx)" },
] as const

export type MetricCategoryId = (typeof METRIC_CATEGORIES)[number]["id"]

// Weight profile (Story 5-1: Priority Scoring foundation)
export const WEIGHT_MIN = 0
export const WEIGHT_MAX = 1

export type WeightProfile = Record<MetricCategoryId, number>

export const DEFAULT_WEIGHT_PROFILE: Readonly<WeightProfile> = Object.freeze(
  Object.fromEntries(METRIC_CATEGORIES.map((c) => [c.id, 1.0])) as WeightProfile,
)

/** Floating-point epsilon for weight comparison (0.1-step sliders, Story 5-4 AC-ARCH-PATTERN-1) */
const WEIGHT_EPSILON = 0.01

/** Returns true if every category weight is within epsilon of the default (1.0). */
export function isDefaultWeightProfile(profile: WeightProfile): boolean {
  return METRIC_CATEGORIES.every(
    (c) => Math.abs((profile[c.id] ?? 0) - 1.0) < WEIGHT_EPSILON,
  )
}

// Constraint definitions (Story 6-1: Constraint Guardrails foundation)
export const CONSTRAINT_THRESHOLD_MIN = 1
export const CONSTRAINT_THRESHOLD_MAX = 10
export const CONSTRAINT_LABEL_MAX_LENGTH = 100
export const MAX_CONSTRAINTS = 50

export type ConstraintOperator = "lte" | "gte"

export interface Constraint {
  id: string
  categoryId: MetricCategoryId
  operator: ConstraintOperator
  threshold: number
  label: string
}

/** Constraint as parsed from YAML — no runtime `id` yet (assigned in loadArchitecture, TD-6-4b) */
export type ParsedConstraint = Omit<Constraint, "id">

// Stack definitions (Story 8-1: Stack Browsing foundation)
export const MAX_STACK_COMPONENTS = 20
export const MAX_STACK_CONNECTIONS = 50

// Stack string limits — defense-in-depth against memory exhaustion from malformed Firestore data (TD-8-1a)
export const STACK_NAME_MAX_LENGTH = 200
export const STACK_DESC_MAX_LENGTH = 2000
export const STACK_ID_MAX_LENGTH = 200
// Shared slug format for IDs — allows: a-z A-Z 0-9 _ -
const SLUG_ID_FORMAT = /^[\w-]+$/
export const STACK_ID_FORMAT = SLUG_ID_FORMAT

export interface StackComponent {
  componentId: string
  variantId: string
  relativePosition: { x: number; y: number }
}

/**
 * Connection between two components in a stack definition.
 * Indices reference positions in the parent StackDefinition.components array (0-based).
 * Reordering the components array invalidates existing connections.
 */
export interface StackConnection {
  sourceComponentIndex: number
  targetComponentIndex: number
  connectionType: string
}

/** Mirrors CategoryScore shape — defined independently to avoid engine imports in constants */
export interface StackCategoryScore {
  categoryId: MetricCategoryId
  categoryName: string
  score: number
  metricCount: number
  hasData: boolean
}

// Font presets (Story 2-5)
// These set the root (<html>) font-size — all rem-based Tailwind classes scale proportionally.
// Rescaled (P96): the old 14px "small" read too small, so the whole scale shifted up — `small`
// is the former medium (16px), `medium` (the default) is the former large (18px), and `large` is
// a new, larger size (20px). Pair this with rem-based text classes (text-[…rem], not text-[…px])
// so EVERY element scales, including the top-bar controls.
export const FONT_SIZE_PRESETS = {
  small: "16px",
  medium: "18px",
  large: "20px",
} as const

export const FONT_FAMILY_PRESETS = {
  inter: '"Inter", system-ui, sans-serif',
  outfit: '"Outfit", system-ui, sans-serif',
  "space-grotesk": '"Space Grotesk", system-ui, sans-serif',
  "fira-sans": '"Fira Sans", system-ui, sans-serif',
  "dm-sans": '"DM Sans", system-ui, sans-serif',
  "source-sans-3": '"Source Sans 3", system-ui, sans-serif',
  "jetbrains-mono": '"JetBrains Mono", monospace',
  system: 'system-ui, -apple-system, sans-serif',
} as const

// Heatmap thresholds (Story 2-2)
// overallScore >= 6 = healthy, >= 4 = warning, < 4 = bottleneck
// Aligns with MetricValue enum: low=1-3, medium=4-7, high=8-10
export const HEATMAP_THRESHOLD_WARNING = 6
export const HEATMAP_THRESHOLD_BOTTLENECK = 4

// Score color threshold — green/good cutoff for dashboard score bars (Story 9-0)
// Intentionally higher than HEATMAP_THRESHOLD_WARNING (6): MetricBar uses 7 as green cutoff
export const SCORE_COLOR_GOOD_THRESHOLD = 7

// Recommendation threshold (Story 4-2a)
// Metrics scoring below this value are weak and eligible for variant recommendations.
// Between BOTTLENECK (4) and WARNING (6) to catch marginal metrics early.
export const RECOMMENDATION_THRESHOLD = 5

// Heatmap colors — performance overlay, separate from category identity (UX18)
export const HEATMAP_COLORS = {
  healthy: "var(--color-heatmap-green)",
  warning: "var(--color-heatmap-yellow)",
  bottleneck: "var(--color-heatmap-red)",
} as const

// Edge label offset when incompatibility warning is present (Story 4-3)
export const LABEL_INCOMPATIBILITY_OFFSET = 16

// Maximum px offset for draggable edge labels — prevents labels disappearing off-screen (TD-4-3a)
export const MAX_LABEL_OFFSET = 500

// Maximum character length for incompatibility reason strings (TD-4-3b AC-2)
export const MAX_INCOMPATIBILITY_REASON_LENGTH = 500

/**
 * Z-index scale — prevents stacking conflicts as overlays are added (TD-2-4a).
 *
 * Values are **Tailwind class strings** (e.g. `"z-10"`, `"z-[70]"`), not raw numbers.
 * They are interpolated directly into `className` props:
 *   `className={\`absolute ${Z_INDEX.OVERLAY}\`}`
 *
 * IMPORTANT: If you change a value, it MUST remain a valid Tailwind `z-*` class.
 * Changing to a raw number (e.g. `10`) will silently produce an invalid class
 * and the z-index will stop working with no TypeScript or runtime error.
 *
 * shadcn UI components (dialog, select, dropdown-menu) use z-50 by default.
 */
export type TailwindZIndex = `z-${number}` | `z-[${number}]`

export const Z_INDEX = {
  CANVAS_OVERLAY: "z-10", // EmptyCanvasState, canvas watermarks
  DROPDOWN: "z-40", // Custom dropdowns, popovers
  OVERLAY: "z-50", // Detail panels, tier popover, tooltips
  MODAL: "z-50", // Modals, dialogs (shadcn default)
  INSPECTOR_OVERLAY: "z-[60]", // Full-screen inspector overlay (above panels, below toasts)
  TOAST: "z-[70]", // Toast notifications (above everything)
} as const satisfies Record<string, TailwindZIndex>

// ─── Data Context Items (Story 7-1) ─────────────────────────────────────────

export const ACCESS_PATTERN_VALUES = ["read-heavy", "write-heavy", "mixed", "append-only"] as const
export type AccessPattern = (typeof ACCESS_PATTERN_VALUES)[number]

export const DATA_SIZE_VALUES = ["small", "medium", "large", "huge"] as const
export type DataSize = (typeof DATA_SIZE_VALUES)[number]

export const STRUCTURE_TYPE_VALUES = ["simple-kv", "nested-json", "relational", "binary-blob"] as const
export type StructureType = (typeof STRUCTURE_TYPE_VALUES)[number]

export const FIT_LEVEL_VALUES = ["great-fit", "good-fit", "trade-off", "poor-fit", "risky"] as const
export type FitLevel = (typeof FIT_LEVEL_VALUES)[number]

export type FitCompatibility = "positive" | "neutral" | "negative"

export interface DataContextItem {
  id: string
  name: string
  accessPattern: AccessPattern
  averageSize: DataSize
  structureType: StructureType
}

export interface FitFactor {
  dimension: string
  compatibility: FitCompatibility
  detail: string
}

export interface FitResult {
  level: FitLevel
  explanation: string
  factors: FitFactor[]
}

export const DATA_CONTEXT_NAME_MAX_LENGTH = 100
export const MAX_DATA_CONTEXT_ITEMS_PER_NODE = 10

// Pathway guidance (Story 7.5-1: Tier Gap Analysis Engine)
export const PATHWAY_SUGGESTION_LIMIT = 10

// Ghost placement suggestions (Phase 3 — Factorio-fy)
export const GHOST_SUGGESTION_LIMIT = 3
export const GHOST_OFFSET_X = 200
export const GHOST_OFFSET_Y = 0

// ALT-Mode Overlay System (Phase 4 — Factorio-fy)
export const OVERLAY_MODES = [
  { id: "none", label: "Off", shortcut: "0", iconName: "EyeOff" },
  { id: "compatibility", label: "Compatibility", shortcut: "1", iconName: "Plug" },
  { id: "performance", label: "Performance", shortcut: "2", iconName: "Gauge" },
  { id: "cost", label: "Cost", shortcut: "3", iconName: "DollarSign" },
  { id: "tier", label: "Tier", shortcut: "4", iconName: "Layers" },
  { id: "flow", label: "Flow", shortcut: "5", iconName: "GitBranch" },
] as const

export type OverlayModeId = (typeof OVERLAY_MODES)[number]["id"]

// ─── Demand Simulation (Story 9-1) ──────────────────────────────────────────

export const DEMAND_VARIABLE_VALUES = [
  "traffic-volume",
  "data-size",
  "concurrent-users",
  "geographic-spread",
  "burst-pattern",
] as const
export type DemandVariable = (typeof DEMAND_VARIABLE_VALUES)[number]

export const DEMAND_LEVEL_VALUES = [
  "low",
  "medium",
  "high",
  "extreme",
  "single-region",
  "multi-region",
  "global",
  "steady",
  "periodic-spikes",
  "unpredictable",
] as const
export type DemandLevel = (typeof DEMAND_LEVEL_VALUES)[number]

export const DEMAND_MULTIPLIER_MIN = 0.1
export const DEMAND_MULTIPLIER_MAX = 1.0
export const SCENARIO_NAME_MAX_LENGTH = 100
export const SCENARIO_DESC_MAX_LENGTH = 500
export const SCENARIO_ID_FORMAT = SLUG_ID_FORMAT

// Demand metric clamping — directional scale never goes below 1 or above 10 (Story 9-3)
export const DEMAND_METRIC_FLOOR = 1
export const DEMAND_METRIC_CEILING = 10

// ─── Score Transition Animation (Story 9-6) ─────────────────────────────────

// Particle animation on connections — density reflects connection health
export const CONNECTION_DEFAULT_HEALTH_SCORE = 5.0
export const PARTICLE_DENSITY_MIN = 2
export const PARTICLE_DENSITY_MAX = 12
export const PARTICLE_RADIUS = 2 // px radius of each SVG circle
export const PARTICLE_SPEED = 0.3 // fraction of path length per second
export const METRIC_BAR_TRANSITION_MS = 300 // CSS transition duration for metric bar width

// Scenario selector UI (Story 9-4)
export const SCENARIO_NONE_LABEL = "No Scenario"
export const SCENARIO_SELECTOR_TESTID = "scenario-selector"
export const SCENARIO_BANNER_TESTID = "scenario-banner"

// ─── Failure Scenarios (Story 9-7) ──────────────────────────────────────────

export const FAILURE_PRESET_IDS = [
  "failure-single-node",
  "failure-network-partition",
  "failure-database",
  "failure-traffic-spike",
  "failure-region-outage",
  "failure-data-corruption",
] as const
export type FailurePresetId = (typeof FAILURE_PRESET_IDS)[number]

// --- Port System (Epic 12) ---

export const PORT_TYPES = {
  http: { label: "HTTP", color: "#2563EB" },
  database: { label: "Database", color: "#7C3AED" },
  cache: { label: "Cache", color: "#DC2626" },
  stream: { label: "Stream", color: "#D97706" },
  monitor: { label: "Monitor", color: "#059669" },
  auth: { label: "Auth", color: "#CA8A04" },
  cdn: { label: "CDN", color: "#0891B2" },
} as const

export type PortType = keyof typeof PORT_TYPES

export interface PortDefinition {
  id: string
  type: PortType
  direction: "in" | "out"
}

export const PORT_SORT_ORDER: PortType[] = [
  "http",
  "database",
  "cache",
  "stream",
  "monitor",
  "auth",
  "cdn",
]

// --- Failure Simulation ---

export const FAILURE_MULTIPLIER_MIN = 0.1
export const FAILURE_MULTIPLIER_MAX = 1.0
export const FAILURE_NONE_LABEL = "No Failure"
export const FAILURE_SELECTOR_TESTID = "failure-selector"
export const FAILURE_BANNER_TESTID = "failure-banner"
