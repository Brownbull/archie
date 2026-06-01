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
  /** First-run guided tour seen? Persisted so the tour auto-shows once; restartable from Settings. */
  tourSeen: boolean
  /** First-node contextual nudge shown? Persisted so the "configure & connect" hint fires only once. */
  firstNodeHintSeen: boolean
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setAnimationsEnabled: (enabled: boolean) => void
  setTourSeen: (seen: boolean) => void
  setFirstNodeHintSeen: (seen: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "dark",
      fontSize: "medium",
      fontFamily: "inter",
      animationsEnabled: true,
      tourSeen: false,
      firstNodeHintSeen: false,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      setTourSeen: (seen) => set({ tourSeen: seen }),
      setFirstNodeHintSeen: (seen) => set({ firstNodeHintSeen: seen }),
    }),
    { name: "archie-preferences" }
  )
)
