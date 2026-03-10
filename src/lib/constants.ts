// Layout dimensions (UX1)
export const TOOLBAR_HEIGHT = 44
export const TOOLBOX_WIDTH = 260
export const INSPECTOR_DEFAULT_WIDTH = 300
export const INSPECTOR_EXPANDED_WIDTH = 500
export const INSPECTOR_MIN_WIDTH = 200
export const INSPECTOR_MAX_WIDTH = 700
export const INSPECTOR_COLLAPSED_WIDTH = 40
export const DASHBOARD_HEIGHT = 100
export const NODE_WIDTH = 140
export const BORDER_RADIUS = 6

// Spacing scale (UX16 — 4px base)
export const SPACING_XS = 4
export const SPACING_SM = 8
export const SPACING_MD = 12
export const SPACING_LG = 16
export const SPACING_XL = 24

// File limits (NFR7)
export const MAX_FILE_SIZE = 1_048_576 // 1MB in bytes

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
} as const

export type ComponentCategoryId = keyof typeof COMPONENT_CATEGORIES

// Metrics (directional scale 1-10)
export const METRIC_MAX_VALUE = 10

// Canvas configuration (UX7, UX8)
export const CANVAS_GRID_SIZE = 16
export const CANVAS_MIN_ZOOM = 0.5
export const CANVAS_MAX_ZOOM = 2
export const NODE_TYPE_COMPONENT = "archie-component" as const
export const NODE_TYPE_PLACEHOLDER = "placeholder" as const
export const EDGE_TYPE_CONNECTION = "archie-connection" as const

// Canvas node limit — defense-in-depth against client-side performance degradation (TD-1-3a)
export const MAX_CANVAS_NODES = 50

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

// Font presets (Story 2-5)
// These set the root (<html>) font-size — all rem-based Tailwind classes scale proportionally
// Browser default root is 16px; medium preserves that, small/large shift by ±2px
export const FONT_SIZE_PRESETS = {
  small: "14px",
  medium: "16px",
  large: "18px",
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
