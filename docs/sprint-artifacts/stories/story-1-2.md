# Story: 1-2 Component Data Pipeline & Toolbox Browsing

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library

## Overview

As a user, I want to browse available architecture components organized by category in a toolbox panel, so that I can discover and understand components before placing them on the canvas.

This story establishes the complete data pipeline from Firebase Firestore to the UI: Zod schemas (single source of truth for types), repository pattern (Firestore abstraction), component library service (two-layer cache with synchronous lookups), seed infrastructure, and the three-tab toolbox with component browsing, search/filter, and command palette.

## Functional Acceptance Criteria

**AC-1: Three-Tab Toolbox**
**Given** I am authenticated and on the main app
**When** I view the toolbox panel (left side)
**Then** I see three tabs: Components, Stacks, Blueprints
**And** the Components tab is active by default with component cards displayed
**And** the Stacks tab shows placeholder content with a "Coming in Phase 2" message
**And** the Blueprints tab shows placeholder content (populated in Epic 3 Story 3.3)

**AC-2: Component Browsing by Category**
**Given** I am on the Components tab
**When** I browse the component list
**Then** I see components organized by category (Compute, Data Storage, Caching, Messaging, etc.)
**And** each component displays a benefit card with IS / GAIN / COST / TAGS format (UX5)
**And** each category has its designated color and icon

**AC-3: Search and Filter**
**Given** I want to find a specific component
**When** I type in the search/filter field
**Then** the component list filters to show matching components by name or tag

**AC-4: Command Palette**
**Given** I want to quickly find a component or action
**When** I press Cmd+K (or Ctrl+K on Windows/Linux)
**Then** a command palette opens with a search input (UX12)
**And** I can search for components by name or category and select one to scroll to it in the toolbox

