import { createElement } from "react"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { BlockConceptLoop } from "@/components/common/BlockConceptLoop"
import { getTypeLucideIcon } from "@/icons/officialTypeIcons"

type LoopSize = "sm" | "md" | "lg"

interface TypeIconProps {
  typeId: string
  color: string
  size?: LoopSize
  className?: string
  title?: string
}

/**
 * The visual for a logical component TYPE, honoring the icon-set preference: the animated
 * BlockConceptLoop in `pixel` mode (Archie's signature look) or a distinct Lucide line icon in
 * `official` mode. Falls back to the concept loop when a type has no Lucide mapping.
 */
export function TypeIcon({ typeId, color, size = "sm", className, title }: TypeIconProps) {
  const iconSet = usePreferencesStore((s) => s.iconSet)
  if (iconSet === "official") {
    const Lucide = getTypeLucideIcon(typeId)
    if (Lucide) {
      // createElement (not <JSX>) — the icon is resolved dynamically from a lookup; rendering a
      // PascalCase local as JSX trips the react-hooks "static-components" rule (cf. ComponentIcon).
      // Decorative beside an adjacent text label unless given an explicit title.
      return createElement(
        Lucide,
        title
          ? { className, style: { color }, "aria-label": title }
          : { className, style: { color }, "aria-hidden": true },
      )
    }
  }
  return <BlockConceptLoop typeId={typeId} size={size} color={color} className={className} title={title} />
}
