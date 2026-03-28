import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "dark" | "light"
export type FontSize = "small" | "medium" | "large"
export type FontFamily = "inter" | "outfit" | "space-grotesk" | "fira-sans" | "dm-sans" | "source-sans-3" | "jetbrains-mono" | "system"

interface PreferencesState {
  theme: Theme
  fontSize: FontSize
  fontFamily: FontFamily
  animationsEnabled: boolean
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setAnimationsEnabled: (enabled: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "dark",
      fontSize: "medium",
      fontFamily: "inter",
      animationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
    }),
    { name: "archie-preferences" }
  )
)
