import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePreferencesStore, type FontFamily } from "@/stores/preferencesStore"

export function SettingsMenu() {
  const theme = usePreferencesStore((s) => s.theme)
  const fontSize = usePreferencesStore((s) => s.fontSize)
  const fontFamily = usePreferencesStore((s) => s.fontFamily)
  const setTheme = usePreferencesStore((s) => s.setTheme)
  const setFontSize = usePreferencesStore((s) => s.setFontSize)
  const setFontFamily = usePreferencesStore((s) => s.setFontFamily)

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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
