import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ExperienceLevel } from "@/lib/componentTypes"

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
  /**
   * Global experience level (P86 → P89). Gates how much detail the whole app reveals — block
   * palette, inspector, the optimize panel — not just the toolbox. Defaults to `beginner` so new
   * users see essentials, not everything. Starting a challenge sets it to the challenge's
   * difficulty; the user can raise/lower it from the top bar or Settings.
   */
  experienceLevel: ExperienceLevel
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setAnimationsEnabled: (enabled: boolean) => void
  setTourSeen: (seen: boolean) => void
  setFirstNodeHintSeen: (seen: boolean) => void
  setExperienceLevel: (level: ExperienceLevel) => void
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
      experienceLevel: "beginner",
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      setTourSeen: (seen) => set({ tourSeen: seen }),
      setFirstNodeHintSeen: (seen) => set({ firstNodeHintSeen: seen }),
      setExperienceLevel: (level) => set({ experienceLevel: level }),
    }),
    { name: "archie-preferences" }
  )
)
