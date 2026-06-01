import { describe, it, expect } from "vitest"
import { VENDOR_LOGOS, USED_LOGO_NAMES } from "@/icons/officialIconMap"
import { logosSubset } from "@/icons/logos.generated"
import { getVendorLogoIcon } from "@/icons/officialIcons"
import { COMPONENT_ICON_IDS } from "@/lib/componentIcons"

describe("officialIconMap ↔ generated logos subset (lockstep)", () => {
  const bundled = new Set(Object.keys(logosSubset.icons))

  it("every mapped logo name is bundled (run `npm run gen:icons` if this fails)", () => {
    const missing = USED_LOGO_NAMES.filter((n) => !bundled.has(n))
    expect(missing).toEqual([])
  })

  it("the generated subset has no orphan icons beyond the map", () => {
    const extra = [...bundled].filter((n) => !USED_LOGO_NAMES.includes(n))
    expect(extra).toEqual([])
  })

  it("USED_LOGO_NAMES is the distinct, sorted set of map values", () => {
    const expected = [...new Set(Object.values(VENDOR_LOGOS))].sort()
    expect([...USED_LOGO_NAMES]).toEqual(expected)
  })

  it("every mapped vendor id is a real component icon id", () => {
    const unknown = Object.keys(VENDOR_LOGOS).filter((id) => !COMPONENT_ICON_IDS.has(id))
    expect(unknown).toEqual([])
  })
})

describe("getVendorLogoIcon", () => {
  it("returns the full Iconify name for a mapped + bundled id", () => {
    expect(getVendorLogoIcon("aws-lambda")).toBe("logos:aws-lambda")
    expect(getVendorLogoIcon("postgresql")).toBe("logos:postgresql")
    expect(getVendorLogoIcon("redis-cache")).toBe("logos:redis") // aliased to the redis logo
  })

  it("returns null for an unmapped id (→ Lucide fallback)", () => {
    expect(getVendorLogoIcon("keycloak")).toBeNull()
    expect(getVendorLogoIcon("totally-unknown-id")).toBeNull()
  })
})
