import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ExperienceLevel } from "@/lib/componentTypes"

export type Theme = "dark" | "light"
export type FontSize = "small" | "medium" | "large"
export type FontFamily = "inter" | "outfit" | "space-grotesk" | "fira-sans" | "dm-sans" | "source-sans-3" | "jetbrains-mono" | "system"
/**
 * Which icon family the app renders. `pixel` = the hand-made PixelLab pixel-art set (the default,
 * Archie's signature look); `official` = official vendor brand logos (Iconify `logos` set, bundled
 * offline) with a Lucide line-icon fallback for anything lacking a brand logo (logical types, tabs).
 */
export type IconSet = "pixel" | "official"

interface PreferencesState {
  theme: Theme
  fontSize: FontSize
  fontFamily: FontFamily
  animationsEnabled: boolean
  /** First-run guided tour seen? Persisted so the tour auto-shows once; restartable from Settings. */
  tourSeen: boolean
  /**
   * First-run mode fork (S1, Kane QA): the novice on-ramp. `null` = not yet answered (show the
   * fork on the empty canvas); `"quest"` = chose the guided curriculum; `"free"` = chose the
   * sandbox. Persisted like tourSeen so the fork only appears once for a brand-new user.
   */
  firstRunChoice: "quest" | "free" | null
  /** First-node contextual nudge shown? Persisted so the "configure & connect" hint fires only once. */
  firstNodeHintSeen: boolean
  /**
   * Global experience level (P86 → P89). Gates how much detail the whole app reveals — block
   * palette, inspector, the optimize panel — not just the toolbox. Defaults to `beginner` so new
   * users see essentials, not everything. Starting a challenge sets it to the challenge's
   * difficulty; the user can raise/lower it from the top bar or Settings.
   */
  experienceLevel: ExperienceLevel
  /** Icon family for the whole app — defaults to `pixel` so the signature look is unchanged. */
  iconSet: IconSet
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
  setFontFamily: (fontFamily: FontFamily) => void
  setAnimationsEnabled: (enabled: boolean) => void
  setTourSeen: (seen: boolean) => void
  setFirstRunChoice: (choice: "quest" | "free") => void
  setFirstNodeHintSeen: (seen: boolean) => void
  setExperienceLevel: (level: ExperienceLevel) => void
  setIconSet: (iconSet: IconSet) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "dark",
      fontSize: "medium",
      fontFamily: "inter",
      animationsEnabled: true,
      tourSeen: false,
      firstRunChoice: null,
      firstNodeHintSeen: false,
      experienceLevel: "beginner",
      iconSet: "pixel",
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      setTourSeen: (seen) => set({ tourSeen: seen }),
      setFirstRunChoice: (choice) => set({ firstRunChoice: choice }),
      setFirstNodeHintSeen: (seen) => set({ firstNodeHintSeen: seen }),
      setExperienceLevel: (level) => set({ experienceLevel: level }),
      setIconSet: (iconSet) => set({ iconSet }),
    }),
    { name: "archie-preferences" }
  )
)
