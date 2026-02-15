import { useEffect } from "react"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { FONT_SIZE_PRESETS, FONT_FAMILY_PRESETS } from "@/lib/constants"

/**
 * Applies user preferences (theme, font size, font family) to the document.
 * Call once at the app root to sync store state with DOM.
 */
export function usePreferencesEffect() {
  const theme = usePreferencesStore((s) => s.theme)
  const fontSize = usePreferencesStore((s) => s.fontSize)
  const fontFamily = usePreferencesStore((s) => s.fontFamily)

  useEffect(() => {
    const html = document.documentElement
    if (theme === "dark") html.classList.add("dark")
    else html.classList.remove("dark")
    const fontSizeValue = fontSize in FONT_SIZE_PRESETS ? FONT_SIZE_PRESETS[fontSize] : FONT_SIZE_PRESETS.medium
    const fontFamilyValue = fontFamily in FONT_FAMILY_PRESETS ? FONT_FAMILY_PRESETS[fontFamily] : FONT_FAMILY_PRESETS.inter
    html.style.setProperty("--archie-font-size", fontSizeValue)
    html.style.setProperty("--archie-font-family", fontFamilyValue)
  }, [theme, fontSize, fontFamily])
}
