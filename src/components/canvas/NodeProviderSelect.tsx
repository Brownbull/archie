import { useState } from "react"
import { Lock, Star, Wrench } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUserProgressStore, spendableStars } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { isVendorOwned, vendorPriceLabel } from "@/lib/vendorOwnership"
import { vendorPrice } from "@/lib/vendorPricing"
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
import { useChallengeStore } from "@/stores/challengeStore"
import { useDisclosureTier } from "@/hooks/useDisclosureTier"
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
  // D103 — capability purchases: unowned vendors render with a price tag; choosing one opens the
  // dual-currency purchase dialog instead of swapping.
  const userId = useCurrentUserId()
  const progress = useUserProgressStore((st) => st)
  const [pendingVendor, setPendingVendor] = useState<{ id: string; name: string; typeId: string } | null>(null)

  const swapNodeComponent = useArchitectureStore((s) => s.swapNodeComponent)
  const { showOnNodeConfig } = useDisclosureTier()
  const component = componentLibrary.getComponent(componentId)
  const name = component?.name ?? componentId

  const providers = useMemo(
    () => (component ? providersForComponent(component, componentLibrary.getAllComponents()) : []),
    [component],
  )

  // P5-S4 (D95): team-expertise restrictions — restricted vendors stay VISIBLE in the dropdown
  // (the feedback's "explicitly blocked, not hidden") but can't be selected; the store chokepoint
  // backstops every other path. Free mode: no restrictions.
  const restrictedVendors = useChallengeStore((s) => s.activeChallenge?.restrictedVendors)
  const isRestricted = (id: string) => !!restrictedVendors?.includes(id)

  // Single (or no) provider → just the vendor + variant label, no dropdown. Fluidity P3c (D84): the
  // vendor swap also discloses progressively in quests — when gated, fall back to the same static label
  // (the vendor stays visible, just not changeable). Always interactive in free mode.
  // P1/T7: when the GATE (not provider count) is the reason, say so — players asked "is this broken?"
  const gated = providers.length > 1 && !showOnNodeConfig
  if (providers.length <= 1 || !showOnNodeConfig) {
    return (
      <div
        data-testid="archie-node-variant"
        className="flex items-center gap-1.5 px-3 pb-0.5"
        title={gated ? "Vendor choice unlocks in intermediate quests — or switch to Free mode to tune everything" : undefined}
      >
        <ComponentIcon componentId={componentId} category={category} className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap text-[0.75rem] text-text-secondary">
          {name}{variantName ? ` · ${variantName}` : ""}
        </span>
        {gated && <Lock data-testid="archie-node-vendor-locked" className="h-3 w-3 shrink-0 text-text-secondary/60" aria-hidden />}
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
      <Select
        value={componentId}
        onValueChange={(v) => {
          const target = componentLibrary.getComponent(v)
          if (target?.typeId && !isVendorOwned(progress, target.typeId, v)) {
            setPendingVendor({ id: v, name: target.name, typeId: target.typeId })
            return
          }
          swapNodeComponent(nodeId, v)
        }}
      >
        <SelectTrigger
          data-testid="archie-node-provider"
          title="Switch vendor — see each one's cost, throughput, and latency"
          className="h-7 w-full gap-1.5 border-archie-border bg-surface px-2 py-0 text-[0.75rem] text-text-secondary"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <ComponentIcon componentId={componentId} category={category} className="h-4 w-4 shrink-0" />
            <SelectValue>{name}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="min-w-[15rem]">
          {providers.map((p) => {
            const stats = providerStats(p)
            const restricted = isRestricted(p.id)
            const owned = isVendorOwned(progress, p.typeId, p.id)
            const price = p.typeId && !owned ? vendorPriceLabel(p.typeId, p.id) : null
            return (
              <SelectItem
                key={p.id}
                value={p.id}
                disabled={restricted}
                data-restricted={restricted || undefined}
                className="py-1 text-[0.75rem]"
                title={restricted ? "Your team doesn't run this vendor in this quest (team-expertise restriction)" : undefined}
              >
                <span className={`flex w-full items-center justify-between gap-3 ${restricted || !owned ? "opacity-60" : ""}`}>
                  <span className="flex items-center gap-2">
                    <ComponentIcon componentId={p.id} category={category} className="h-4 w-4 shrink-0" />
                    {p.name}
                    {restricted && <Lock className="h-3 w-3 shrink-0 text-text-secondary" aria-label="restricted in this quest" />}
                    {!restricted && !owned && <Lock className="h-3 w-3 shrink-0 text-orange-300/70" aria-label="locked — purchasable" />}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {price && <span data-testid={`vendor-price-${p.id}`} className="text-[0.625rem] font-semibold text-orange-300">{price}</span>}
                    {stats && <span className="text-[0.625rem] text-text-secondary">{stats}</span>}
                  </span>
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* D103 purchase dialog — dual currency (standard: 2★ or 1🔧; elite: 2🔧 only). */}
      {pendingVendor && (() => {
        const price = vendorPrice(pendingVendor.typeId, pendingVendor.id)
        const stars = spendableStars(progress)
        const buy = async (cost: { stars?: number; expert?: number }) => {
          const ok = userId ? await useUserProgressStore.getState().purchaseVendor(userId, pendingVendor.id, cost) : false
          if (ok) {
            toast.success(`${pendingVendor.name} unlocked — yours everywhere now.`)
            swapNodeComponent(nodeId, pendingVendor.id)
          } else {
            toast.warning("Couldn't complete the unlock (not enough currency?).")
          }
          setPendingVendor(null)
        }
        return (
          <Dialog open onOpenChange={(o) => !o && setPendingVendor(null)}>
            <DialogContent data-testid="vendor-unlock-dialog" className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Unlock {pendingVendor.name}</DialogTitle>
                <DialogDescription>
                  Vendors are capability knowledge — unlock once, use everywhere (quests and free build).
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPendingVendor(null)}>Cancel</Button>
                {price.stars !== null && (
                  <Button
                    data-testid="vendor-buy-stars"
                    size="sm"
                    variant="outline"
                    disabled={stars < price.stars}
                    className="gap-1 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
                    onClick={() => void buy({ stars: price.stars! })}
                  >
                    <Star className="h-3.5 w-3.5 fill-current" /> {price.stars}
                  </Button>
                )}
                {price.expert !== null && (
                  <Button
                    data-testid="vendor-buy-expert"
                    size="sm"
                    variant="outline"
                    disabled={progress.expertCurrency < price.expert}
                    className="gap-1 border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
                    onClick={() => void buy({ expert: price.expert! })}
                  >
                    <Wrench className="h-3.5 w-3.5" /> {price.expert}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}

export const NodeProviderSelect = memo(NodeProviderSelectBase)
