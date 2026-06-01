import { memo, useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { componentLibrary } from "@/services/componentLibrary"
import { providersForComponent } from "@/lib/componentTypes"
import { useArchitectureStore } from "@/stores/architectureStore"
import { ComponentIcon } from "@/components/common/ComponentIcon"
import { formatVariantStats } from "@/lib/formatStats"
import type { ComponentCategoryId } from "@/lib/constants"
import type { Component } from "@/schemas/componentSchema"

/** Representative "$/mo · rps · ms" for a provider (its default tier). */
function providerStats(comp: Component): string {
  const v = comp.configVariants[0]
  if (!v) return ""
  return formatVariantStats({ monthlyCost: v.monthlyCost, maxRPS: v.maxRPS, baseLatencyMs: v.baseLatencyMs })
}

interface NodeProviderSelectProps {
  nodeId: string
  componentId: string
  category: ComponentCategoryId
  variantName?: string | null
}

/**
 * On-node vendor switcher: a dropdown right in the diagram to change the block's provider (e.g.
 * Compute → Node.js / FastAPI / Django / Rails…), each option showing its cost · RPS · latency.
 * Falls back to a static label when a type has only one provider. Drag-safe inside React Flow.
 */
function NodeProviderSelectBase({ nodeId, componentId, category, variantName }: NodeProviderSelectProps) {
  const swapNodeComponent = useArchitectureStore((s) => s.swapNodeComponent)
  const component = componentLibrary.getComponent(componentId)
  const name = component?.name ?? componentId

  const providers = useMemo(
    () => (component ? providersForComponent(component, componentLibrary.getAllComponents()) : []),
    [component],
  )

  // Single (or no) provider → just show the vendor + variant, no dropdown.
  if (providers.length <= 1) {
    return (
      <div data-testid="archie-node-variant" className="flex items-center gap-1.5 px-3 pb-0.5">
        <ComponentIcon componentId={componentId} category={category} className="h-4 w-4 shrink-0" />
        <span className="truncate text-[0.75rem] text-text-secondary">
          {name}{variantName ? ` · ${variantName}` : ""}
        </span>
      </div>
    )
  }

  return (
    <div
      data-testid="archie-node-variant"
      className="nodrag px-3 pb-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select value={componentId} onValueChange={(v) => swapNodeComponent(nodeId, v)}>
        <SelectTrigger
          data-testid="archie-node-provider"
          title="Switch vendor — see each one's cost, throughput, and latency"
          className="h-7 w-full gap-1.5 border-archie-border bg-surface px-2 py-0 text-[0.75rem] text-text-secondary"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <ComponentIcon componentId={componentId} category={category} className="h-4 w-4 shrink-0" />
            <SelectValue>{name}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="min-w-[15rem]">
          {providers.map((p) => {
            const stats = providerStats(p)
            return (
              <SelectItem key={p.id} value={p.id} className="text-[0.8125rem]">
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <ComponentIcon componentId={p.id} category={category} className="h-5 w-5 shrink-0" />
                    {p.name}
                  </span>
                  {stats && <span className="shrink-0 text-[0.6875rem] text-text-secondary">{stats}</span>}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

export const NodeProviderSelect = memo(NodeProviderSelectBase)
