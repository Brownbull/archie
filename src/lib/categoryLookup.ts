import { METRIC_CATEGORIES, type MetricCategoryId } from "@/lib/constants"

/** Lookup from MetricCategoryId to METRIC_CATEGORIES entry (icon, color, shortName, name). */
export const CATEGORY_LOOKUP = new Map<MetricCategoryId, (typeof METRIC_CATEGORIES)[number]>(
  METRIC_CATEGORIES.map((cat) => [cat.id, cat]),
)
