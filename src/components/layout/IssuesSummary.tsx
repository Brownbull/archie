import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

type IssueKind = "bottleneck" | "warning" | "orphan" | "unreachable" | "missing-hop" | "replicas-without-lb"

interface IssueItem {
  nodeId: string
  componentName: string
  kind: IssueKind
  description?: string
}

const ISSUE_COLORS: Record<IssueKind, string> = {
  bottleneck: "bg-[#ff8a3d]",
  warning: "bg-[#3b9dff]",
  orphan: "bg-[#b06bff]",
  unreachable: "bg-[#b06bff]",
  "missing-hop": "bg-[#b06bff]",
  "replicas-without-lb": "bg-[#3b9dff]",
}

export function IssuesSummary() {
  const heatmapColors = useArchitectureStore((s) => s.heatmapColors)
  const topologyIssues = useArchitectureStore((s) => s.topologyIssues)
  const nodes = useArchitectureStore(useShallow((s) => s.nodes))
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)

  const { issues, bottleneckCount, warningCount, topologyCount } = useMemo(() => {
    const items: IssueItem[] = []
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    if (heatmapEnabled) {
      for (const [nodeId, status] of heatmapColors) {
        if (status !== "bottleneck" && status !== "warning") continue
        const node = nodeMap.get(nodeId)
        items.push({
          nodeId,
          componentName: node?.data.componentName ?? nodeId,
          kind: status,
          description: status === "bottleneck"
            ? "Overloaded — reduce traffic or scale up"
            : "Nearing capacity — monitor or add replicas",
        })
      }
    }

    const topologyNodesSeen = new Set<string>()
    for (const issue of topologyIssues) {
      if (topologyNodesSeen.has(issue.nodeId)) continue
      topologyNodesSeen.add(issue.nodeId)
      const node = nodeMap.get(issue.nodeId)
      items.push({
        nodeId: issue.nodeId,
        componentName: node?.data.componentName ?? issue.nodeId,
        kind: issue.issueType,
        description: issue.description,
      })
    }

    items.sort((a, b) => {
      const order: IssueKind[] = ["bottleneck", "missing-hop", "replicas-without-lb", "unreachable", "orphan", "warning"]
      return order.indexOf(a.kind) - order.indexOf(b.kind)
    })

    return {
      issues: items,
      bottleneckCount: items.filter((i) => i.kind === "bottleneck").length,
      warningCount: items.filter((i) => i.kind === "warning").length,
      topologyCount: topologyNodesSeen.size,
    }
  }, [heatmapColors, topologyIssues, nodes, heatmapEnabled])

  if (issues.length === 0) return null

  function handleIssueClick(nodeId: string) {
    useUiStore.getState().setPendingNavNodeId(nodeId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="issues-summary"
          variant="ghost"
          size="sm"
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-[#3b9dff]" />
          {bottleneckCount > 0 && (
            <span className="text-xs font-medium text-[#ff8a3d]">
              {bottleneckCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs font-medium text-[#3b9dff]">
              {warningCount}
            </span>
          )}
          {topologyCount > 0 && (
            <span data-testid="topology-count" className="text-xs font-medium text-[#b06bff]">
              {topologyCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid="issues-dropdown"
        align="end"
        className="w-64"
      >
        <DropdownMenuLabel>Architecture Issues</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {issues.map((issue, idx) => (
          <DropdownMenuItem
            key={`${issue.nodeId}-${issue.kind}-${idx}`}
            data-testid={`issue-item-${issue.nodeId}`}
            onClick={() => handleIssueClick(issue.nodeId)}
          >
            <span
              className={`mr-2 h-2 w-2 shrink-0 rounded-full ${ISSUE_COLORS[issue.kind]}`}
            />
            <span className="truncate">
              {issue.componentName}
              {issue.description && (
                <span className="ml-1 text-muted-foreground text-xs">— {issue.description}</span>
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