**AC-5: Component Library Loading**
**Given** the app loads
**When** the component library initializes
**Then** all component data is fetched from Firestore and cached in memory for synchronous access
**And** subsequent page loads use the local cache without additional network calls

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** ComponentSchema located at `src/schemas/componentSchema.ts`
- **AC-ARCH-LOC-2:** MetricSchema located at `src/schemas/metricSchema.ts`
- **AC-ARCH-LOC-3:** StackSchema located at `src/schemas/stackSchema.ts`
- **AC-ARCH-LOC-4:** BlueprintSchema located at `src/schemas/blueprintSchema.ts`
- **AC-ARCH-LOC-5:** Repository interfaces located at `src/repositories/types.ts`
- **AC-ARCH-LOC-6:** ComponentRepository located at `src/repositories/componentRepository.ts`
- **AC-ARCH-LOC-7:** ComponentLibrary service located at `src/services/componentLibrary.ts`
- **AC-ARCH-LOC-8:** useLibrary hook located at `src/hooks/useLibrary.ts`
- **AC-ARCH-LOC-9:** ToolboxPanel located at `src/components/toolbox/ToolboxPanel.tsx`
- **AC-ARCH-LOC-10:** ComponentCard located at `src/components/toolbox/ComponentCard.tsx`
- **AC-ARCH-LOC-11:** CommandPalette located at `src/components/toolbox/CommandPalette.tsx`
- **AC-ARCH-LOC-12:** Seed script located at `scripts/seed-firestore.ts`
- **AC-ARCH-LOC-13:** Component seed data at `src/data/components/*.yaml`
- **AC-ARCH-LOC-14:** Firestore security rules at `firestore.rules`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** All Firestore access goes through repository interfaces defined in `src/repositories/types.ts`
- **AC-ARCH-PATTERN-2:** Repositories validate all Firestore data with Zod `safeParse()` before returning
- **AC-ARCH-PATTERN-3:** ComponentLibrary service caches repository data in JavaScript Maps for O(1) synchronous lookups
- **AC-ARCH-PATTERN-4:** ComponentLibrary initializes on app startup via `initialize()` method before toolbox renders
- **AC-ARCH-PATTERN-5:** useLibrary hook provides synchronous access to cached data (no async calls during render)
- **AC-ARCH-PATTERN-6:** All TypeScript types derived from Zod schemas via `z.infer<typeof Schema>` — no duplicate interfaces
- **AC-ARCH-PATTERN-7:** YAML seed files use snake_case field naming; Zod schemas transform to camelCase at boundary
- **AC-ARCH-PATTERN-8:** Zustand store updates use immutable patterns (spread operators, new Set/Map instances)
- **AC-ARCH-PATTERN-9:** Components use Zustand selector pattern — subscribe only to required state slices
- **AC-ARCH-PATTERN-10:** Category colors and icons defined once in `src/lib/constants.ts` (single source of truth)

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** React components MUST NOT import Firestore SDK directly (`firebase/firestore`)
- **AC-ARCH-NO-2:** Components MUST NOT call componentLibrary service directly — only via useLibrary hook
- **AC-ARCH-NO-3:** Zustand state MUST NOT be mutated directly (no `state.set.add()` without creating new instance)
- **AC-ARCH-NO-4:** Component names, descriptions, tags MUST NOT be rendered with `dangerouslySetInnerHTML`
- **AC-ARCH-NO-5:** YAML parsing MUST NOT use `loadAll()` or allow arbitrary object instantiation — only safe `load()`
- **AC-ARCH-NO-6:** useLibrary hook MUST NOT make async Firestore calls during render
- **AC-ARCH-NO-7:** Firestore security rules MUST NOT allow write access to library collections for regular users
- **AC-ARCH-NO-8:** Seed script MUST NOT proceed if Zod validation fails on any component file
- **AC-ARCH-NO-9:** Standalone TypeScript interfaces MUST NOT duplicate Zod schema definitions
- **AC-ARCH-NO-10:** No `eval()`, `new Function()`, or dynamic `import()` on any data content

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| MetricSchema | `src/schemas/metricSchema.ts` | Zod schema | NEW |
| ComponentSchema | `src/schemas/componentSchema.ts` | Zod schema | NEW |
| StackSchema | `src/schemas/stackSchema.ts` | Zod schema | NEW |
| BlueprintSchema | `src/schemas/blueprintSchema.ts` | Zod schema | NEW |
| Repository interfaces | `src/repositories/types.ts` | Interface contracts | NEW |
| ComponentRepository | `src/repositories/componentRepository.ts` | Repository pattern | NEW |
| StackRepository | `src/repositories/stackRepository.ts` | Repository pattern | NEW |
| BlueprintRepository | `src/repositories/blueprintRepository.ts` | Repository pattern | NEW |
| ComponentLibrary | `src/services/componentLibrary.ts` | Service layer | NEW |
| useLibrary | `src/hooks/useLibrary.ts` | React hook | NEW |
| ToolboxPanel | `src/components/toolbox/ToolboxPanel.tsx` | React component | NEW |
| ComponentTab | `src/components/toolbox/ComponentTab.tsx` | React component | NEW |
| StackTab | `src/components/toolbox/StackTab.tsx` | React component | NEW |
| BlueprintTab | `src/components/toolbox/BlueprintTab.tsx` | React component | NEW |
| ComponentCard | `src/components/toolbox/ComponentCard.tsx` | React component | NEW |
| SearchFilter | `src/components/toolbox/SearchFilter.tsx` | React component | NEW |
| CommandPalette | `src/components/toolbox/CommandPalette.tsx` | React component | NEW |
| componentUtils | `src/lib/componentUtils.ts` | Utility functions | NEW |
| command (shadcn) | `src/components/ui/command.tsx` | shadcn/ui generated | NEW |
| Seed script | `scripts/seed-firestore.ts` | Admin script | NEW |
| Component YAML (x10) | `src/data/components/*.yaml` | Seed data | NEW |
| Firestore rules | `firestore.rules` | Security rules | NEW |
| uiStore | `src/stores/uiStore.ts` | Zustand store | MODIFY |
| constants | `src/lib/constants.ts` | Constants | MODIFY |
| types/index | `src/types/index.ts` | Type re-exports | MODIFY |
| AppLayout | `src/components/layout/AppLayout.tsx` | Layout component | MODIFY |

## Tasks / Subtasks

