import { createElement, type CSSProperties } from "react"
import { getComponentIconUrl } from "@/lib/componentIcons"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"

interface ComponentIconProps {
  componentId: string
  category: ComponentCategoryId
  className?: string
}

/**
 * Renders a component's pixel-art icon (`public/icons/<id>.png`) when one exists, otherwise falls
 * back to the lucide category icon tinted with the category color. The pixel icon carries its own
 * colors so it isn't tinted; `image-rendering: pixelated` keeps it crisp when scaled.
 */
export function ComponentIcon({ componentId, category, className }: ComponentIconProps) {
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

  const cat = COMPONENT_CATEGORIES[category]
  const lucideIcon = cat ? getCategoryIcon(cat.iconName) : undefined
  if (!lucideIcon) return null
  // createElement (not <JSX>) — the icon is resolved dynamically from a lookup; rendering a
  // PascalCase local as JSX trips the react-compiler "component created during render" rule.
  return createElement(lucideIcon, { className, style: { color: cat?.color ?? "var(--color-muted)" } })
}
