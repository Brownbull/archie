# Story: 2-5 Settings & Preferences

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization

## Overview

As a user, I want to access a settings menu via a gear icon next to my profile name, so that I can customize the visual experience including font style, font size, and switching between dark and light themes.

This story adds a gear icon button to the Toolbar (next to the user's display name), a dropdown menu with settings options, and a preferences store that persists settings to localStorage. It includes theme toggle (dark/light), font family selection, and font size adjustment. Settings apply immediately and persist across sessions.

## Functional Acceptance Criteria

**AC-1: Settings Gear Icon**
**Given** I am authenticated and on the main app
**When** I view the toolbar
**Then** I see a gear icon next to my display name
**And** the icon is visually consistent with the toolbar design

**AC-2: Settings Dropdown**
**Given** I see the gear icon
**When** I click it
**Then** a dropdown menu opens with settings options
**And** clicking outside the dropdown closes it

**AC-3: Theme Toggle**
**Given** the settings dropdown is open
**When** I switch the theme from dark to light (or vice versa)
**Then** the entire application theme changes immediately
**And** all panels, canvas, toolbar, and dashboard reflect the new theme
**And** my theme preference is saved and persists on page reload

**AC-4: Font Size Adjustment**
**Given** the settings dropdown is open
**When** I select a different font size (Small, Medium, Large)
**Then** the application text size adjusts accordingly
**And** my font size preference persists on page reload

**AC-5: Font Style Selection**
**Given** the settings dropdown is open
**When** I select a different font style
**Then** the application font changes to the selected style
**And** my font style preference persists on page reload

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** Settings dropdown component at `src/components/layout/SettingsMenu.tsx`
- **AC-ARCH-LOC-2:** Preferences store at `src/stores/preferencesStore.ts`
- **AC-ARCH-LOC-3:** Toolbar modifications at `src/components/layout/Toolbar.tsx`
- **AC-ARCH-LOC-4:** CSS custom properties for font size/family in `src/index.css`
- **AC-ARCH-LOC-5:** Font presets in `src/lib/constants.ts`
- **AC-ARCH-LOC-6:** SettingsMenu unit tests at `tests/unit/components/layout/SettingsMenu.test.tsx`
- **AC-ARCH-LOC-7:** Preferences store unit tests at `tests/unit/stores/preferencesStore.test.ts`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** Preferences stored in a dedicated `preferencesStore` (Zustand) — separate from `uiStore` (which is session state) and `architectureStore` (which is domain state). Preferences are user-global settings that persist across sessions (AR15)
- **AC-ARCH-PATTERN-2:** Preferences persist to `localStorage` via Zustand `persist` middleware. Key: `archie-preferences`. Load on app startup, write on change
- **AC-ARCH-PATTERN-3:** Theme toggle manages the `dark` class on `<html>` element — consistent with shadcn/ui dark mode pattern already in place (AR4). Adding `class="dark"` enables dark mode; removing it enables light mode
- **AC-ARCH-PATTERN-4:** Font size applied via CSS custom property `--archie-font-size` on `<html>` element, consumed by body and key text elements. Three presets: Small (13px), Medium (14px — default), Large (16px)
- **AC-ARCH-PATTERN-5:** Font style applied via CSS custom property `--archie-font-family` on `<html>` element. Options: "Inter" (default), "JetBrains Mono" (monospace), "System" (system-ui stack)
- **AC-ARCH-PATTERN-6:** SettingsMenu uses shadcn/ui `DropdownMenu` component — consistent with existing UI component library. **Must install first:** `npx shadcn@latest add dropdown-menu`
- **AC-ARCH-PATTERN-7:** Gear icon uses `Settings` icon from lucide-react — consistent with existing icon usage pattern

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** Settings MUST NOT be stored in `uiStore` — use dedicated `preferencesStore` with localStorage persistence
- **AC-ARCH-NO-2:** Theme toggle MUST NOT use `window.matchMedia` for system preference detection in MVP — explicit user choice only (dark is default per UX14)
- **AC-ARCH-NO-3:** Font changes MUST NOT cause layout shifts in the canvas — canvas node widths are fixed (NODE_WIDTH = 140px)
- **AC-ARCH-NO-4:** Settings MUST NOT store any sensitive data in localStorage — preferences only (theme, font size, font family)
- **AC-ARCH-NO-5:** SettingsMenu MUST NOT use a modal — use dropdown/popover only (UX10 no-modals principle)

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| DropdownMenu (shadcn) | `src/components/ui/dropdown-menu.tsx` | shadcn/ui component (auto-generated) | NEW (install) |
| SettingsMenu | `src/components/layout/SettingsMenu.tsx` | React component + shadcn DropdownMenu | NEW |
| preferencesStore | `src/stores/preferencesStore.ts` | Zustand store with persist (AR15) | NEW |
| Toolbar | `src/components/layout/Toolbar.tsx` | Layout component | MODIFY |
| index.css | `src/index.css` | CSS custom properties | MODIFY |
| constants | `src/lib/constants.ts` | Font presets | MODIFY |
| index.html | `index.html` | Anti-flicker script | MODIFY |
| SettingsMenu.test | `tests/unit/components/layout/SettingsMenu.test.tsx` | Unit test (AR22) | NEW |
| preferencesStore.test | `tests/unit/stores/preferencesStore.test.ts` | Unit test (AR22) | NEW |
| Settings E2E spec | `tests/e2e/settings-and-preferences.spec.ts` | E2E test (Playwright) | NEW |

## Tasks / Subtasks

### Task 1: Preferences Store
- [x] 1.1 Create `src/stores/preferencesStore.ts` with Zustand + `persist` middleware
- [x] 1.2 Define state: `theme: 'dark' | 'light'` (default: `'dark'`), `fontSize: 'small' | 'medium' | 'large'` (default: `'medium'`), `fontFamily: 'inter' | 'jetbrains-mono' | 'system'` (default: `'inter'`)
- [x] 1.3 Define actions: `setTheme(theme)`, `setFontSize(size)`, `setFontFamily(family)`
- [x] 1.4 Configure persist middleware: `name: 'archie-preferences'`, `storage: localStorage`
- [x] 1.5 Write unit tests: defaults are correct, setTheme updates state, setFontSize updates state, setFontFamily updates state, persistence key is correct

### Task 2: Theme & Font Application
- [x] 2.1 Add font presets to `src/lib/constants.ts`: `FONT_SIZE_PRESETS = { small: '13px', medium: '14px', large: '16px' }` and `FONT_FAMILY_PRESETS = { inter: '"Inter", system-ui, sans-serif', 'jetbrains-mono': '"JetBrains Mono", monospace', system: 'system-ui, -apple-system, sans-serif' }`
- [x] 2.2 Create `usePreferencesEffect` logic (in App.tsx or dedicated hook) that applies preferences to the DOM on mount and on change: toggle `dark` class on `<html>`, set `--archie-font-size` CSS property, set `--archie-font-family` CSS property
- [x] 2.3 Modify `src/index.css`: update body font-family to use `var(--archie-font-family, "Inter", system-ui, sans-serif)` and font-size to use `var(--archie-font-size, 14px)`
- [x] 2.4 Add anti-flicker script to `index.html`: inline `<script>` that reads `archie-preferences` from localStorage and applies `dark` class before React hydrates (prevents dark-to-light flash on reload for light-mode users)
- [x] 2.5 Add Google Fonts link for JetBrains Mono in `index.html` (Inter is already loaded; JetBrains Mono as optional)
- [x] 2.6 Write unit tests: theme class applied to html element, font size CSS property set, font family CSS property set

### Task 3: Settings Menu Component
- [x] 3.1 Install shadcn/ui DropdownMenu: `npx shadcn@latest add dropdown-menu`
- [x] 3.2 Create `SettingsMenu.tsx` using shadcn/ui `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent`
- [x] 3.3 Add theme section: label "Theme" with `DropdownMenuRadioGroup` — Dark, Light. Show radio indicator on active option
- [x] 3.4 Add font size section: label "Font Size" with `DropdownMenuRadioGroup` — Small, Medium, Large. Show radio indicator on active option
- [x] 3.5 Add font style section: label "Font" with `DropdownMenuRadioGroup` — Inter, JetBrains Mono, System. Show radio indicator on active option
- [x] 3.6 Trigger button: `Settings` icon from lucide-react, ghost variant, same size as Sign Out button
- [x] 3.7 Add `data-testid` attributes: `settings-menu-trigger`, `settings-menu-content`, `theme-option-dark`, `theme-option-light`, `font-size-small`, `font-size-medium`, `font-size-large`, `font-family-inter`, `font-family-jetbrains-mono`, `font-family-system`
- [x] 3.8 Write unit tests: gear icon renders, dropdown opens on click, theme options visible, clicking theme option calls setTheme, font size options work, font family options work

### Task 4: Toolbar Integration
- [x] 4.1 Modify `Toolbar.tsx`: add `<SettingsMenu />` between the display name and Sign Out button
- [x] 4.2 Visual: gear icon should have subtle styling — ghost variant, same text-secondary color as display name, with hover effect
- [x] 4.3 Write/update unit tests: Toolbar renders SettingsMenu, gear icon is clickable

### Task 5: Verification
- [x] 5.1 Run `npx tsc --noEmit` — no type errors
- [x] 5.2 Run `npm run test:quick` — all tests pass (752 tests, 55 files)
- [x] 5.3 Verify coverage meets thresholds (Lines: 45%, Branches: 30%, Functions: 25%, Statements: 40%)
- [ ] 5.4 Visual check: theme toggle works, fonts change, layout doesn't break (deferred to E2E/manual)
- [ ] 5.5 Verify canvas node widths unchanged after font size change (NODE_WIDTH = 140px stays fixed — deferred to E2E/manual)
- [ ] 5.6 Verify React Flow controls/minimap render correctly in both dark and light modes (deferred to E2E/manual)

## Dev Notes

### Architecture Guidance

**Preferences Store with Persist:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 'medium',
      fontFamily: 'inter',
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
    }),
    { name: 'archie-preferences' }
  )
)
```

**DOM Application Pattern:**
```typescript
// In App.tsx or a dedicated hook
useEffect(() => {
  const html = document.documentElement
  // Theme
  if (theme === 'dark') html.classList.add('dark')
  else html.classList.remove('dark')
  // Font size
  html.style.setProperty('--archie-font-size', FONT_SIZE_PRESETS[fontSize])
  // Font family
  html.style.setProperty('--archie-font-family', FONT_FAMILY_PRESETS[fontFamily])
}, [theme, fontSize, fontFamily])
```

**Anti-Flicker Script (index.html):**
```html
<script>
  // Apply theme before React hydrates to prevent dark-to-light flash
  try {
    const stored = JSON.parse(localStorage.getItem('archie-preferences') || '{}')
    const theme = stored?.state?.theme
    if (theme === 'light') document.documentElement.classList.remove('dark')
    else document.documentElement.classList.add('dark')
  } catch (e) { document.documentElement.classList.add('dark') }
