import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePreferencesStore, type FontFamily, type IconSet } from "@/stores/preferencesStore"
import type { ExperienceLevel } from "@/lib/componentTypes"
import { useShortcutsDialog } from "@/components/help/shortcutsDialogStore"

export function SettingsMenu() {
  const theme = usePreferencesStore((s) => s.theme)
  const fontSize = usePreferencesStore((s) => s.fontSize)
  const fontFamily = usePreferencesStore((s) => s.fontFamily)
  const experienceLevel = usePreferencesStore((s) => s.experienceLevel)
  const iconSet = usePreferencesStore((s) => s.iconSet)
  const setTheme = usePreferencesStore((s) => s.setTheme)
  const setFontSize = usePreferencesStore((s) => s.setFontSize)
  const setFontFamily = usePreferencesStore((s) => s.setFontFamily)
  const setExperienceLevel = usePreferencesStore((s) => s.setExperienceLevel)
  const setIconSet = usePreferencesStore((s) => s.setIconSet)
  const setTourSeen = usePreferencesStore((s) => s.setTourSeen)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="settings-menu-trigger"
          className="h-8 w-8 text-text-secondary hover:text-text-primary"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="settings-menu-content">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => setTheme(v as "dark" | "light")}
        >
          <DropdownMenuRadioItem value="dark" data-testid="theme-option-dark">
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" data-testid="theme-option-light">
            Light
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Experience Level</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={experienceLevel}
          onValueChange={(v) => setExperienceLevel(v as ExperienceLevel)}
        >
          <DropdownMenuRadioItem value="beginner" data-testid="experience-option-beginner">
            Beginner
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="intermediate" data-testid="experience-option-intermediate">
            Intermediate
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="advanced" data-testid="experience-option-advanced">
            Advanced
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Font Size</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={fontSize}
          onValueChange={(v) => setFontSize(v as "small" | "medium" | "large")}
        >
          <DropdownMenuRadioItem value="small" data-testid="font-size-small">
            Small
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="medium" data-testid="font-size-medium">
            Medium
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="large" data-testid="font-size-large">
            Large
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Icons</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={iconSet}
          onValueChange={(v) => setIconSet(v as IconSet)}
        >
          <DropdownMenuRadioItem value="pixel" data-testid="icon-set-pixel">
            Pixel art
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="official" data-testid="icon-set-official">
            Official
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Font</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={fontFamily}
          onValueChange={(v) => setFontFamily(v as FontFamily)}
        >
          <DropdownMenuRadioItem value="inter" data-testid="font-family-inter">
            Inter
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="outfit" data-testid="font-family-outfit">
            Outfit
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="space-grotesk" data-testid="font-family-space-grotesk">
            Space Grotesk
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="fira-sans" data-testid="font-family-fira-sans">
            Fira Sans
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dm-sans" data-testid="font-family-dm-sans">
            DM Sans
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="source-sans-3" data-testid="font-family-source-sans-3">
            Source Sans 3
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="jetbrains-mono"
            data-testid="font-family-jetbrains-mono"
          >
            JetBrains Mono
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" data-testid="font-family-system">
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem data-testid="restart-tour" onSelect={() => setTourSeen(false)}>
          Restart tour
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="open-shortcuts"
          onSelect={() => useShortcutsDialog.getState().setOpen(true)}
        >
          Keyboard shortcuts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