### Task 1: Zod Schemas & Type Foundation
- [x] 1.1 Create `metricSchema.ts` — MetricValueSchema (id, value low/medium/high, numericValue 1-10, category), MetricCategorySchema, export inferred types
- [x] 1.2 Create `componentSchema.ts` — ConfigVariantSchema (id, name, metrics, codeSnippet, metricExplanations), ConnectionPropertiesSchema, ComponentSchema (id, name, category, description, is, gain, cost, tags, baseMetrics, configVariants, compatibility), use `.strict()`, snake_case→camelCase transforms
- [x] 1.3 Create `stackSchema.ts` — StackSchema (id, name, description, componentIds, tags)
- [x] 1.4 Create `blueprintSchema.ts` — BlueprintSchema (id, name, description, tier)
- [x] 1.5 Update `types/index.ts` — re-export all Zod-inferred types
- [x] 1.6 Write unit tests for all schemas (valid data, invalid data, transforms, `.strict()` rejects unknowns)

### Task 2: Repository Layer
- [x] 2.1 Define repository interfaces in `repositories/types.ts` — ComponentRepository (getAll, getById, getByCategory), StackRepository (getAll), BlueprintRepository (getAll)
- [x] 2.2 Implement `componentRepository.ts` — Firestore queries + Zod validation + error handling (log + return empty on failure)
- [x] 2.3 Implement `stackRepository.ts` and `blueprintRepository.ts` — same pattern
- [x] 2.4 Write unit tests — mock Firestore SDK, test validation, test error handling, test graceful degradation

### Task 3: Component Library Service & Hook
- [x] 3.1 Implement `componentLibrary.ts` — singleton, initialize() loads all repos into Maps, synchronous getters (getComponent, getAllComponents, getComponentsByCategory, searchComponents), isInitialized() guard
- [x] 3.2 Implement `useLibrary.ts` hook — wraps service, exposes { components, loading, error, getComponentById, getComponentsByCategory, searchComponents }
- [x] 3.3 Integrate initialization in App.tsx — call componentLibrary.initialize() after auth, show loading state, handle errors with toast
- [x] 3.4 Write unit + integration tests for service and hook

### Task 4: Seed Infrastructure
- [x] 4.1 Generate 10 component YAML files (across 6 categories: Data Storage, Compute, Messaging, Delivery/Network, Real-Time, Monitoring) — each with 2-3 config variants, metrics, IS/GAIN/COST, tags
- [x] 4.2 Create `scripts/seed-firestore.ts` — Firebase Admin SDK, read YAML, validate with Zod, batch write, write _metadata doc, --dry-run flag
- [x] 4.3 Create/update `firestore.rules` — read-only for authenticated users on components/stacks/blueprints/_metadata
- [x] 4.4 Add npm script: `"seed:firestore"` in package.json

### Task 5: UI Store & Constants Extension
- [x] 5.1 Update `uiStore.ts` — add toolboxTab, searchQuery, commandPaletteOpen states + actions (setToolboxTab, setSearchQuery, setCommandPaletteOpen)
- [x] 5.2 Update `constants.ts` — add COMPONENT_CATEGORIES with colors and icons (10 categories), add category icon SVG paths or inline definitions

### Task 6: Toolbox UI Components
- [x] 6.1 Install shadcn/ui command component: `npx shadcn@latest add command tabs scroll-area badge input`
- [x] 6.2 Create `ComponentCard.tsx` — benefit card with IS / GAIN / COST / TAGS, category color stripe, hover state
- [x] 6.3 Create `SearchFilter.tsx` — search input bound to uiStore.searchQuery, clear button
- [x] 6.4 Create `ComponentTab.tsx` — consume useLibrary, filter by searchQuery, group by category with collapsible headers, render ComponentCards
- [x] 6.5 Create `StackTab.tsx` — placeholder "Coming in Phase 2"
- [x] 6.6 Create `BlueprintTab.tsx` — placeholder "Populated in Epic 3 Story 3.3"
- [x] 6.7 Create `ToolboxPanel.tsx` — shadcn Tabs (Components/Stacks/Blueprints), SearchFilter at top, active tab content
- [x] 6.8 Create `CommandPalette.tsx` — shadcn Command dialog, Cmd+K / Ctrl+K keyboard shortcut, search components, select to scroll in toolbox
- [x] 6.9 Update `AppLayout.tsx` — replace toolbox placeholder with `<ToolboxPanel />`
- [x] 6.10 Write unit tests for key components (ComponentCard, SearchFilter, ComponentTab, ToolboxPanel, CommandPalette)

### Task 7: Verification & Polish
- [x] 7.1 Run `npm run test:quick` — all tests pass
- [x] 7.2 Run `npx tsc --noEmit` — no type errors
- [x] 7.3 Verify coverage meets thresholds (Lines 45%, Branches 30%, Functions 25%, Statements 40%)
- [x] 7.4 Manual smoke test — login, see toolbox, browse components, search, Cmd+K

