import { memo, useMemo } from "react"
import { Layers, Lock } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { componentLibrary } from "@/services/componentLibrary"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useDisclosureTier } from "@/hooks/useDisclosureTier"
import { formatVariantStats } from "@/lib/formatStats"

interface NodeConfigSelectProps {
  nodeId: string
  componentId: string
  activeVariantId: string
}

/**
 * On-node configuration-tier switcher (Fluidity Phase 1): change the block's config variant — the
 * cost vs performance/scale tier — right in the diagram, each option showing its $/mo · rps · latency.
 * Pairs with NodeProviderSelect (vendor) so the block is the single, complete tuning surface and the
 * inspector no longer carries a duplicate picker. Renders nothing when the provider has a single tier.
 * Drag-safe inside React Flow.
 */
function NodeConfigSelectBase({ nodeId, componentId, activeVariantId }: NodeConfigSelectProps) {
  const updateNodeConfigVariant = useArchitectureStore((s) => s.updateNodeConfigVariant)
  const { showOnNodeConfig } = useDisclosureTier()
  const component = componentLibrary.getComponent(componentId)
  const variants = useMemo(() => component?.configVariants ?? [], [component])

  // Single (or no) tier → nothing to pick; the vendor row already shows the variant name.
  if (variants.length <= 1) return null

  // Fluidity P3c (D84): config-tier tuning discloses progressively in quests — hidden at beginner
  // quests, revealed at intermediate+. Always shown in free mode. UI-only (solvability unaffected).
  // P1/T7: render a compact locked hint instead of disappearing — players read the missing control
  // as a bug ("I cannot modify any option on the blocks. Is that expected?").
  if (!showOnNodeConfig) {
    return (
      <div
        data-testid="archie-node-config-locked"
        className="nodrag flex items-center gap-1.5 px-3 pb-1 text-[0.6875rem] text-text-secondary/60"
        title="Configuration tiers unlock in intermediate quests — or switch to Free mode to tune everything"
      >
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">Tuning unlocks later</span>
      </div>
    )
  }

  const active = variants.find((v) => v.id === activeVariantId) ?? variants[0]

  return (
    <div
      data-testid="archie-node-config"
      className="nodrag px-3 pb-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select value={active.id} onValueChange={(v) => updateNodeConfigVariant(nodeId, v)}>
        <SelectTrigger
          data-testid="archie-node-config-trigger"
          title="Configuration tier — a cost vs performance/scale trade-off for this provider"
          className="h-7 w-full gap-1.5 border-archie-border bg-surface px-2 py-0 text-[0.75rem] text-text-secondary"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <SelectValue>{active.name}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="min-w-[15rem]">
          {variants.map((v) => {
            const stats = formatVariantStats(v)
            return (
              <SelectItem key={v.id} value={v.id} className="py-1 text-[0.75rem]">
                <span className="flex w-full flex-col gap-0.5">
                  <span className="flex w-full items-center justify-between gap-3">
                    <span>{v.name}</span>
                    {stats && <span className="shrink-0 text-[0.625rem] text-text-secondary">{stats}</span>}
                  </span>
                  {/* Phase 3 S1 (D92): what the tier MEANS — text only; a link inside a Radix Select
                      option would break onValueChange/keyboard nav (the docs link lives in the
                      inspector's Tier row instead). Absent until the Phase-3 reseed authors it. */}
                  {v.description && (
                    <span
                      data-testid={`variant-description-${v.id}`}
                      className="max-w-[18rem] whitespace-normal text-[0.625rem] leading-snug text-text-secondary/80"
                    >
                      {v.description}
                    </span>
                  )}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

export const NodeConfigSelect = memo(NodeConfigSelectBase)
