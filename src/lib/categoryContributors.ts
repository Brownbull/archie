import type { MetricCategoryId } from "@/lib/constants"

/** One node's contribution to a score category — the trace row (Plan-2 P4, D99). */
export interface CategoryContributor {
  nodeId: string
  /** Display name of the block (componentName). */
  name: string
  /** Mean of this node's metric values in the category (1–10). */
  subScore: number
  /** The node's LOWEST metric in the category — what's dragging it. */
  worstMetricId: string
  worstMetricValue: number
}

interface ContributorNode {
  id: string
  data: { componentName: string }
}
interface RecalculatedLike {
  metrics: ReadonlyArray<{ id: string; category: string; numericValue: number }>
}

/**
 * The trace behind a category score (Plan-2 P4, D99): which nodes feed it, worst first.
 * Pure presentation over the recalculation output — same numbers the category bar averages,
 * just not collapsed. Returns [] when no node carries metrics in the category.
 */
export function categoryContributors(
  nodes: ReadonlyArray<ContributorNode>,
  computedMetrics: ReadonlyMap<string, RecalculatedLike>,
  categoryId: MetricCategoryId,
): CategoryContributor[] {
  const out: CategoryContributor[] = []
  for (const node of nodes) {
    const recalc = computedMetrics.get(node.id)
    if (!recalc) continue
    const inCategory = recalc.metrics.filter((m) => m.category === categoryId)
    if (inCategory.length === 0) continue
    const subScore = inCategory.reduce((s, m) => s + m.numericValue, 0) / inCategory.length
    const worst = inCategory.reduce((min, m) => (m.numericValue < min.numericValue ? m : min), inCategory[0])
    out.push({
      nodeId: node.id,
      name: node.data.componentName,
      subScore,
      worstMetricId: worst.id,
      worstMetricValue: worst.numericValue,
    })
  }
  // Worst first — the question a trace answers is always "what's dragging this down".
  return out.sort((a, b) => a.subScore - b.subScore)
}

/** The single lowest metric across all contributors — the highest-leverage fix ("what moves it"). */
export function biggestLever(contributors: readonly CategoryContributor[]): CategoryContributor | null {
  if (contributors.length === 0) return null
  return contributors.reduce((min, c) => (c.worstMetricValue < min.worstMetricValue ? c : min), contributors[0])
}
