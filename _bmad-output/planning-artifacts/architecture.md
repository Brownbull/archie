---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-02-10'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-archie-2026-02-09.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/archie-ux-playground.html'
  - 'docs/brainstorming/00-project-vision.md'
  - 'docs/brainstorming/01-cross-pollination-ideas.md'
  - 'docs/brainstorming/02-morphological-analysis.md'
  - 'docs/brainstorming/03-six-thinking-hats.md'
  - 'docs/brainstorming/04-constraint-mapping-mvp.md'
workflowType: 'architecture'
project_name: 'archie'
user_name: 'Gabe'
date: '2026-02-10'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (30 FRs, 6 capability areas):**

| Area | FRs | Architectural Implication |
|------|-----|--------------------------|
| Architecture Composition | FR1-FR7 | Canvas interaction layer: drag-and-drop, connection management, visual warnings. React Flow handles rendering; state management tracks component placement and wiring. |
| Component System | FR8-FR12 | Component data model with two-level selection (type + config variant). Toolbox needs tabbed browsing, detail cards, and in-place component swapping that preserves connections. |
| Trade-off Visualization | FR13-FR19 | Core engine: graph-based metric propagation. Config change triggers deterministic recalculation across connected nodes. Heatmap overlay, multi-track scoring dashboard, per-component and aggregate ratings. |
| Architecture Assessment | FR20-FR22 | Tier evaluation system that analyzes the current component graph against defined architectural principles. Must show current tier and gap to next tier. |
| Data Import & Export | FR23-FR27 | YAML parser/serializer with schema validation, lossless round-trip guarantee, security hardening (size limits, field allowlisting, URL validation). |
| Content Library | FR28-FR30 | Bundled example architectures (2-3), pre-populated with full component definitions, connections, and metrics. Static AI prompt template. |

**Non-Functional Requirements (11 NFRs, 2 categories):**

| Category | NFRs | Key Targets |
|----------|------|-------------|
| Performance | NFR1-NFR5 | Canvas <100ms, recalculation <200ms, heatmap sync with recalc, import <1s (20 components), initial load <3s |
| Security | NFR6-NFR11 | Schema validation on import, 1MB file limit, DOM sanitization of all YAML strings, URL allowlisting (https only), no eval/dynamic import, clean exports |

**Scale & Complexity:**

- Primary domain: Client-side interactive web application (canvas/graph tooling)
- Complexity level: Medium
- Estimated architectural components: 8-12 distinct modules (schema layer, recalculation engine, canvas/React Flow integration, toolbox, inspector, dashboard, tier system, import/export, state management, component library data)

### Technical Constraints & Dependencies

| Constraint | Type | Impact |
|-----------|------|--------|
| Client-side only (no backend) | Hard | All computation, state, validation in browser. No API latency, no server costs, but no fallback for compute-heavy operations. |
| React + React Flow | Hard | Canvas rendering delegated to React Flow. Architecture must compose cleanly with React Flow's node/edge model. |
| Tailwind CSS + shadcn/ui | Soft | UI component library decision already made. Application shell components (tabs, dropdowns, cards, tooltips) pre-built. |
| YAML as sole persistence | Hard | No database, no localStorage for MVP. File-based import/export is the save system. Schema versioning needed from Day 1. |
| Vite build tooling | Soft | Fast dev server, optimized production builds. Standard React/TypeScript setup. |
| Desktop-first (1280px+) | Hard | No mobile support. Canvas precision interactions require mouse. Minimum 1280px viewport assumed. |
| Modern browsers only | Soft | Chrome, Firefox, Safari, Edge (latest 2 versions). No polyfills, no legacy support. |
| Solo developer | Hard | Architecture must be buildable incrementally by one person. Complexity ceiling matters. |
| AI-generated component data | Soft | Component library content created at build time, not runtime. No AI API calls in the application. |
| 10-20 components per architecture (MVP) | Soft | Performance targets scoped to this range. No need to optimize for 100+ component graphs yet. |

### Cross-Cutting Concerns Identified

1. **YAML Schema & Validation** — Defines the data contract for the entire system. Components, stacks, blueprints, and the recalculation engine all depend on this schema. Security validation (NFR6-11) must be enforced at the boundary (import) and trusted internally.

2. **Metric Recalculation Engine** — The computational core. Traverses the component graph, applies base metrics + config variant modifiers + connection interactions, produces updated metric values for every affected node. Must be deterministic, fast (<200ms), and testable in isolation.

3. **Application State Management** — Canvas state (node positions, connections), component state (selected type, active config variant), computed state (metric values, heatmap colors, tier assessment, dashboard scores) must all stay synchronized. A config variant change triggers a cascade: recalculation → heatmap update → dashboard update → tier reassessment.

4. **Component Graph Data Structure** — The in-memory representation of the architecture. Nodes (components with ports), edges (connections between ports), compatibility rules, and propagation paths. This structure is read by the recalculation engine, written by canvas interactions, serialized to/from YAML.

5. **Security Boundary at YAML Import** — All untrusted data enters through YAML file import. Validation, sanitization, and rejection happen at this single entry point. Once validated, internal code can trust the data. DOM rendering must still escape strings as a defense-in-depth layer (React handles this by default).

## Starter Template Evaluation

### Primary Technology Domain

Client-side interactive web application (SPA) — React-based canvas tooling with no backend dependency.

### Starter Options Considered

