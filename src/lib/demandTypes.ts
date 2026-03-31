import type { DemandVariable, DemandLevel } from "@/lib/constants"

// --- Metadata Types ---

export interface DemandVariableMetadata {
  id: DemandVariable
  name: string
  description: string
  iconName: string
  levels: readonly DemandLevel[]
}

export interface DemandLevelMeta {
  label: string
  numericOrder: number
}

// --- Domain Types ---

export type DemandResponse = Partial<
  Record<DemandVariable, Partial<Record<DemandLevel, Record<string, number>>>>
>

export type DemandProfile = Record<DemandVariable, DemandLevel>

export interface ScenarioPreset {
  id: string
  name: string
  description: string
  icon: string
  demandProfile: DemandProfile
}

// --- Metadata Constants ---

export const DEMAND_VARIABLES: readonly DemandVariableMetadata[] = [
  {
    id: "traffic-volume",
    name: "Traffic Volume",
    description: "Request rate and throughput demand on the system",
    iconName: "TrendingUp",
    levels: ["low", "medium", "high", "extreme"],
  },
  {
    id: "data-size",
    name: "Data Size",
    description: "Volume of data stored and processed",
    iconName: "Database",
    levels: ["low", "medium", "high", "extreme"],
  },
  {
    id: "concurrent-users",
    name: "Concurrent Users",
    description: "Number of simultaneous active users",
    iconName: "Users",
    levels: ["low", "medium", "high", "extreme"],
  },
  {
    id: "geographic-spread",
    name: "Geographic Spread",
    description: "Distribution of users and infrastructure across regions",
    iconName: "Globe",
    levels: ["single-region", "multi-region", "global"],
  },
  {
    id: "burst-pattern",
    name: "Burst Pattern",
    description: "Traffic variability and spike characteristics",
    iconName: "Zap",
    levels: ["steady", "periodic-spikes", "unpredictable"],
  },
] as const

// numericOrder is scoped per variable group, not globally ordered.
// low=1..extreme=4 applies to quantitative variables (traffic, data, users).
// Geographic and burst variables have their own independent ordering starting from 1.
export const DEMAND_LEVEL_METADATA: Record<DemandLevel, DemandLevelMeta> = {
  low: { label: "Low", numericOrder: 1 },
  medium: { label: "Medium", numericOrder: 2 },
  high: { label: "High", numericOrder: 3 },
  extreme: { label: "Extreme", numericOrder: 4 },
  "single-region": { label: "Single Region", numericOrder: 1 },
  "multi-region": { label: "Multi-Region", numericOrder: 2 },
  global: { label: "Global", numericOrder: 3 },
  steady: { label: "Steady", numericOrder: 1 },
  "periodic-spikes": { label: "Periodic Spikes", numericOrder: 2 },
  unpredictable: { label: "Unpredictable", numericOrder: 3 },
}

// --- Failure Scenario Types (Story 9-7) ---

/** Per-metric multiplier map for failure scenarios. Keys are metric IDs, values are 0.1-1.0 degradation multipliers. */
export type FailureModifiers = Record<string, number>

export interface FailurePreset {
  id: string
  name: string
  description: string
  icon: string
  failureModifiers: FailureModifiers
}

// --- Helper Functions ---

export function getValidLevelsForVariable(variable: DemandVariable): DemandLevel[] {
  const meta = DEMAND_VARIABLES.find((v) => v.id === variable)
  return meta ? [...meta.levels] : []
}
