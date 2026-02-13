// Layout dimensions (UX1)
export const TOOLBAR_HEIGHT = 44
export const TOOLBOX_WIDTH = 260
export const INSPECTOR_WIDTH = 300
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
export const EDGE_TYPE_CONNECTION = "archie-connection" as const