| Option | Approach | Verdict |
|--------|----------|---------|
| Vite `react-ts` + manual setup | Minimal template, add each dependency individually | Viable but more manual steps |
| **shadcn/ui Vite guide** | Vite template → shadcn/ui init (configures Tailwind + components + aliases) | **Selected** — officially documented, clean, complete |
| Community boilerplate | Pre-bundled starter repo | Rejected — maintenance risk, opinionated choices |

### Selected Starter: Vite + React TypeScript + shadcn/ui Init

**Rationale:** The shadcn/ui Vite installation guide is the officially maintained path for this exact stack. It handles Tailwind CSS v4 configuration, path aliases, and component system setup in a single `npx shadcn@latest init` command. All additional libraries (React Flow, Vitest, Playwright, js-yaml) layer on independently.

**Initialization Sequence:**

```bash
# 1. Create Vite project with React + TypeScript
npm create vite@latest archie -- --template react-ts
cd archie
npm install

# 2. Initialize shadcn/ui (configures Tailwind CSS v4, path aliases, component system)
npx shadcn@latest init

# 3. Add React Flow for canvas
npm install @xyflow/react

# 4. Add YAML parsing
npm install js-yaml
npm install -D @types/js-yaml

# 5. Add testing infrastructure
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D playwright @playwright/test
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript (strict mode) via Vite's `react-ts` template
- React 19+ with functional components and hooks
- ES modules throughout

**Styling Solution:**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (first-party Vite integration, zero PostCSS config)
- shadcn/ui components copied into `src/components/ui/` (owned source, not dependency)
- CSS custom properties for design tokens (colors, spacing, radii)

**Build Tooling:**
- Vite (fast dev server with HMR, optimized production builds)
- SWC or Babel for JSX transform (Vite default)
- Static output for deployment to Vercel/Netlify/GitHub Pages

**Testing Framework:**
- Vitest 4.x for unit and integration tests (Vite-native, fast)
- Playwright for E2E tests (desktop viewport, canvas interactions)
- @testing-library/react for component testing

**Code Organization:**
- Path alias `@/*` → `./src/*` (configured by shadcn/ui init)
- shadcn/ui components in `src/components/ui/`
- Custom components alongside in `src/components/`

**Development Experience:**
- Vite HMR for instant feedback during development
- TypeScript strict mode for type safety
- Tailwind IntelliSense (VS Code extension) for class autocomplete

**Note:** Project initialization using this sequence should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. State management: Zustand
2. Data architecture: Skeleton YAML + Repository pattern + Firebase Firestore
3. Schema validation: Zod (single source of truth for types AND runtime validation)
4. Component library storage: Firebase Firestore from Day 1, seeded from AI-generated YAML files
5. Authentication: Firebase Auth (Google provider) from Day 1

**Important Decisions (Shape Architecture):**
6. Graceful degradation on unknown component IDs (placeholders, not rejection)
7. Routing: React Router (minimal — login page + app)
8. Hosting: Firebase Hosting
9. CI/CD: GitHub Actions + Firebase deploy

**Deferred Decisions (Post-MVP):**
- Additional auth providers beyond Google
- Complex routing (community pages, profile pages, etc.)
- Advanced Firestore features (real-time listeners, offline sync optimization)

### Data Architecture

**Core Principle: Skeleton YAML + Rich Library Data**

The architecture file (YAML) that users create and export contains only the skeleton — component IDs, configuration variant selections, canvas positions, and connections. It does NOT contain metrics, pros/cons, descriptions, or other reference data.

The component library holds all the rich reference data (metrics, descriptions, config variant definitions, compatibility rules). When a YAML is imported, the app hydrates the skeleton by looking up component IDs from the library.

**Data Layers:**

| Layer | Contains | Storage |
|-------|----------|---------|
| Architecture File (YAML) | Component IDs, config selections, positions, connections | User's file system (import/export) |
| Component Library (reference data) | Metrics, descriptions, config variants, pros/cons, compatibility | Firebase Firestore — seeded once via admin script |
| Runtime State (Zustand) | Hydrated architecture + computed state (recalculated metrics, heatmap, tier) | In-memory |

**Database: Firebase Firestore**
- Cloud document database in the same Firebase project as Auth and Hosting
- Seeded once from AI-generated YAML files via admin script (`scripts/seed-firestore.ts`)
- Repository pattern abstracts data access — all code reads through `ComponentRepository`, `StackRepository`, `BlueprintRepository` interfaces
- Firestore offline persistence provides automatic local caching after first load
- Component library data loaded once at startup and cached in memory for synchronous access by the recalculation engine
- Firestore security rules: component library is read-only for authenticated users; admin writes via service account

**Schema Validation: Zod**
- Single source of truth for TypeScript types AND runtime validation
- Validates both user-imported YAML files and component library data
- `safeParse()` for graceful error handling with detailed error messages

**YAML Schema Versioning:**
- Every exported YAML file includes `schema_version: "1.0.0"` in its metadata block
- Semver rules: Major = breaking (field removed, type changed). Minor = additive (new optional field). Patch = documentation only
- Import behavior on version mismatch:
  - Same major, newer minor → import normally (new fields get defaults)
  - Older major → attempt migration if migration function exists, otherwise reject with clear error ("This file uses schema v1.x but the app requires v2.x")
  - Newer major → reject ("This file was created with a newer version of Archie")
- Zod implementation: version-specific schemas (`ArchitectureFileSchemaV1`, `ArchitectureFileSchemaV2`) with a dispatcher that reads the version field first and routes to the correct schema
- Migration registry: a map of `{ "1→2": migrationFn }` for supported upgrade paths

**Unknown Component Handling:**
- Import files referencing unknown component IDs: load what is recognized, display placeholders for unknowns
- Consistent with WARN philosophy — don't block the user, show them what's missing

**Updated Initialization Sequence:**

```bash
# 1. Create Vite project with React + TypeScript
npm create vite@latest archie -- --template react-ts
cd archie && npm install

# 2. Initialize shadcn/ui (configures Tailwind CSS v4, path aliases, component system)
npx shadcn@latest init

# 3. Add React Flow for canvas
npm install @xyflow/react

# 4. Add YAML parsing
npm install js-yaml
npm install -D @types/js-yaml

# 5. Add testing infrastructure
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D playwright @playwright/test

# 6. Add Firebase (auth + Firestore + hosting)
npm install firebase

# 7. Add routing (minimal — login + app)
npm install react-router-dom

# 8. Add Zod (schema validation)
npm install zod
```

### Authentication & Security

**Firebase Auth with Google Provider (Day 1)**
- Google Sign-In as the sole auth method for MVP
- Firebase Auth SDK handles all auth complexity (tokens, session persistence, state management)
- `onAuthStateChanged` listener manages auth state in the app
- Protected route pattern: unauthenticated users see login page, authenticated users see the app
- No custom backend auth — Firebase Auth is a standalone service

**Why from Day 1:**
- Firebase Hosting is already chosen — same project, zero additional infrastructure
- Adding auth later means retrofitting every component that touches user identity
- Google Auth is one sign-in button + a few lines of Firebase config
- Sets up user identity for Firestore security rules and community features

**MVP Security (from NFRs):**
- YAML import validation via Zod schemas (NFR6)
- 1MB file size limit (NFR7)
- String sanitization handled by React's default escaping (NFR8)
- URL validation for `https://` only (NFR9)
- No `eval()`, `new Function()`, or dynamic `import()` on user content (NFR10)
- Firebase Auth config: only `VITE_FIREBASE_*` public config exposed (no secrets client-side)

### API & Communication Patterns

**Firebase SDKs only.** No custom backend APIs. All computation is client-side. Firebase Auth SDK handles authentication; Firestore SDK handles component library reads. Both communicate directly with Firebase services — no intermediary server.

### Frontend Architecture

**State Management: Zustand**
- Lightweight (1KB), simple API, targeted re-renders
- Manages application state: selected component, active config variant, metric values, heatmap state, tier assessment, dashboard scores
- Composes alongside React Flow's built-in node/edge state (React Flow manages canvas layout, Zustand manages application domain state)

**Component Architecture:**
- React functional components with hooks
- shadcn/ui for application shell (toolbox, inspector, toolbar, dialogs)
- Custom React Flow nodes/edges for canvas components
- Path alias `@/*` → `./src/*`

**Routing: React Router (Minimal)**
- Two routes: `/login` (public) and `/` (protected)
- Auth guard wrapper redirects unauthenticated users to login
- No complex routing — just a login gate in front of the single-view app

**Performance Strategy:**
- React Flow handles canvas virtualization and rendering optimization
- Zustand's selector pattern prevents unnecessary re-renders
- Recalculation engine is pure functions — memoizable and testable in isolation
- Component library data loaded once from Firestore at startup, cached in memory for synchronous engine access

### Infrastructure & Deployment

**Hosting: Firebase Hosting**
- Same Firebase project as Auth (single platform for everything)
- Global CDN (Google infrastructure), free tier: 10GB bandwidth/month
- Preview channels for PR deployments (via GitHub Actions)
- Auth + Firestore + Hosting all under one Firebase project from Day 1

**CI/CD: GitHub Actions**
- PR to `dev` → run Vitest + TypeScript build check + Firebase preview deploy
- Merge to `main` → auto-deploy to Firebase Hosting production
- Uses `firebase-tools` CLI in GitHub Actions workflow

**Firebase Project Setup (first implementation story):**
1. Create Firebase project in console
2. Enable Google Auth provider
3. Create Firestore database + deploy security rules
4. `firebase init hosting` in project root
5. Configure GitHub Actions for preview + production deploy
6. Run `scripts/seed-firestore.ts` to populate component library

### Decision Impact Analysis

**Implementation Sequence:**
1. Project scaffolding (Vite + shadcn/ui + all dependencies)
2. Firebase project setup + Auth integration + Firestore + login page
3. Zod schemas (data contract — everything depends on this)
4. Firestore security rules + repository interfaces
5. Component library seed script + seed data (AI-generated YAML → Firestore)
6. Component library service (Firestore → in-memory cache)
7. Zustand stores (architecture state, UI state)
8. React Flow canvas integration
9. Recalculation service + engine (pure functions)
10. UI panels (toolbox, inspector, dashboard)

**Cross-Component Dependencies:**
- Zod schemas → used by YAML import validation and Firestore data validation
- Repository pattern → consumed by component library service, recalculation service, and import/export logic
- Component library service → caches Firestore data in memory; provides sync lookups to recalculation service
- Recalculation service → orchestrates data assembly from library cache + engine computation; called by Zustand store actions
- Zustand stores → consumed by all React components (canvas, toolbox, inspector, dashboard)
- Firebase Auth → gates access to the app; user identity used by Firestore security rules

## Implementation Patterns & Consistency Rules

### Naming Patterns

**File Naming:**

| What | Convention | Example |
|------|-----------|---------|
| React components | PascalCase `.tsx` | `ComponentCard.tsx`, `MetricDashboard.tsx` |
| Hooks | camelCase with `use` prefix `.ts` | `useArchitectureStore.ts`, `useRecalculation.ts` |
| Utilities/helpers | camelCase `.ts` | `metricCalculator.ts`, `yamlSerializer.ts` |
| Zod schemas | camelCase with `Schema` suffix `.ts` | `componentSchema.ts`, `blueprintSchema.ts` |
| Types (standalone) | camelCase `.types.ts` | `architecture.types.ts` |
| Constants | camelCase `.ts` | `metricCategories.ts`, `tierDefinitions.ts` |
| Test files | match source name `.test.ts(x)` | `metricCalculator.test.ts` |

**Code Naming:**

| What | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ToolboxPanel`, `InspectorCard` |
| Functions | camelCase, verb-first | `calculateMetrics()`, `hydrateArchitecture()` |
| Variables | camelCase | `activeComponent`, `heatmapColors` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `METRIC_CATEGORIES` |
| Zustand stores | `use` + domain + `Store` | `useArchitectureStore`, `useUiStore` |
| Firestore collections | camelCase, plural | `components`, `stacks`, `blueprints` |
| Zod schemas | PascalCase + `Schema` | `ComponentSchema`, `BlueprintSchema` |
| TypeScript types/interfaces | PascalCase, no `I` prefix | `Component`, `ConfigVariant`, `MetricValue` |
| React Flow node types | kebab-case string identifiers | `'archie-component'`, `'archie-group'` |

**YAML Field Naming:**
- snake_case for all YAML fields (standard YAML convention)
- Example: `base_metrics`, `config_variant`, `component_id`
- Zod schemas transform snake_case YAML → camelCase TypeScript at the validation boundary

### Structure Patterns

**Component Organization: Feature-based**

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components (auto-generated)
│   ├── canvas/                # React Flow canvas components
│   │   ├── ArchieNode.tsx     # Custom React Flow node
│   │   ├── ArchieEdge.tsx     # Custom React Flow edge
│   │   └── CanvasView.tsx     # Canvas container
│   ├── toolbox/               # Three-Tab Toolbox panel
│   │   ├── ToolboxPanel.tsx
│   │   ├── ComponentTab.tsx
│   │   ├── StackTab.tsx
│   │   └── BlueprintTab.tsx
│   ├── inspector/             # Right-side inspector panel
│   │   ├── InspectorPanel.tsx
│   │   ├── MetricCard.tsx
│   │   └── ConfigSelector.tsx
│   ├── dashboard/             # Bottom scoring dashboard
│   │   ├── DashboardPanel.tsx
│   │   └── CategoryBar.tsx
│   ├── heatmap/               # Heatmap overlay logic
│   │   └── HeatmapProvider.tsx
│   └── auth/                  # Login page, auth guard
│       ├── LoginPage.tsx
│       └── AuthGuard.tsx
├── stores/                    # Zustand stores
│   ├── architectureStore.ts   # Canvas state, components, connections
│   └── uiStore.ts            # UI state (selected tab, panel visibility)
├── repositories/              # Repository pattern (Firestore-backed)
│   ├── types.ts               # Repository interfaces (contracts)
│   ├── componentRepository.ts # Firestore component collection access
│   ├── stackRepository.ts     # Firestore stack collection access
│   └── blueprintRepository.ts # Firestore blueprint collection access
├── schemas/                   # Zod schemas (single source of truth)
│   ├── componentSchema.ts
│   ├── stackSchema.ts
│   ├── blueprintSchema.ts
│   └── architectureFileSchema.ts  # YAML import/export schema
├── engine/                    # Recalculation engine (pure functions)
│   ├── recalculator.ts        # Core metric recalculation
│   ├── propagator.ts          # Graph traversal + propagation
│   ├── heatmapCalculator.ts   # Heatmap color computation
│   └── tierEvaluator.ts       # Architecture tier assessment
├── services/                  # Orchestration layer
│   ├── yamlImporter.ts        # YAML import pipeline (parse → validate → hydrate)
│   ├── yamlExporter.ts        # YAML export pipeline (dehydrate → serialize)
│   ├── componentLibrary.ts    # Loads Firestore data into memory cache; provides sync lookups
│   └── recalculationService.ts # Orchestrates: cache lookup → engine computation → results
├── data/                      # Seed data + static content
│   ├── components/            # AI-generated component YAML files (for Firestore seeding)
│   ├── stacks/                # Stack definitions (for Firestore seeding)
│   ├── blueprints/            # Example architecture blueprints (for Firestore seeding)
│   └── prompt-template.md     # FR30: AI prompt template for YAML generation
├── lib/                       # Shared utilities
│   ├── firebase.ts            # Firebase config + initialization (Auth + Firestore)
│   └── constants.ts           # App-wide constants
└── types/                     # Shared TypeScript types (generated from Zod schemas)
```

**Test Structure: Separate `tests/` directory mirroring `src/`**

```
tests/
├── unit/                      # Mirrors src/ structure
│   ├── engine/
│   │   ├── recalculator.test.ts
│   │   └── propagator.test.ts
│   ├── schemas/
│   │   └── componentSchema.test.ts
│   ├── repositories/
│   │   └── componentRepository.test.ts
│   └── services/
│       ├── componentLibrary.test.ts
│       └── recalculationService.test.ts
├── integration/
│   ├── yamlRoundTrip.test.ts
│   └── recalculationPipeline.test.ts
└── e2e/
    ├── import-export.spec.ts
    └── canvas-interactions.spec.ts
```

### State Management Patterns

**Zustand Store Rules:**

1. **One store per domain**, not one giant store:
   - `useArchitectureStore` — nodes, edges, active config variants, metric values
   - `useUiStore` — selected tab, panel visibility, selected component ID

2. **Immutable updates always** — never mutate state directly:
   ```typescript
   // GOOD
   set((state) => ({ nodes: [...state.nodes, newNode] }))
   // BAD — never do this
   state.nodes.push(newNode)
   ```

3. **Selectors for derived data** — components subscribe to only what they need:
   ```typescript
   // GOOD — only re-renders when selectedNodeId changes
   const selectedId = useArchitectureStore((s) => s.selectedNodeId)
   // BAD — re-renders on ANY store change
   const store = useArchitectureStore()
   ```

4. **Actions live in the store**, not in components:
   ```typescript
   // Store defines the action
   actions: {
     changeConfigVariant: (nodeId, variantId) => { ... }
   }
   // Component calls it
   const changeConfig = useArchitectureStore((s) => s.changeConfigVariant)
   ```

### Data Access Patterns

**Repository Pattern Rules:**

1. **All data access goes through repositories** — never query Firestore directly from components or stores:
   ```typescript
   // GOOD
   const components = await componentRepository.getAll()
   // BAD
   const components = await getDocs(collection(db, 'components'))
   ```

2. **Repositories return validated, typed data** — Zod validation happens inside the repository, consumers get clean types.

3. **Repository interface is the contract** — the Firestore implementation is swappable if needed:
   ```typescript
   interface ComponentRepository {
     getAll(): Promise<Component[]>
     getById(id: string): Promise<Component | null>
     getByCategory(category: string): Promise<Component[]>
   }
   ```

4. **Component library service caches repository data** — at startup, `componentLibrary.initialize()` calls repositories to load all data into in-memory Maps. The recalculation service reads from this cache synchronously — no async calls during metric computation.

### Error Handling Patterns

**Three error categories, three handling approaches:**

| Category | Example | Handling |
|----------|---------|----------|
| **Validation errors** | Invalid YAML structure, unknown fields | Show inline error with Zod error details. Don't crash. |
| **Data errors** | Unknown component ID, missing config variant | Graceful degradation — placeholder component, WARN indicator |
| **System errors** | Firestore read failure, Firebase Auth error | Toast notification, fallback behavior, console error for debugging |

**Error display pattern:**
- Validation errors → inline messages near the action (import dialog, inspector panel)
- Warnings → toast notifications (shadcn/ui Sonner or similar)
- System errors → toast + console.error for debugging

### Process Patterns

**YAML Import Pipeline (always this order):**
1. File size check (reject > 1MB)
2. Parse YAML string → raw object (js-yaml)
3. Validate structure with Zod schema → reject or continue
4. Sanitize string fields (URL validation, field allowlisting)
5. Hydrate from component library (lookup IDs → full data)
6. Place unknowns as placeholders
7. Trigger recalculation engine
8. Update Zustand store → canvas renders

**Config Change Pipeline (always this order):**
1. User selects new config variant (dropdown)
2. Zustand store action calls `recalculationService.run(graph, nodeId)`
3. Service reads component data from in-memory cache (synchronous)
4. Service calls engine pure functions on affected subgraph
5. Service returns: new metric values, heatmap colors, tier assessment
6. Store updates all computed state in a single batch
7. React re-renders only affected components (Zustand selectors)

**Loading States:**
- `isLoading` boolean per async operation (not global)
- Skeleton components (shadcn/ui) for data loading
- No full-page spinners — load progressively

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow the file/folder structure defined above — no creating new top-level `src/` directories without discussion
- Use the repository pattern for ALL Firestore access — never import Firestore SDK directly in components or stores
- Use the component library service for data lookups — never query repositories from inside engine functions
- Use Zustand selectors — never destructure the entire store
- Define Zod schemas first, derive TypeScript types from them — never create standalone interfaces that duplicate schema definitions
- Keep the recalculation engine as pure functions — no React hooks, no Zustand imports, no Firestore imports, no side effects inside engine functions
- Use the recalculation service to orchestrate: data assembly → engine computation → result return
- Use snake_case in YAML files and camelCase in TypeScript — Zod transforms at the boundary

## Project Structure & Boundaries

### Complete Project Directory Structure

```
archie/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # PR checks: lint, typecheck, test
│       ├── deploy-preview.yml        # Firebase preview on PR to dev
│       └── deploy-production.yml     # Firebase production on merge to main
├── .claude/                          # Claude Code commands and settings
├── _bmad/                            # BMAD suite (planning workflows)
├── _bmad-output/                     # Generated planning artifacts
├── _ecc/                             # ECC development workflows
├── docs/                             # Project documentation
│   ├── brainstorming/                # Brainstorming artifacts
│   └── sprint-artifacts/             # Sprint tracking (when development begins)
├── public/
│   ├── favicon.ico
│   └── assets/
│       └── icons/                    # Component category icons (SVG)
├── src/
│   ├── main.tsx                      # App entry point
│   ├── App.tsx                       # Root component (router + auth + providers)
│   ├── index.css                     # Tailwind CSS entry (@import "tailwindcss")
│   ├── vite-env.d.ts                 # Vite type declarations
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (auto-generated)
│   │   ├── canvas/                   # FR1-FR7: Architecture Composition
│   │   │   ├── ArchieNode.tsx        # Custom React Flow node (component on canvas)
│   │   │   ├── ArchieEdge.tsx        # Custom React Flow edge (connection line)
│   │   │   ├── CanvasView.tsx        # Canvas container + React Flow provider
│   │   │   ├── ConnectionWarning.tsx # FR7: WARN overlay on incompatible connections
│   │   │   └── PlaceholderNode.tsx   # Unknown component placeholder
│   │   ├── toolbox/                  # FR8-FR12: Component System
│   │   │   ├── ToolboxPanel.tsx      # Three-tab container
│   │   │   ├── ComponentTab.tsx      # FR8: Browse components
│   │   │   ├── StackTab.tsx          # FR8: Browse stacks
│   │   │   ├── BlueprintTab.tsx      # FR8: Browse blueprints + FR28 examples
│   │   │   ├── ComponentCard.tsx     # FR9: Benefit card (IS/GAIN/COST)
│   │   │   └── SearchFilter.tsx      # Toolbox search/filter
│   │   ├── inspector/                # FR9-FR12, FR18: Component details
│   │   │   ├── InspectorPanel.tsx    # Right-side panel container
│   │   │   ├── ComponentDetail.tsx   # FR9: Full detail card
│   │   │   ├── ConfigSelector.tsx    # FR11-FR12: Config variant dropdown
│   │   │   ├── ComponentSwapper.tsx  # FR10: In-place component type swap
│   │   │   └── MetricCard.tsx        # FR18: Per-component metric display
│   │   ├── dashboard/                # FR17, FR19-FR22: Scoring + Tiers
│   │   │   ├── DashboardPanel.tsx    # Bottom panel container
│   │   │   ├── CategoryBar.tsx       # FR17: Single category score bar
│   │   │   ├── AggregateScore.tsx    # FR19: Architecture-level ratings
│   │   │   └── TierBadge.tsx         # FR20-FR22: Tier display + gap info
│   │   ├── heatmap/                  # FR15-FR16: Bottleneck Heatmap
│   │   │   └── HeatmapProvider.tsx   # Heatmap color computation + overlay
│   │   ├── import-export/            # FR23-FR27: Data Import & Export
│   │   │   ├── ImportDialog.tsx      # FR23: YAML file import UI
│   │   │   ├── ExportButton.tsx      # FR24: YAML export trigger
│   │   │   └── ValidationErrors.tsx  # FR27: Import error display
│   │   ├── auth/                     # Authentication
│   │   │   ├── LoginPage.tsx         # Google sign-in page
│   │   │   └── AuthGuard.tsx         # Protected route wrapper
│   │   └── layout/                   # App shell
│   │       ├── AppLayout.tsx         # Three-zone layout (toolbox + canvas + inspector + dashboard)
│   │       └── Toolbar.tsx           # Top toolbar (import/export buttons, example selector)
│   ├── stores/                       # Zustand state management
│   │   ├── architectureStore.ts      # Architecture state (nodes, edges, configs, metrics)
│   │   └── uiStore.ts               # UI state (selected tab, panel visibility, selected node)
│   ├── repositories/                 # Repository pattern (Firestore-backed)
│   │   ├── types.ts                 # Repository interfaces (contracts)
│   │   ├── componentRepository.ts   # Firestore component collection access
│   │   ├── stackRepository.ts       # Firestore stack collection access
│   │   └── blueprintRepository.ts   # Firestore blueprint collection access
│   ├── schemas/                      # Zod schemas (single source of truth)
│   │   ├── componentSchema.ts       # Component + ConfigVariant schemas
│   │   ├── stackSchema.ts           # Stack schema
│   │   ├── blueprintSchema.ts       # Blueprint schema
│   │   ├── architectureFileSchema.ts # YAML import/export file schema (skeleton)
│   │   └── metricSchema.ts          # Metric value + category schemas
│   ├── engine/                       # FR13-FR14: Recalculation engine (pure functions)
│   │   ├── recalculator.ts          # Core metric recalculation logic
│   │   ├── propagator.ts            # Graph traversal + metric propagation
│   │   ├── heatmapCalculator.ts     # Metric values → heatmap colors
│   │   └── tierEvaluator.ts         # Architecture tier assessment logic
│   ├── services/                     # Orchestration / pipelines
│   │   ├── yamlImporter.ts          # Import pipeline: parse → validate → hydrate → recalculate
│   │   ├── yamlExporter.ts          # Export pipeline: dehydrate → serialize
│   │   ├── componentLibrary.ts      # Loads Firestore data into memory cache; provides sync lookups
│   │   └── recalculationService.ts  # Orchestrates: cache lookup → engine computation → results
│   ├── data/                         # FR28-FR30: Seed data + static content
│   │   ├── components/              # AI-generated component YAML files (for Firestore seeding)
│   │   ├── stacks/                  # Stack definitions (for Firestore seeding)
│   │   ├── blueprints/              # Example architectures (for Firestore seeding)
│   │   └── prompt-template.md       # FR30: AI prompt template for YAML generation
│   ├── hooks/                        # Shared React hooks
│   │   ├── useAuth.ts               # Firebase auth state hook
│   │   └── useLibrary.ts            # Component library data access hook
│   ├── lib/                          # Shared utilities
│   │   ├── firebase.ts              # Firebase config + initialization (Auth + Firestore)
│   │   └── constants.ts             # App-wide constants (MAX_FILE_SIZE, METRIC_CATEGORIES)
│   └── types/                        # Shared TypeScript types (derived from Zod schemas)
│       └── index.ts                 # Re-exports all types
├── tests/
│   ├── unit/
│   │   ├── engine/
│   │   │   ├── recalculator.test.ts
│   │   │   ├── propagator.test.ts
│   │   │   ├── heatmapCalculator.test.ts
│   │   │   └── tierEvaluator.test.ts
│   │   ├── schemas/
│   │   │   ├── componentSchema.test.ts
│   │   │   ├── architectureFileSchema.test.ts
│   │   │   └── metricSchema.test.ts
│   │   ├── repositories/
│   │   │   └── componentRepository.test.ts
│   │   └── services/
│   │       ├── yamlImporter.test.ts
│   │       ├── yamlExporter.test.ts
│   │       ├── componentLibrary.test.ts
│   │       └── recalculationService.test.ts
│   ├── integration/
│   │   ├── yamlRoundTrip.test.ts         # FR26: Lossless round-trip
│   │   ├── recalculationPipeline.test.ts # FR13-FR14: End-to-end recalc
│   │   └── firestoreSeeding.test.ts      # Firestore seed + repository access
│   └── e2e/
│       ├── import-export.spec.ts         # Journey 1: AI-Archie round-trip
│       ├── canvas-interactions.spec.ts   # Journey 3: Build from scratch
│       ├── explorer.spec.ts             # Journey 2: Load example, swap, compare
│       └── auth-flow.spec.ts            # Login → app access
├── .env.example                     # Template for Firebase config vars
├── .gitignore
├── CLAUDE.md                        # Project instructions for AI agents
├── firebase.json                    # Firebase Hosting config
├── firestore.rules                  # Firestore security rules
├── .firebaserc                      # Firebase project alias
├── scripts/
│   └── seed-firestore.ts           # Seeds Firestore from src/data/ YAML files
├── index.html                       # Vite entry HTML
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts                 # Vitest configuration
└── playwright.config.ts            # Playwright E2E configuration
```

### Architectural Boundaries

**Data Access Boundary:**
```
Components/Hooks → Stores (Zustand) → Services → Repositories → Firestore
                                                ↘ Engine (pure functions)
```
- React components NEVER access Firestore directly
- Stores call services for orchestration; services call repositories for data
- Repositories are the only code that touches the Firestore SDK
- Component library service caches repository data in memory at startup

**Computation Boundary:**
```
Zustand Store → recalculationService → engine/* (pure functions) → recalculationService → Zustand Store
```
- Store actions call `recalculationService`, which assembles data from the in-memory cache and passes it to pure engine functions
- Engine functions receive data as arguments, return results
- No side effects, no imports from React/Zustand/Firestore inside `engine/`
- Engine is testable in complete isolation; service is testable with mocked cache

**Auth Boundary:**
```
Firebase Auth SDK ← useAuth hook ← AuthGuard component
                                  ← Any component needing user identity
```
- Firebase config lives in `lib/firebase.ts`
- Auth state accessed only via `useAuth` hook
- `AuthGuard` wraps the entire app route — components inside assume authenticated

**YAML I/O Boundary:**
```
User File → yamlImporter (validate → sanitize → hydrate) → Zustand Store
Zustand Store → yamlExporter (dehydrate → serialize) → User File
```
- All untrusted input enters through `yamlImporter` only
- Validation and sanitization happen once at the boundary
- Internal code trusts data after the import boundary

### Requirements to Structure Mapping

| FR Area | Primary Location | Supporting |
|---------|-----------------|------------|
| FR1-FR7 (Architecture Composition) | `src/components/canvas/` | `src/stores/architectureStore.ts` |
| FR8-FR12 (Component System) | `src/components/toolbox/` + `src/components/inspector/` | `src/repositories/` + `src/services/componentLibrary.ts` |
| FR13-FR16 (Recalculation + Heatmap) | `src/engine/` + `src/components/heatmap/` | `src/stores/architectureStore.ts` |
| FR17-FR19 (Scoring Dashboard) | `src/components/dashboard/` | `src/engine/recalculator.ts` |
| FR20-FR22 (Tier System) | `src/engine/tierEvaluator.ts` + `src/components/dashboard/TierBadge.tsx` | |
| FR23-FR27 (Import/Export) | `src/services/` + `src/components/import-export/` + `src/schemas/` | |
| FR28-FR30 (Content Library) | `src/data/` + `scripts/seed-firestore.ts` | `src/repositories/` |

### Data Flow

```
[User Action]
     │
     ▼
[Zustand Store] ──── updates ────→ [React Flow Canvas]
     │                                    │
     │ calls                              │ renders
     ▼                                    ▼
[Recalculation Service]           [Heatmap + Dashboard + Tier]
     │              │
     │ reads        │ calls
     ▼              ▼
[Memory Cache]  [Engine Functions (pure)]
     │
     │ loaded at startup from
     ▼
[Firestore] ←── seeded from ── [scripts/seed-firestore.ts]
```

**Config Change Flow (the core loop):**
1. User clicks config dropdown → `ConfigSelector.tsx`
2. Calls `useArchitectureStore.changeConfigVariant(nodeId, variantId)`
3. Store action calls `recalculationService.run(graph, changedNodeId)`
4. Service reads component data from in-memory cache (synchronous)
5. Service calls `recalculator.recalculate(hydratedGraph)` — pure function
6. Service calls `heatmapCalculator.computeColors(metrics)` — pure function
7. Service calls `tierEvaluator.evaluate(graph)` — pure function
8. Service returns all computed results to store
9. Store updates all computed state in a single batch
10. React re-renders only affected components (Zustand selectors)

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility: PASS**
- React 19 + React Flow + Zustand + Tailwind v4 + shadcn/ui → standard React ecosystem, no conflicts
- Firestore + Zod → clean pipeline (Firestore stores documents, Zod validates them at the repository boundary)
- Firebase Auth + React Router → standard protected route pattern
- Firebase Hosting + Vite → static output served via CDN
- js-yaml → Zod → Zustand → clean data pipeline from YAML to app state

**React Flow + Zustand Ownership Clarification:**
React Flow nodes carry an `archieComponentId` in their `data` property. React Flow owns visual state (positions, viewport, selection). Zustand owns domain state (component types, config variants, computed metrics, heatmap colors). The node's `data.archieComponentId` is the bridge:

```typescript
type ArchieNodeData = {
  archieComponentId: string     // Reference to component in Firestore
  activeConfigVariantId: string // Currently selected config variant
}
```

**Pattern Consistency: PASS** — naming conventions consistent across all layers; feature-based structure aligns with React Flow's component model; repository pattern consistent across all data access.

**Structure Alignment: PASS** — directory structure supports all decisions; boundaries cleanly defined; every FR mapped to specific files.

### Requirements Coverage Validation

**Functional Requirements: 30/30 COVERED**

All FRs from Architecture Composition (FR1-FR7), Component System (FR8-FR12), Trade-off Visualization (FR13-FR19), Architecture Assessment (FR20-FR22), Data Import/Export (FR23-FR27), and Content Library (FR28-FR30) have specific files, components, and patterns assigned.

**Non-Functional Requirements: 11/11 COVERED**

| NFR | How Addressed |
|-----|---------------|
| NFR1 (Canvas <100ms) | React Flow virtualization at MVP scale |
| NFR2 (Recalc <200ms) | Pure functions on small graph, synchronous |
| NFR3 (Heatmap sync) | Same Zustand update cycle as recalculation |
| NFR4 (Import <1s) | Client-side parse + validate + hydrate |
| NFR5 (Load <3s) | Vite optimized build + Firebase CDN |
| NFR6-NFR11 (Security) | Zod validation, file size limit, React escaping, URL validation, no eval, skeleton-only export |

### Gap Analysis Results

**No critical gaps.** Three minor items documented:

1. **Dexie.js Schema Versioning** — `librarySeeder` should check a data version flag and re-seed when bundled data is newer than what's in IndexedDB. Dexie supports `db.version(n).stores({...}).upgrade(...)` for migrations.

2. **Dark Mode Default** — Per UX spec, Archie is dark-mode-first. Set `<html class="dark">` during shadcn/ui init and use dark theme as default.

3. **React Flow Node Data Contract** — Documented above in the `ArchieNodeData` type. React Flow nodes are visual containers; domain data lives in Zustand, referenced by `archieComponentId`.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (30 FRs, 11 NFRs)
- [x] Scale and complexity assessed (medium — canvas tool, 10-20 components)
- [x] Technical constraints identified (client-side, no backend, YAML persistence)
- [x] Cross-cutting concerns mapped (schema, recalculation, state, graph, security)

**Architectural Decisions**
- [x] Critical decisions documented (Zustand, Dexie.js, Zod, Firebase Auth)
- [x] Technology stack fully specified with initialization sequence
- [x] Data architecture defined (skeleton YAML + library + runtime state)
- [x] Performance strategy addressed (React Flow virtualization, Zustand selectors, pure engine)

**Implementation Patterns**
- [x] Naming conventions established (files, code, YAML, stores, schemas)
- [x] Structure patterns defined (feature-based organization)
- [x] State management patterns specified (Zustand rules, selectors, actions)
- [x] Process patterns documented (import pipeline, config change pipeline, error handling)

**Project Structure**
- [x] Complete directory structure defined (every file mapped to FRs)
- [x] Component boundaries established (data access, computation, auth, YAML I/O)
- [x] Integration points mapped (data flow diagram, config change flow)
- [x] Requirements to structure mapping complete (all 30 FRs → specific files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean separation: visual layer (React Flow) / domain logic (engine) / data layer (Dexie.js + repos) / state (Zustand)
- Recalculation engine as pure functions — fully testable, no side effects
- Repository pattern enables Dexie.js → Firestore migration without touching UI
- Skeleton YAML keeps exports small; library data updatable independently
- Firebase Auth + Hosting in one project — zero extra infrastructure
- Every FR and NFR traced to specific files and patterns

**Areas for Future Enhancement:**
- Firestore migration (clean path via repository pattern)
- Additional auth providers (Firebase Auth supports them)
- Complex routing for community features (React Router already in place)
- Performance optimization for 100+ component graphs (not needed at MVP scale)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries (especially data access through repositories)
- Keep the recalculation engine pure — no React, no Zustand, no Dexie inside `engine/`
- Refer to this document for all architectural questions

**Implementation Sequence:**
1. Project scaffolding (Vite + shadcn/ui + all dependencies + Firebase init)
2. Firebase Auth integration + login page + auth guard
3. Zod schemas (data contract — everything depends on this)
4. Dexie.js database setup + repository interfaces + library seeder
5. Zustand stores (architecture state, UI state)
6. React Flow canvas integration with custom nodes/edges
7. Recalculation engine (pure functions)
8. UI panels (toolbox, inspector, dashboard, heatmap)
9. YAML import/export pipeline
10. Example architectures + AI prompt template