## Tech Debt

- **TD-1-2A**: [Schema Alignment & Seed Script Consolidation](td-1-2a-schema-alignment.md) — Seed script schema duplication (#5) and missing Stack/Blueprint YAML transform variants (#17)

## Dev Notes

### Architecture Guidance

**Data Pipeline (this is the core loop):**
```
Firestore → Repository (Zod validate) → ComponentLibrary (cache in Maps) → useLibrary hook → React components
```

**Implementation Order:** Schemas first (data contract), then repositories (data access), then service (cache), then seed (populate), then UI (consume). Each layer independently testable.

**Key Architecture Patterns:**
1. **Repository Pattern:** ALL Firestore access goes through `*Repository.ts`. Components/hooks NEVER import `firebase/firestore` directly.
2. **Zod-First Types:** Define Zod schemas first, derive TypeScript types with `z.infer<typeof Schema>`. NEVER create standalone interfaces that duplicate schema definitions.
3. **Service Layer:** `componentLibrary.ts` orchestrates data loading and caching. Called via useLibrary hook from components.
4. **Zustand Selectors:** Components use selectors to subscribe to only what they need — `const tab = useUiStore((s) => s.toolboxTab)` not `const store = useUiStore()`.
5. **Immutable Updates:** Always create NEW Set/Map instances in Zustand. Never mutate state directly.

**Category System (10 categories):**
Compute, Data Storage, Caching, Messaging, Delivery/Network, Real-Time, Auth/Security, Monitoring, Search, DevOps — each with designated color and icon from UX spec.

**Component Benefit Card Format (UX5):**
- IS: What it fundamentally is (1-2 lines)
- GAIN: Primary benefits (bullet list, max 3)
- COST: Trade-offs and limitations (bullet list, max 3)
- TAGS: Category badges

### Technical Notes

**Database (from DB Reviewer):**
- Firestore document IDs: kebab-case strings (deterministic seeding)
- No composite indexes needed for MVP — loading all docs at startup
- Two-layer cache: Firestore SDK persistent cache (IndexedDB, automatic) + in-memory Maps (per-session)
- Seed script must be idempotent (safe to re-run)
- MVP data size ~200KB — trivial for both IndexedDB and memory

**Security (from Security Reviewer):**
- All OWASP Top 10 threats assessed LOW risk
- Firestore rules: read-only for authenticated users, deny writes for regular users
- YAML seed parsing: safe `load()` only (js-yaml v4+), validate with Zod before writing
- XSS prevention: React default escaping, never `dangerouslySetInnerHTML` with library data
- Environment variables: `VITE_FIREBASE_*` are public config only, admin SDK key in env only
- No user-controlled input in this story (toolbox displays library data, search runs against cache)

**External Dependency:**
- `cmdk` library via `npx shadcn@latest add command` — provides command palette component

**Common Pitfalls:**
- `Set` objects in Zustand: always create NEW Set instances, never `.add()` on existing
- Default `[]` or `{}` in hook dependencies cause infinite re-render loops
- Firestore `getDocs` returns QuerySnapshot — iterate `.docs` array, validate each
- Category colors: use CSS variables for dark mode compatibility

### Cross-Cutting Dependencies

This story creates foundational layers consumed by ALL future stories:
- **Zod schemas** → used by YAML import (Epic 3), recalculation engine (Epic 2), intelligence features (Epic 4)
- **Repository pattern** → used by all data access throughout the app
- **ComponentLibrary service** → used by recalculation service, canvas, inspector
- **uiStore extensions** → pattern replicated for inspector/dashboard state

No inbound DEPENDS tags (this story depends only on Story 1.1 which is in review).

### E2E Testing

E2E coverage recommended — run `/ecc-e2e story-1-2` after implementation.

Key E2E scenarios:
- Login → see toolbox → three tabs visible
- Browse Components tab → categories visible with colored headers
- Search filter → matching components shown
- Cmd+K → command palette opens → search → select → scrolls in toolbox

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: Moderate-to-Complex
- Sizing: LARGE (7 tasks, ~35 subtasks, ~25 source files)
- Agents consulted: Planner, Architect, Database Reviewer, Security Reviewer
