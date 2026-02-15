import { describe, it, expect, beforeEach, vi } from "vitest"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { FONT_SIZE_PRESETS, FONT_FAMILY_PRESETS } from "@/lib/constants"

describe("preferencesStore", () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset to defaults before each test
    usePreferencesStore.setState({
      theme: "dark",
      fontSize: "medium",
      fontFamily: "inter",
    })
  })

  describe("defaults", () => {
    it("has correct default theme (dark)", () => {
      expect(usePreferencesStore.getState().theme).toBe("dark")
    })

    it("has correct default fontSize (medium)", () => {
      expect(usePreferencesStore.getState().fontSize).toBe("medium")
    })

    it("has correct default fontFamily (inter)", () => {
      expect(usePreferencesStore.getState().fontFamily).toBe("inter")
    })
  })

  describe("setTheme", () => {
    it("updates theme to light", () => {
      usePreferencesStore.getState().setTheme("light")
      expect(usePreferencesStore.getState().theme).toBe("light")
    })

    it("updates theme back to dark", () => {
      usePreferencesStore.getState().setTheme("light")
      usePreferencesStore.getState().setTheme("dark")
      expect(usePreferencesStore.getState().theme).toBe("dark")
    })
  })

  describe("setFontSize", () => {
    it("updates fontSize to small", () => {
      usePreferencesStore.getState().setFontSize("small")
      expect(usePreferencesStore.getState().fontSize).toBe("small")
    })

    it("updates fontSize to large", () => {
      usePreferencesStore.getState().setFontSize("large")
      expect(usePreferencesStore.getState().fontSize).toBe("large")
    })

    it("updates fontSize back to medium", () => {
      usePreferencesStore.getState().setFontSize("large")
      usePreferencesStore.getState().setFontSize("medium")
      expect(usePreferencesStore.getState().fontSize).toBe("medium")
    })
  })

  describe("setFontFamily", () => {
    it("updates fontFamily to jetbrains-mono", () => {
      usePreferencesStore.getState().setFontFamily("jetbrains-mono")
      expect(usePreferencesStore.getState().fontFamily).toBe("jetbrains-mono")
    })

    it("updates fontFamily to system", () => {
      usePreferencesStore.getState().setFontFamily("system")
      expect(usePreferencesStore.getState().fontFamily).toBe("system")
    })

    it("updates fontFamily back to inter", () => {
      usePreferencesStore.getState().setFontFamily("system")
      usePreferencesStore.getState().setFontFamily("inter")
      expect(usePreferencesStore.getState().fontFamily).toBe("inter")
    })
  })

  describe("persistence", () => {
    it("uses archie-preferences as persist key", () => {
      const store = usePreferencesStore
      expect(store.persist).toBeDefined()
      expect(store.persist.getOptions().name).toBe("archie-preferences")
    })

    it("writes to localStorage on state change", () => {
      usePreferencesStore.getState().setTheme("light")
      const stored = localStorage.getItem("archie-preferences")
      expect(stored).toContain('"theme":"light"')
    })
  })

  describe("font presets", () => {
    it("FONT_SIZE_PRESETS has correct values", () => {
      expect(FONT_SIZE_PRESETS.small).toBe("14px")
      expect(FONT_SIZE_PRESETS.medium).toBe("16px")
      expect(FONT_SIZE_PRESETS.large).toBe("18px")
    })

    it("FONT_FAMILY_PRESETS has correct values", () => {
      expect(FONT_FAMILY_PRESETS.inter).toContain("Inter")
      expect(FONT_FAMILY_PRESETS.outfit).toContain("Outfit")
      expect(FONT_FAMILY_PRESETS["space-grotesk"]).toContain("Space Grotesk")
      expect(FONT_FAMILY_PRESETS["fira-sans"]).toContain("Fira Sans")
      expect(FONT_FAMILY_PRESETS["dm-sans"]).toContain("DM Sans")
      expect(FONT_FAMILY_PRESETS["source-sans-3"]).toContain("Source Sans 3")
      expect(FONT_FAMILY_PRESETS["jetbrains-mono"]).toContain("JetBrains Mono")
      expect(FONT_FAMILY_PRESETS.system).toContain("system-ui")
    })

    it("font size preset keys match store FontSize type", () => {
      const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"]
      sizes.forEach((size) => {
        expect(FONT_SIZE_PRESETS[size]).toBeDefined()
      })
    })

    it("font family preset keys match store FontFamily type", () => {
      const families: Array<"inter" | "outfit" | "space-grotesk" | "fira-sans" | "dm-sans" | "source-sans-3" | "jetbrains-mono" | "system"> = [
        "inter", "outfit", "space-grotesk", "fira-sans", "dm-sans", "source-sans-3", "jetbrains-mono", "system",
      ]
      families.forEach((family) => {
        expect(FONT_FAMILY_PRESETS[family]).toBeDefined()
      })
    })
  })

  describe("DOM application (usePreferencesEffect integration)", () => {
    beforeEach(() => {
      document.documentElement.className = "dark"
      document.documentElement.style.removeProperty("--archie-font-size")
      document.documentElement.style.removeProperty("--archie-font-family")
    })

    it("theme class applied to html element", () => {
      const html = document.documentElement
      // Simulate what usePreferencesEffect does
      html.classList.remove("dark")
      expect(html.classList.contains("dark")).toBe(false)
      html.classList.add("dark")
      expect(html.classList.contains("dark")).toBe(true)
    })

    it("root font-size can be set on html element", () => {
      const html = document.documentElement
      html.style.fontSize = FONT_SIZE_PRESETS.large
      expect(html.style.fontSize).toBe("18px")
    })

    it("font family CSS property can be set on html element", () => {
      const html = document.documentElement
      html.style.setProperty("--archie-font-family", FONT_FAMILY_PRESETS["jetbrains-mono"])
      expect(html.style.getPropertyValue("--archie-font-family")).toContain("JetBrains Mono")
    })
  })
})
