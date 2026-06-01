import { createElement, type CSSProperties } from "react"
import { getComponentIconUrl } from "@/lib/componentIcons"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { getVendorLogoIcon } from "@/icons/officialIcons"
import { LogoIcon } from "@/icons/LogoIcon"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"

interface ComponentIconProps {
  componentId: string
  category: ComponentCategoryId
  className?: string
}

/**
 * Renders a component's icon honoring the global icon-set preference:
 *  - `pixel`   → the hand-made pixel-art PNG (`public/icons/<id>.png`) when one exists.
 *  - `official`→ the official vendor brand logo (Iconify `logos` set) when the id maps to one.
 * In both modes, anything without a dedicated icon falls back to the Lucide category icon tinted
 * with the category color. The pixel PNG carries its own colors (not tinted); `image-rendering:
 * pixelated` keeps it crisp when scaled.
 */
export function ComponentIcon({ componentId, category, className }: ComponentIconProps) {
  const iconSet = usePreferencesStore((s) => s.iconSet)

  if (iconSet === "official") {
    const logo = getVendorLogoIcon(componentId)
    if (logo) return <LogoIcon name={logo} className={className} />
    // no brand logo for this id → fall through to the Lucide category icon
  } else {
    const iconUrl = getComponentIconUrl(componentId)
    if (iconUrl) {
      return (
        <img
          data-testid="component-pixel-icon"
          src={iconUrl}
          alt=""
          aria-hidden
          className={className}
          style={{ imageRendering: "pixelated" } as CSSProperties}
        />
      )
    }
  }

  const cat = COMPONENT_CATEGORIES[category]
  const lucideIcon = cat ? getCategoryIcon(cat.iconName) : undefined
  if (!lucideIcon) return null
  // createElement (not <JSX>) — the icon is resolved dynamically from a lookup; rendering a
  // PascalCase local as JSX trips the react-compiler "component created during render" rule.
  return createElement(lucideIcon, { className, style: { color: cat?.color ?? "var(--color-muted)" } })
}
