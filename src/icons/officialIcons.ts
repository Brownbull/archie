import { VENDOR_LOGOS } from "./officialIconMap"
import { logosSubset } from "./logos.generated"

/** The logo names actually bundled — guards against a mapped name that wasn't regenerated. */
const BUNDLED_LOGOS: ReadonlySet<string> = new Set(Object.keys(logosSubset.icons))

/**
 * Official vendor logo for a component id as a full Iconify name (`logos:<name>`), or null when the
 * id has no mapped brand logo OR the mapped logo isn't in the bundled subset. A null return is the
 * signal to fall back to a Lucide line icon (see ComponentIcon).
 */
export function getVendorLogoIcon(componentId: string): string | null {
  // componentId can originate from user-imported YAML — guard own-property access so prototype keys
  // (__proto__, constructor…) can never reach the lookup, then double-gate on the bundled set.
  if (!Object.hasOwn(VENDOR_LOGOS, componentId)) return null
  // eslint-disable-next-line security/detect-object-injection -- presence guarded by Object.hasOwn above
  const name = VENDOR_LOGOS[componentId]
  return BUNDLED_LOGOS.has(name) ? `logos:${name}` : null
}
