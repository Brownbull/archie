import type { ComponentCategoryId } from "@/lib/constants"

// --- Tier Requirement Types (discriminated union) ---

export type TierRequirement =
  | {
      type: "min_component_count"
      minCount: number
      description: string
    }
  | {
      type: "min_category_score"
      categoryId: string
      minScore: number
      description: string
    }
  | {
      type: "required_categories"
      requiredCategories: ComponentCategoryId[]
      description: string
    }
  | {
      type: "min_distinct_categories"
      minCount: number
      description: string
    }

// --- Tier Definition ---

export interface TierDefinition {
  id: string
  name: string
  index: number
  color: string
  textColor: string
  requirements: TierRequirement[]
}

// --- Tier Gap ---

export interface TierGap {
  requirementDescription: string
  currentValue: string | number
  targetValue: string | number
}

// --- Tier Result ---

export interface TierResult {
  tierId: string
  tierName: string
  tierIndex: number
  totalTiers: number
  tierColor: string
  tierTextColor: string
  nextTierGaps: TierGap[]
  isMaxTier: boolean
}

// --- Default 3-Tier Definitions ---

export const DEFAULT_TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: "foundation",
    name: "Foundation",
    index: 0,
    color: "bg-amber-700",
    textColor: "text-amber-100",
    requirements: [
      {
        type: "min_component_count",
        minCount: 3,
        description: "At least 3 components",
      },
      {
        type: "min_distinct_categories",
        minCount: 2,
        description: "Components from at least 2 categories",
      },
    ],
  },
  {
    id: "production-ready",
    name: "Production-Ready",
    index: 1,
    color: "bg-slate-500",
    textColor: "text-slate-100",
    requirements: [
      {
        type: "min_component_count",
        minCount: 5,
        description: "At least 5 components",
      },
      {
        type: "min_distinct_categories",
        minCount: 3,
        description: "Components from at least 3 categories",
      },
      {
        type: "min_category_score",
        categoryId: "performance",
        minScore: 5,
        description: "Performance score of 5+",
      },
      {
        type: "min_category_score",
        categoryId: "reliability",
        minScore: 5,
        description: "Reliability score of 5+",
      },
    ],
  },
  {
    id: "resilient",
    name: "Resilient",
    index: 2,
    color: "bg-yellow-500",
    textColor: "text-yellow-950",
    requirements: [
      {
        type: "min_component_count",
        minCount: 8,
        description: "At least 8 components",
      },
      {
        type: "min_distinct_categories",
        minCount: 5,
        description: "Components from at least 5 categories",
      },
      {
        type: "min_category_score",
        categoryId: "performance",
        minScore: 6,
        description: "Performance score of 6+",
      },
      {
        type: "min_category_score",
        categoryId: "reliability",
        minScore: 6,
        description: "Reliability score of 6+",
      },
      {
        type: "min_category_score",
        categoryId: "scalability",
        minScore: 6,
        description: "Scalability score of 6+",
      },
      {
        type: "required_categories",
        requiredCategories: ["monitoring"],
        description: "Monitoring component present",
      },
    ],
  },
]
