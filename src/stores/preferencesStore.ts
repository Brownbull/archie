import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { BlockLevel } from "@/lib/componentTypes"

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
   * Experience tier gating which block types the toolbox shows (P86 progressive disclosure).
   * Defaults to `beginner` so new users see ~7 essentials, not all 27. Starting a challenge sets
   * this to the challenge's difficulty; the user can still raise/lower it from the toolbox.
   */
  blockLevel: BlockLevel
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setAnimationsEnabled: (enabled: boolean) => void
  setTourSeen: (seen: boolean) => void
  setFirstNodeHintSeen: (seen: boolean) => void
  setBlockLevel: (level: BlockLevel) => void
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
      blockLevel: "beginner",
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      setTourSeen: (seen) => set({ tourSeen: seen }),
      setFirstNodeHintSeen: (seen) => set({ firstNodeHintSeen: seen }),
      setBlockLevel: (level) => set({ blockLevel: level }),
    }),
    { name: "archie-preferences" }
  )
)
