import { componentLibrary } from "@/services/componentLibrary"
import { COMPONENT_TYPES } from "@/lib/componentTypes"

/**
 * D103 — vendor & tier pricing, derived from the catalog at runtime (no authoring):
 * - Each type's DEFAULT vendor is free, and every vendor's BASE tier (configVariants[0]) comes
 *   free with the vendor.
 * - Non-default vendors: 2★ OR 1 Expert (player's choice) — except the type's ELITE vendor
 *   (highest best-variant capacity among non-defaults): 2 Expert, Expert-only.
 * - Premium tiers (variants beyond base): 1★ — except the elite vendor's TOP variant: 2★.
 * Reference builds use defaults, so progression can never gate a quest's existence proof; the
 * affordability harness gate bounds the paid cost of clearing builds.
 */

export interface VendorPrice {
  /** null = free (the type's default vendor). */
  stars: number | null
  expert: number | null
  elite: boolean
}

export interface TierPrice {
  /** null = free (the vendor's base tier). */
  stars: number | null
}

function bestCapacity(componentId: string): number {
  const comp = componentLibrary.getComponent(componentId)
  return Math.max(0, ...(comp?.configVariants.map((v) => v.maxRPS ?? 0) ?? [0]))
}

/** The type's elite vendor id (highest best-variant capacity among NON-default vendors), if any. */
export function eliteVendorId(typeId: string): string | null {
  const type = COMPONENT_TYPES.get(typeId)
  if (!type) return null
  // Defensive: component suites mock the library partially; no catalog ⇒ no elite claims.
  const all = typeof componentLibrary.getAllComponents === "function" ? componentLibrary.getAllComponents() : []
  const rivals = all.filter((c) => c.typeId === typeId && c.id !== type.defaultProviderId)
  if (rivals.length === 0) return null
  const top = rivals.reduce((best, c) => (bestCapacity(c.id) > bestCapacity(best.id) ? c : best))
  return bestCapacity(top.id) > 0 ? top.id : null
}

export function vendorPrice(typeId: string, vendorId: string): VendorPrice {
  const type = COMPONENT_TYPES.get(typeId)
  if (!type || vendorId === type.defaultProviderId) return { stars: null, expert: null, elite: false }
  if (eliteVendorId(typeId) === vendorId) return { stars: null, expert: 2, elite: true }
  return { stars: 2, expert: 1, elite: false }
}

export function tierPrice(typeId: string, vendorId: string, variantId: string): TierPrice {
  const comp = componentLibrary.getComponent(vendorId)
  if (!comp || comp.configVariants.length === 0) return { stars: null }
  if (comp.configVariants[0].id === variantId) return { stars: null } // base tier rides the vendor
  if (eliteVendorId(typeId) === vendorId) {
    const top = comp.configVariants.reduce((best, v) => ((v.maxRPS ?? 0) > (best.maxRPS ?? 0) ? v : best))
    if (top.id === variantId) return { stars: 2 }
  }
  return { stars: 1 }
}
