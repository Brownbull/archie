import { componentLibrary } from "@/services/componentLibrary"
import { vendorPrice, tierPrice } from "@/lib/vendorPricing"
import type { UserProgress } from "@/stores/userProgressStore"

/** D103 ownership: free (default vendor / base tier) or purchased. */
type OwnershipSlice = Pick<UserProgress, "unlockedVendors" | "unlockedTiers">

export function isVendorOwned(p: OwnershipSlice, typeId: string | undefined, vendorId: string): boolean {
  if (!typeId) return true // typeless legacy blocks predate the progression
  const price = vendorPrice(typeId, vendorId)
  if (price.stars === null && price.expert === null) return true // the type's default — free
  return !!p.unlockedVendors[vendorId]
}

export function isTierOwned(p: OwnershipSlice, typeId: string | undefined, vendorId: string, variantId: string): boolean {
  if (!typeId) return true
  if (!isVendorOwned(p, typeId, vendorId)) return false
  const price = tierPrice(typeId, vendorId, variantId)
  if (price.stars === null) return true // base tier rides the vendor
  return !!p.unlockedTiers[`${vendorId}/${variantId}`]
}

/** Human price tag for lock badges: "2★ / 1🔧", "2🔧", "1★". */
export function vendorPriceLabel(typeId: string, vendorId: string): string | null {
  const price = vendorPrice(typeId, vendorId)
  if (price.stars === null && price.expert === null) return null
  if (price.elite) return `${price.expert}🔧`
  return `${price.stars}★ / ${price.expert}🔧`
}

export function tierPriceLabel(typeId: string, vendorId: string, variantId: string): string | null {
  const price = tierPrice(typeId, vendorId, variantId)
  return price.stars === null ? null : `${price.stars}★`
}

export function typeIdOf(componentId: string): string | undefined {
  return componentLibrary.getComponent(componentId)?.typeId
}