</script>
```

**Toolbar Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Archie                          Display Name [⚙] [Sign Out] │
└─────────────────────────────────────────────────────────┘
```
The gear icon sits between the display name and Sign Out button.

### Technical Notes

**shadcn/ui DropdownMenu (MUST INSTALL):**
Run `npx shadcn@latest add dropdown-menu` to install. The pattern is:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Theme</DropdownMenuLabel>
    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
      <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
    <DropdownMenuSeparator />
    ...
  </DropdownMenuContent>
</DropdownMenu>
```

**Common Pitfalls:**
1. **React Flow in light mode:** React Flow has its own theme styling. The existing dark theme overrides in `index.css` (`.dark .react-flow__controls`, `.dark .react-flow__minimap`, etc.) only apply in dark mode. In light mode, verify React Flow's default styles look acceptable with Archie's light token system. May need explicit light mode overrides if controls/minimap clash with Archie's `:root` colors
2. **Theme flicker risk:** Without the anti-flicker script (Task 2.4), users who set light mode will see a dark-to-light flash on page reload. The inline script runs before React hydrates and prevents this
3. **Font loading flash (FOUT):** JetBrains Mono loaded from Google Fonts may cause FOUT when first selected. Use `font-display: swap` in the Google Fonts URL and `<link rel="preload">`. Since it's optional (not default), a brief swap is acceptable
4. **Canvas text overflow:** Changing font to monospace (JetBrains Mono) makes component names wider. NODE_WIDTH (140px) is fixed. Verify existing ArchieNode has `text-overflow: ellipsis` or `overflow: hidden` to handle longer monospace names
5. **localStorage SSR:** Not applicable (Vite SPA), but Zustand persist handles hydration correctly. The persist middleware auto-rehydrates from localStorage on store creation

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 1-1: Toolbar component, auth hook, shadcn/ui component library
- Story 1-1: Dark mode CSS setup (`:root` and `.dark` theme tokens in index.css)

**CONSUMED BY (outbound):**
- All subsequent stories benefit from theme/font preferences
- No direct story dependencies

### E2E Testing
- Action: CREATE
- Test File: `tests/e2e/settings-and-preferences.spec.ts`
- Result: PASS (14 tests, 2/2 deterministic runs, ~23s)
- Multi-User: SINGLE-USER
- Quality Score: 95/100 (TEA 5-Dimension: Determinism 18, Isolation 20, Maintainability 20, Coverage 20, Performance 17)
- Date: 2026-02-14

### E2E Testing (EXTEND — Font Size Visual Verification)
- Action: EXTEND
- Test File: `tests/e2e/settings-and-preferences.spec.ts`
- Result: PASS (16 tests, 2/2 deterministic runs, ~29.5s)
- New Test: "font size visual: all panels scale with small/medium/large (Inter)"
- Multi-User: SINGLE-USER
- Quality Score: 95/100 (TEA 5-Dimension: Determinism 20, Isolation 20, Maintainability 18, Coverage 20, Performance 17)
- Verification: Font sizes scale correctly across toolbar, toolbox, canvas nodes, inspector, and dashboard; node width stays 140px (AC-ARCH-NO-3)
- Date: 2026-02-15

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: Moderate
- Classification: STANDARD
- Sizing: MEDIUM (5 tasks, ~28 subtasks, 9 files)
- Agents consulted: Planner (Sonnet), Architect (Sonnet)

## Senior Developer Review (ECC)

**Date:** 2026-02-14
**Classification:** COMPLEX (12 files reviewed)
**Agents:** code-reviewer (Sonnet), security-reviewer (Sonnet), architect (Opus), tdd-guide (Haiku)

### Scores

| Agent | Score | Status |
|-------|-------|--------|
| Code Quality | 7/10 | CHANGES REQUESTED |
| Security | 8/10 | APPROVE |
| Architecture | 9/10 | APPROVE |
| Testing | 7/10 | CHANGES REQUESTED |
| **Overall** | **8/10** | **APPROVED** |

### Architectural ACs: 19/19 PASS

All file location (7), pattern (7), and anti-pattern (5) ACs verified and passing.

### Quick Fixes Applied

1. `fireEvent.click` -> `userEvent.click` in Toolbar.test.tsx (project pattern consistency)
2. Removed unused spy variable in preferencesStore.test.ts:87 (dead code)

### Tech Debt Created

- **TD-2-5a:** Settings test & polish — test coverage gaps (dropdown close, usePreferencesEffect integration), CSP meta tag, hook extraction
