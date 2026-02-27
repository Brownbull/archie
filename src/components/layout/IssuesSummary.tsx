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

interface IssueItem {
  nodeId: string
  componentName: string
  status: "bottleneck" | "warning"
}

export function IssuesSummary() {
  const heatmapColors = useArchitectureStore((s) => s.heatmapColors)
  const nodes = useArchitectureStore(useShallow((s) => s.nodes))
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)

  const { issues, bottleneckCount, warningCount } = useMemo(() => {
    if (!heatmapEnabled) return { issues: [] as IssueItem[], bottleneckCount: 0, warningCount: 0 }

    const items: IssueItem[] = []
    let bottlenecks = 0
    let warnings = 0
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    for (const [nodeId, status] of heatmapColors) {
      if (status !== "bottleneck" && status !== "warning") continue
      const node = nodeMap.get(nodeId)
      items.push({
        nodeId,
        componentName: node?.data.componentName ?? nodeId,
        status,
      })
      if (status === "bottleneck") bottlenecks++
      else warnings++
    }

    // Sort bottlenecks first, then warnings
    items.sort((a, b) => {
      if (a.status === b.status) return 0
      return a.status === "bottleneck" ? -1 : 1
    })

    return { issues: items, bottleneckCount: bottlenecks, warningCount: warnings }
  }, [heatmapColors, nodes, heatmapEnabled])

  if (!heatmapEnabled || issues.length === 0) return null

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
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          {bottleneckCount > 0 && (
            <span className="text-xs font-medium text-red-500">
              {bottleneckCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs font-medium text-yellow-500">
              {warningCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid="issues-dropdown"
        align="end"
        className="w-56"
      >
        <DropdownMenuLabel>Architecture Issues</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {issues.map((issue) => (
          <DropdownMenuItem
            key={issue.nodeId}
            data-testid={`issue-item-${issue.nodeId}`}
            onClick={() => handleIssueClick(issue.nodeId)}
          >
            <span
              className={`mr-2 h-2 w-2 shrink-0 rounded-full ${
                issue.status === "bottleneck" ? "bg-red-500" : "bg-yellow-500"
              }`}
            />
            <span className="truncate">{issue.componentName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
