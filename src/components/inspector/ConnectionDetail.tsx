import { useShallow } from "zustand/react/shallow"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useLibrary } from "@/hooks/useLibrary"
import { HEATMAP_COLORS } from "@/lib/constants"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface ConnectionDetailProps {
  edgeId: string
}

function HeatmapBadge({ status }: { status: HeatmapStatus | undefined }) {
  if (!status) return <span className="text-xs text-text-secondary">—</span>
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: HEATMAP_COLORS[status], color: "#fff" }}
    >
      {status}
    </span>
  )
}

export function ConnectionDetail({ edgeId }: ConnectionDetailProps) {
  const edge = useArchitectureStore(
    useShallow((s) => s.edges.find((e) => e.id === edgeId)),
  )
  const sourceHeatmap = useArchitectureStore(
    (s) => s.heatmapColors.get(edge?.source ?? ""),
  )
  const targetHeatmap = useArchitectureStore(
    (s) => s.heatmapColors.get(edge?.target ?? ""),
  )
  const connectionHeatmap = useArchitectureStore(
    (s) => s.edgeHeatmapColors.get(edgeId),
  )

  const { getComponentById } = useLibrary()

  if (!edge || !edge.data) return null

  const sourceComponent = getComponentById(edge.data.sourceArchieComponentId)
  const targetComponent = getComponentById(edge.data.targetArchieComponentId)
  const connectionProps = sourceComponent?.connectionProperties

  const sourceName = sourceComponent?.name ?? "Unknown"
  const targetName = targetComponent?.name ?? "Unknown"

  return (
    <ScrollArea className="h-full">
      <div data-testid="connection-detail" className="space-y-3 p-3">
        {/* Header */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Connection</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            <span>{sourceName}</span>
            <span className="mx-1">&rarr;</span>
            <span>{targetName}</span>
          </p>
        </div>

        <Separator />

        {/* Connection Properties */}
        {connectionProps ? (
          <div data-testid="connection-properties" className="space-y-2">
            <h3 className="text-xs font-medium text-text-primary">Properties</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Protocol</span>
                <span className="font-medium text-text-primary">{connectionProps.protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Latency</span>
                <span className="font-medium text-text-primary">{connectionProps.typicalLatency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Co-location</span>
                <span className="font-medium text-text-primary">
                  {connectionProps.coLocationPotential ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Patterns</span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {connectionProps.communicationPatterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-text-secondary"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div data-testid="no-connection-properties" className="py-2 text-center">
            <p className="text-xs text-text-secondary">No connection properties available</p>
          </div>
        )}

        <Separator />

        {/* Endpoint Health */}
        <div data-testid="endpoint-health" className="space-y-2">
          <h3 className="text-xs font-medium text-text-primary">Endpoint Health</h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{sourceName}</span>
              <HeatmapBadge status={sourceHeatmap} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{targetName}</span>
              <HeatmapBadge status={targetHeatmap} />
            </div>
          </div>
        </div>

        {/* Connection Heatmap */}
        <div data-testid="connection-heatmap" className="space-y-1">
          <h3 className="text-xs font-medium text-text-primary">Connection Health</h3>
          <div className="flex items-center gap-2 text-xs">
            <HeatmapBadge status={connectionHeatmap} />
            {!connectionHeatmap && (
              <span className="text-text-secondary">Not calculated</span>
            )}
          </div>
        </div>

        {/* Incompatibility Warning */}
        {edge.data.isIncompatible && edge.data.incompatibilityReason && (
          <>
            <Separator />
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
              <h3 className="text-xs font-medium text-amber-600">Compatibility Warning</h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                {edge.data.incompatibilityReason}
              </p>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
