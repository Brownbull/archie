import { useMemo } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { ComponentCategoryId } from "@/lib/constants"

export interface GuidanceCheck {
  id: string
  label: string
  met: boolean
  /** Shown when unmet — a concrete next step. */
  nudge: string
}

const COMPUTE_CATEGORIES: ReadonlySet<ComponentCategoryId> = new Set(["compute"])
const DATA_CATEGORIES: ReadonlySet<ComponentCategoryId> = new Set(["data-storage", "caching"])

/**
 * Live structural guidance (P6) for the solo builder — a always-on "Required"-style checklist
 * that nudges toward a sensible architecture, beyond challenge mode. Derives entirely from the
 * current graph + the live topology issues (orphans), so it updates as you wire things up.
 */
export function useBuildGuidance(): { checks: GuidanceCheck[]; metCount: number; nodeCount: number } {
  const nodes = useArchitectureStore((s) => s.nodes)
  const topologyIssues = useArchitectureStore((s) => s.topologyIssues)

  return useMemo(() => {
    const orphanIds = topologyIssues.filter((i) => i.issueType === "orphan").map((i) => i.nodeId)
    const orphanNames = orphanIds
      .map((id) => nodes.find((n) => n.id === id)?.data.componentName)
      .filter((n): n is string => Boolean(n))

    const hasCompute = nodes.some((n) => COMPUTE_CATEGORIES.has(n.data.componentCategory as ComponentCategoryId))
    const hasData = nodes.some((n) => DATA_CATEGORIES.has(n.data.componentCategory as ComponentCategoryId))

    const checks: GuidanceCheck[] = [
      {
        id: "connected",
        label: "Everything is wired into the flow",
        met: orphanIds.length === 0,
        nudge:
          orphanNames.length > 0
            ? `${orphanNames.join(", ")} ${orphanNames.length === 1 ? "is" : "are"} placed but not connected to traffic.`
            : "Connect every component into the request path.",
      },
      {
        id: "compute",
        label: "Has a compute / service layer",
        met: hasCompute,
        nudge: "Add a compute or service component to handle requests.",
      },
      {
        id: "data",
        label: "Has a data layer",
        met: hasData,
        nudge: "Add a database or cache to persist or speed up data.",
      },
    ]

    return { checks, metCount: checks.filter((c) => c.met).length, nodeCount: nodes.length }
  }, [nodes, topologyIssues])
}
