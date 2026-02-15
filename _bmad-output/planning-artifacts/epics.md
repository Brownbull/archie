---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/ux-playground-gap-analysis.md'
---

# Archie - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Archie, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Architecture Composition (FR1-FR7):**
- FR1: User can create a new architecture on an empty canvas
- FR2: User can drag components from the toolbox onto the canvas
- FR3: User can create connections between components by wiring their ports
- FR4: User can remove components from the canvas
- FR5: User can remove connections between components
- FR6: User can reposition components on the canvas via drag-and-drop
- FR7: System displays a visual warning when the user connects incompatible components (WARN mode -- connection is allowed, but flagged)

**Component System (FR8-FR12):**
- FR8: User can browse available components in a Three-Tab Toolbox organized as Components, Stacks, and Blueprints
- FR9: User can view a component's detail card showing its metrics, properties, and trade-off information
- FR10: User can swap a placed component for an alternative within the same category via an in-place component selector (e.g., PostgreSQL to MongoDB), preserving all existing connections
- FR11: User can switch a component's configuration variant via a dropdown selector (e.g., PostgreSQL normalized to denormalized)
- FR12: Each component exposes two levels of selection: component type (what it is) and configuration variant (how it's configured)

**Trade-off Visualization (FR13-FR19):**
- FR13: System recalculates all affected metrics when a component type, configuration variant, or connection changes
- FR14: System propagates metric changes through connected components (changing component A affects metrics displayed on connected component B)
- FR15: System displays a bottleneck heatmap (red/yellow/green) overlay on all components and connections
- FR16: Heatmap updates in real-time with every component, connection, or configuration change
- FR17: System displays a multi-track scoring dashboard showing ratings across 7 metric categories
- FR18: User can view per-component directional ratings (low/medium/high) for each of the 38 metrics
- FR19: User can view aggregate architecture-level ratings across all metric categories

**Architecture Assessment (FR20-FR22):**
- FR20: System evaluates the current architecture against the Architecture Tier System
- FR21: User can view the current tier level for their architecture (Foundation to Production-Ready to Resilient)
- FR22: User can see what components or capabilities would be needed to reach the next tier

**Data Import & Export (FR23-FR27):**
- FR23: User can import a YAML file to load a complete architecture onto the canvas
- FR24: User can export the current canvas state as a YAML file
- FR25: Exported YAML captures the architecture skeleton: component IDs, canvas positions, component type selections, configuration variant choices, connections, and schema/library version metadata. Derived data (metrics, descriptions, heatmap state) is re-hydrated from the component library on import
- FR26: System performs lossless skeleton round-trip: import to modify to export to reimport produces identical structural state (same component placements, connections, and configuration selections). Computed state (metrics, heatmap, tier) is re-derived from the current component library on each import
- FR27: System validates imported YAML against the schema and rejects invalid files with clear error messages

**Content Library (FR28-FR30):**
- FR28: User can browse and load pre-built example architectures (WhatsApp, Telegram, possibly Facebook)
- FR29: Example architectures include fully defined components, connections, configuration variants, and populated metrics
- FR30: User can access a static AI prompt template for generating Archie-compatible YAML outside the tool

**Component Intelligence (FR31-FR35):**
- FR31: Inspector displays representative implementation code snippets per configuration variant with syntax highlighting; code snippets are stored as part of component library data
- FR32: Each metric value has an expandable explanation showing a plain-language reason and a list of contributing technical factors; explanations are stored per component + variant + metric in the component library
- FR33: System identifies components with metrics below a health threshold and suggests the variant that best addresses the weakness, showing both the improvement amount and the trade-off cost; recommendations are computed from existing metric data, not pre-stored
- FR34: When switching configuration variants, the inspector displays +/- delta indicators next to each metric, showing the change amount from the previous configuration; deltas persist until the next variant switch
- FR35: Inspector provides a filter to show or hide individual metrics, letting users focus on the metrics most relevant to their current decision

**Connection System (FR36-FR38):**
- FR36: Connections are first-class inspectable objects with typed properties: protocol, communication pattern, typical latency, and co-location potential; properties are derived from connected components and stored in the component library
- FR37: User can click a connection to inspect its properties in the inspector panel, including per-endpoint health metrics showing how each endpoint contributes to overall connection health
- FR38: Connection labels on the canvas are draggable so users can reposition them for readability when connections overlap

**Dashboard & Architecture Overview (FR39-FR41):**
- FR39: Dashboard supports an expanded overlay view showing per-category contributing factors -- which specific components and metrics drive each category score
- FR40: Dashboard category bars are interactive -- clicking shows a description of the category, its key metrics, why it matters, and how to improve it
- FR41: System displays an issues summary with a badge count of components that have warning or bottleneck status; clicking opens a dropdown listing each affected component with health status, average score, and worst metric -- each entry is clickable to navigate to that component on the canvas

**Canvas Enhancements (FR42-FR43):**
- FR42: When heatmap is enabled, animated particles flow along connection lines with speed varying by health status (green = fast flow, red = slow/congested flow)
- FR43: Canvas displays a semi-transparent legend explaining heatmap colors, connection line styles, and connection type indicators

### NonFunctional Requirements

**Performance (NFR1-NFR5):**
- NFR1: Canvas interactions (drag, drop, reposition, connect) must respond within 100ms at MVP component counts (10-20 components)
- NFR2: Metric recalculation must complete and render within 200ms of a configuration or component change
- NFR3: Heatmap visual updates must appear synchronously with the metric recalculation that triggers them
- NFR4: YAML import must parse and render a complete architecture (up to 20 components with connections) within 1 second
- NFR5: Initial application load (first meaningful paint) must complete within 3 seconds on standard broadband

**Security (NFR6-NFR11):**
- NFR6: All imported YAML must be validated against the schema before rendering -- reject files with unexpected keys, enforce allowlisted fields only
- NFR7: Imported YAML files must be rejected if they exceed 1MB in size
- NFR8: All user-provided strings from YAML must be sanitized before DOM rendering -- no dangerouslySetInnerHTML with untrusted content
- NFR9: URL fields in YAML must be validated to allow only https:// protocol -- reject javascript:, data:, and other URI schemes
- NFR10: The application must not use eval(), new Function(), or dynamic import() on any user-provided content
- NFR11: Exported YAML must not include runtime state, environment data, or any data beyond the architecture definition

### Additional Requirements

**From Architecture -- Starter Template & Infrastructure:**
- AR1: Project initialization uses Vite + React TypeScript + shadcn/ui Init sequence (Starter Template -- impacts first story)
- AR2: Firebase project setup from Day 1: create project, enable Google Auth, create Firestore database, deploy security rules, configure Hosting
- AR3: CI/CD via GitHub Actions: PR to dev triggers Vitest + typecheck + Firebase preview deploy; merge to main triggers production deploy
- AR4: Dark mode as default -- set `<html class="dark">` during shadcn/ui init

**From Architecture -- Data Layer:**
- AR5: Zod schemas as single source of truth for TypeScript types AND runtime validation
- AR6: Repository pattern for ALL Firestore access -- never query Firestore directly from components or stores
- AR7: Component library service with two-layer caching: Firestore SDK offline persistence (cross-session) + in-memory JavaScript Maps (per-session) for O(1) synchronous lookups
- AR8: Seed Firestore from AI-generated YAML files via admin script (scripts/seed-firestore.ts)
- AR9: YAML schema versioning: semver in YAML header, version-specific Zod schemas, migration registry for upgrade paths
- AR10: Unknown component handling: import files referencing unknown component IDs load recognized components and display placeholders for unknowns
- AR11: Firestore security rules: component library is read-only for authenticated users; admin writes via service account
- AR12: Connection type definitions stored as separate Firestore collection (connectionTypes), keyed by source-target category pairs
- AR13: Dashboard category descriptions stored as separate Firestore collection (metricCategories) with name, description, keyMetrics, whyItMatters, howToImprove
- AR14: Firestore library versioning: seed script writes a _metadata document; componentLibrary service checks on startup

**From Architecture -- State & Computation:**
- AR15: Zustand stores: one per domain (architectureStore for nodes/edges/configs/metrics, uiStore for selected tab/panel visibility/selected node)
- AR16: React Flow + Zustand ownership split: React Flow owns visual state (positions, viewport, selection); Zustand owns domain state (component types, config variants, computed metrics, heatmap colors); bridged by archieComponentId in node data
- AR17: Recalculation engine as pure functions -- no React hooks, no Zustand imports, no Firestore imports, no side effects
- AR18: Recalculation service orchestrates: cache lookup (sync) then engine computation (pure) then result return to store
- AR19: Config change pipeline: store snapshots previous metrics (FR34), calls recalculationService, service calls engine pure functions, computes deltas, derives issues list, returns all computed results, store updates in single batch

**From Architecture -- Naming & Structure:**
- AR20: Feature-based directory structure as documented in architecture.md
- AR21: Naming conventions: PascalCase components, camelCase functions, UPPER_SNAKE_CASE constants, snake_case YAML fields with Zod transform at boundary
- AR22: Test structure: separate tests/ directory mirroring src/ (tests/unit, tests/integration, tests/e2e)

**From UX Design Specification:**
- UX1: Three-zone layout: toolbox (260px left, collapsible) + canvas (flexible center) + inspector (300px right, collapsible) + dashboard (100px bottom) + top bar (44px)
- UX2: Progressive disclosure layers: Layer 0 (canvas overview -- shapes and heatmap colors), Layer 1 (hover -- tooltip with name, config, 2-3 key metrics), Layer 2 (click -- full inspector), Layer 3 (deep dive -- all 38 metrics on demand)
- UX3: Sequential ripple propagation: config change triggers visible wave through connected components (~100ms delay per hop) with heatmap colors shifting as wave passes
- UX4: Keyboard shortcuts: H for heatmap toggle, Escape to deselect, Tab for focusable elements, Arrow keys for canvas node navigation
- UX5: Component benefit card format in toolbox: IS / GAIN / COST / TAGS
- UX6: Empty canvas state: suggest import YAML, try an example, or drag a component
- UX7: Snap-to-grid for component placement on canvas
- UX8: React Flow minimap for large architectures
- UX9: Collapsible/resizable toolbox and inspector panels
- UX10: No modals for core interactions -- all interactions on-canvas or in-panel
- UX11: Accessibility: ARIA labels on canvas nodes, metric bars with aria-valuenow/valuemin/valuemax, keyboard focusable elements, color independence
- UX12: Command palette (Cmd+K) for quick search of components, actions, configs
- UX13: Micro-animations: metric bar fills, color transitions, heatmap updates via CSS transitions
- UX14: Dark-mode-first design with full color token system (canvas #0f1117, panels #1a1d27, 10 category colors, 3 heatmap semantic colors)
- UX15: Typography system: Inter font, 12px component names, 16px inspector titles, specific sizes per element
- UX16: 4px base spacing unit across all elements; standard node width 140px
- UX17: Connection handles appear on component hover for wiring
- UX18: Color separation principle: category colors = identity (accents, stripes); heatmap colors = performance (border glows, connection lines) -- never overlap

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Create new architecture on empty canvas |
| FR2 | Epic 1 | Drag components from toolbox |
| FR3 | Epic 1 | Create connections by wiring ports |
| FR4 | Epic 1 | Remove components |
| FR5 | Epic 1 | Remove connections |
| FR6 | Epic 1 | Reposition components via drag-and-drop |
| FR7 | Epic 1 | WARN mode on incompatible connections |
| FR8 | Epic 1 | Three-Tab Toolbox (Components/Stacks/Blueprints) |
| FR9 | Epic 1 | Component detail card with metrics and trade-offs |
| FR10 | Epic 1 | In-place component swap preserving connections |
| FR11 | Epic 1 | Configuration variant dropdown selector |
| FR12 | Epic 1 | Two-level selection (type + config variant) |
| FR13 | Epic 2 | Metric recalculation on changes |
| FR14 | Epic 2 | Metric propagation through connected components |
| FR15 | Epic 2 | Bottleneck heatmap overlay |
| FR16 | Epic 2 | Real-time heatmap updates |
| FR17 | Epic 2 | Multi-track scoring dashboard (7 categories) |
| FR18 | Epic 2 | Per-component directional ratings (38 metrics) |
| FR19 | Epic 2 | Aggregate architecture-level ratings |
| FR20 | Epic 2 | Architecture Tier System evaluation |
| FR21 | Epic 2 | Tier level display |
| FR22 | Epic 2 | Next-tier gap indicators |
| FR23 | Epic 3 | YAML file import |
| FR24 | Epic 3 | YAML file export |
| FR25 | Epic 3 | Skeleton export format |
| FR26 | Epic 3 | Lossless skeleton round-trip |
| FR27 | Epic 3 | Import validation with error messages |
| FR28 | Epic 3 | Example architectures (WhatsApp, Telegram) |
| FR29 | Epic 3 | Fully populated example content |
| FR30 | Epic 3 | AI prompt template |
| FR31 | Epic 4 | Code snippets per variant |
| FR32 | Epic 4 | Metric explanations with contributing factors |
| FR33 | Epic 4 | Variant recommendations for weak metrics |
| FR34 | Epic 4 | Delta indicators on variant switch |
| FR35 | Epic 4 | Metric show/hide filter |
| FR36 | Epic 4 | First-class connection properties |
| FR37 | Epic 4 | Connection inspection with endpoint health |
| FR38 | Epic 4 | Draggable connection labels |
| FR39 | Epic 4 | Dashboard expanded overlay |
| FR40 | Epic 4 | Interactive dashboard categories |
| FR41 | Epic 4 | Issues summary with navigation |
| FR42 | Epic 4 | Flow particle animation |
| FR43 | Epic 4 | Canvas legend |

**Coverage: 43/43 FRs mapped. 11/11 NFRs addressed across epics.**

## Epic List

### Epic 1: Architecture Canvas & Component Library
User can build architectures by browsing components, dragging them onto a canvas, wiring connections, configuring variants, and inspecting component details. Includes all infrastructure: project scaffolding, Firebase Auth/Firestore, Zod schemas, repositories, component library service, seed data, Zustand stores, React Flow canvas, and the three-zone app layout. Journey 3 (Build from Scratch) works end-to-end.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12
**NFRs addressed:** NFR1, NFR5, NFR8, NFR10
**Key ARs:** AR1-AR8, AR11, AR14-AR16, AR20-AR22
**Key UX:** UX1, UX4-UX9, UX11-UX17

### Epic 2: Trade-off Intelligence & Visualization
User can see trade-offs visually -- when they change a configuration, metrics recalculate across connected components, the heatmap shows bottlenecks, the dashboard scores the architecture across 7 categories, and the tier system evaluates where the architecture stands. Plus settings/preferences (gear icon, theme, font). The core "aha moment" loop works. Journey 3 becomes genuinely valuable.
**FRs covered:** FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22
**NFRs addressed:** NFR2, NFR3
**Key ARs:** AR17-AR19
**Key UX:** UX2, UX3, UX13, UX18
**Stories:** 2.1 Recalculation Engine, 2.2 Heatmap, 2.3 Dashboard, 2.4 Tier System, 2.5 Settings

### Epic 3: YAML Workflow & Content Library
User can import/export architectures as YAML files, use the AI-Archie round-trip workflow, and explore pre-built example architectures (WhatsApp, Telegram). Journey 1 (AI Round-Trip) and Journey 2 (Explorer) work end-to-end.
**FRs covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30
**NFRs addressed:** NFR4, NFR6, NFR7, NFR8, NFR9, NFR10, NFR11
**Key ARs:** AR9, AR10
**Key UX:** UX6, UX10

### Epic 4: Deep Intelligence & Polish
User gets rich insights into every component and connection -- code snippets per variant, metric explanations with contributing factors, variant recommendations for weak metrics, delta indicators on variant switch, metric filtering, connection inspection with endpoint health, dashboard drill-down with contributing factors, interactive category info, issues summary with canvas navigation, flow particle animation, and canvas legend. All three journeys fully enriched.
**FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43
**Key ARs:** AR12, AR13

---

## Epic 1: Architecture Canvas & Component Library

User can build architectures by browsing components, dragging them onto a canvas, wiring connections, configuring variants, and inspecting component details. Includes all infrastructure: project scaffolding, Firebase Auth/Firestore, Zod schemas, repositories, component library service, seed data, Zustand stores, React Flow canvas, and the three-zone app layout. Journey 3 (Build from Scratch) works end-to-end.

### Story 1.1: Project Foundation & Authentication

As a user,
I want to log into Archie with my Google account and see the app shell,
So that I have a secure, personalized entry point to start building architectures.

**Acceptance Criteria:**

**Given** I navigate to the Archie URL
**When** the app loads
**Then** I see a login page with a Google Sign-In button
**And** the page loads within 3 seconds (NFR5)

**Given** I am not authenticated
**When** I try to access the main app route
**Then** I am redirected to the login page

**Given** I click the Google Sign-In button
**When** authentication succeeds
**Then** I am redirected to the main app view
**And** I see the three-zone layout: toolbox placeholder (left, 260px), canvas area (center), inspector placeholder (right, 300px), dashboard bar (bottom, 100px), and top toolbar (44px)

**Given** I am authenticated
**When** I view the app
**Then** the layout uses dark mode by default with the design token color system

**Given** the CI/CD pipeline is configured
**When** a PR is opened to dev
**Then** Vitest tests run, TypeScript type-checking passes, and a Firebase preview deploy is created

### Story 1.2: Component Data Pipeline & Toolbox Browsing

As a user,
I want to browse available architecture components organized by category in a toolbox panel,
So that I can discover and understand components before placing them on the canvas.

**Acceptance Criteria:**

**Given** I am authenticated and on the main app
**When** I view the toolbox panel (left side)
**Then** I see three tabs: Components, Stacks, Blueprints
**And** the Components tab is active by default with component cards displayed
**And** the Stacks tab shows placeholder content with a "Coming in Phase 2" message (Stacks tab is deferred to Phase 2)
**And** the Blueprints tab shows placeholder content (populated in Epic 3 Story 3.3)

**Given** I am on the Components tab
**When** I browse the component list
**Then** I see components organized by category (Compute, Data Storage, Caching, Messaging, etc.)
**And** each component displays a benefit card with IS / GAIN / COST / TAGS format (UX5)
**And** each category has its designated color and icon

**Given** I want to find a specific component
**When** I type in the search/filter field
**Then** the component list filters to show matching components by name or tag

**Given** I want to quickly find a component or action
**When** I press Cmd+K (or Ctrl+K on Windows/Linux)
**Then** a command palette opens with a search input (UX12)
**And** I can search for components by name or category and select one to scroll to it in the toolbox

**Given** the app loads
**When** the component library initializes
**Then** all component data is fetched from Firestore and cached in memory for synchronous access
**And** subsequent page loads use the local cache without additional network calls

### Story 1.3: Canvas & Component Placement

As a user,
I want to drag components from the toolbox onto an interactive canvas and arrange them freely,
So that I can start building my architecture visually.

**Acceptance Criteria:**

**Given** I am on the Components tab in the toolbox
**When** I drag a component card onto the canvas
**Then** a new component node appears at the drop position
**And** the node displays the component name, category icon, and category color stripe
**And** the node width is 140px (UX16)

**Given** components exist on the canvas
**When** I drag a component node to a new position
**Then** the component moves smoothly with snap-to-grid alignment (UX7)
**And** all interactions respond within 100ms (NFR1)

**Given** I have an empty canvas with no components
**When** the canvas first renders
**Then** I see helpful suggestions: import YAML, try an example, or drag a component from the toolbox (UX6)

**Given** multiple components are placed on the canvas
**When** I zoom out
**Then** the React Flow minimap shows component positions for navigation (UX8)

### Story 1.4: Connection Wiring & Management

As a user,
I want to wire components together, remove components and connections, and see warnings on incompatible pairings,
So that I can define my architecture's data flow and catch potential issues early.

**Acceptance Criteria:**

**Given** a component exists on the canvas
**When** I hover over it
**Then** connection ports (input/output handles) appear at the component edges (UX17)

**Given** I see connection ports on two components
**When** I click and drag from one port to another
**Then** a connection line is drawn between the components
**And** the connection is styled according to the design system

**Given** an existing connection between two components
**When** I select it and press Delete/Backspace
**Then** the connection is removed from the canvas

**Given** a component exists on the canvas
**When** I select it and press Delete/Backspace
**Then** the component and all its connections are removed from the canvas

**Given** I connect two incompatible components
**When** the connection is established
**Then** a visual WARN indicator appears on the connection (FR7)
**And** the connection is still created (not blocked -- WARN mode)

**Given** I have components or connections selected
**When** I press Escape
**Then** the current selection is deselected (UX4)

### Story 1.5: Component Inspector & Configuration

As a user,
I want to click a component to see its full details and switch its configuration variant,
So that I can understand each component's characteristics and explore different configurations.

**Acceptance Criteria:**

**Given** components exist on the canvas
**When** I click a component node
**Then** the inspector panel opens on the right side (300px, collapsible -- UX9)
**And** displays the component's detail card: name, category, description, metrics list, pros, cons

**Given** the inspector is showing a component
**When** I view the configuration section
**Then** I see a dropdown showing the current configuration variant
**And** the dropdown lists all available variants for this component type (FR12: two-level selection)

**Given** the inspector is showing a component
**When** I select a different configuration variant from the dropdown
**Then** the component's displayed metrics update to reflect the new variant's base values from the component library (connected-component recalculation is added in Epic 2)
**And** the component node on the canvas updates its label to show the active variant name

**Given** the inspector panel is open
**When** I click the collapse button
**Then** the inspector collapses to maximize canvas space
**And** clicking expand restores it

**Given** I view the metrics section in the inspector
**When** metrics are displayed
**Then** each metric shows a directional rating with a visual bar indicator
**And** metrics are grouped by their category (7 categories)

### Story 1.6: In-Place Component Swapping

As a user,
I want to swap a placed component for a different one in the same category without losing my connections,
So that I can quickly compare alternatives (e.g., PostgreSQL vs MongoDB) in my architecture.

**Acceptance Criteria:**

**Given** a component is placed on the canvas with connections
**When** I open the component swapper in the inspector
**Then** I see a dropdown of alternative component types in the same category

**Given** I select a different component type from the swapper
**When** the swap is applied
**Then** the canvas node changes to the new component type
**And** all existing connections are preserved (not removed)
**And** the inspector updates to show the new component's details and metrics
**And** the new component's default configuration variant is active

**Given** I swap a component type
**When** the new component has different configuration variants
**Then** the config variant dropdown updates to show the new component's available variants

**Given** I swap a component type
**When** the swap completes
**Then** the component's position on the canvas does not change

---

## Epic 2: Trade-off Intelligence & Visualization

User can see trade-offs visually -- when they change a configuration, metrics recalculate across connected components, the heatmap shows bottlenecks, the dashboard scores the architecture across 7 categories, and the tier system evaluates where the architecture stands. The core "aha moment" loop works. Journey 3 becomes genuinely valuable.

### Story 2.1: Recalculation Engine & Metric Propagation

As a user,
I want metrics to automatically recalculate when I change a component's configuration or swap a component type,
So that I can see the real impact of every architecture decision across connected components.

**Acceptance Criteria:**

**Given** a component is on the canvas with a configuration variant selected
**When** I switch to a different configuration variant
**Then** the component's metrics recalculate to reflect the new variant's values
**And** the recalculation completes within 200ms (NFR2)

**Given** component A is connected to component B
**When** I change component A's configuration variant
**Then** component B's displayed metrics update to reflect the interaction change (FR14)
**And** the propagation cascades through all affected connected components
**And** the propagation is visually sequential: each hop animates with ~100ms delay so the user sees a ripple wave moving outward from the changed component (UX3)
**And** heatmap colors shift on each component as the ripple wave passes through it

**Given** I swap a component type (from Epic 1 Story 1.6)
**When** the swap completes
**Then** all affected metrics recalculate including propagated effects on connected components

**Given** I add or remove a connection between two components
**When** the connection change completes
**Then** metrics on both components recalculate to reflect the new connectivity

**Given** the recalculation engine runs
**When** the same inputs are provided
**Then** the output is always identical (deterministic -- same inputs = same outputs)

### Story 2.2: Bottleneck Heatmap

As a user,
I want a color-coded heatmap overlay on my architecture showing which components are healthy, concerning, or bottlenecked,
So that I can instantly see where my architecture's weak points are without reading individual metrics.

**Acceptance Criteria:**

**Given** components exist on the canvas with calculated metrics
**When** the heatmap is enabled
**Then** each component displays a color overlay: green (healthy), yellow (warning), red (bottleneck)
**And** connection lines also reflect health status through color

**Given** the heatmap is active
**When** I change a configuration variant on any component
**Then** the heatmap colors update synchronously with the metric recalculation (NFR3) -- no separate loading state

**Given** I am on the canvas
**When** I press the H key (UX4)
**Then** the heatmap overlay toggles on/off

**Given** the heatmap is active
**When** I view the canvas
**Then** category colors (component identity) are distinct from heatmap colors (performance) -- they never overlap (UX18)
**And** heatmap status is communicated through both color and metric values (never color-only -- UX11)

### Story 2.3: Scoring Dashboard

As a user,
I want a multi-track scoring dashboard showing how my architecture rates across all 7 metric categories,
So that I can evaluate my architecture's overall health at a glance.

**Acceptance Criteria:**

**Given** components exist on the canvas with calculated metrics
**When** I view the dashboard panel (bottom, 100px)
**Then** I see 7 category bars representing each metric category
**And** each bar shows a visual score indicator with the category name and icon

**Given** I click a component on the canvas
**When** the inspector shows the component's metrics
**Then** I can see per-component directional ratings (low/medium/high) for each of the 38 metrics (FR18)

**Given** multiple components are on the canvas
**When** I view the dashboard
**Then** the dashboard shows aggregate architecture-level ratings across all categories (FR19)
**And** the aggregate reflects the combined state of all components and connections

**Given** I change a configuration variant or swap a component
**When** metrics recalculate
**Then** the dashboard bars update in real-time to reflect the new scores
**And** bar changes animate smoothly (UX13)

### Story 2.4: Architecture Tier System

As a user,
I want to see what tier my architecture has reached and what I'd need to improve to reach the next tier,
So that I have a concrete measure of completeness and a clear path for improvement.

**Acceptance Criteria:**

**Given** components and connections exist on the canvas
**When** the tier evaluator runs (after each recalculation)
**Then** the system evaluates the current architecture against the Architecture Tier System

**Given** the tier evaluation completes
**When** I view the toolbar/dashboard area
**Then** I see the current tier level displayed (FR21). Tier names and count are progressive and defined in the component library data -- example tiers: Foundation, Production-Ready, Resilient, but the concrete tier structure is determined by the seed data, not hardcoded
**And** the tier indicator uses visual styling that communicates progress (not judgment)

**Given** my architecture is at a tier below the maximum
**When** I view the tier details
**Then** I see what specific components, capabilities, or improvements would be needed to reach the next tier (FR22)

**Given** I make a change that crosses a tier threshold
**When** the recalculation completes
**Then** the tier indicator updates to show the new tier
**And** the change is visually noticeable (color shift, state change)

### Story 2.5: Settings & Preferences

As a user,
I want to access a settings menu via a gear icon next to my profile name,
So that I can customize the visual experience including font style, font size, and switching between dark and light themes.

**Acceptance Criteria:**

**Given** I am authenticated and on the main app
**When** I view the toolbar
**Then** I see a gear icon next to my display name

**Given** I see the gear icon
**When** I click it
**Then** a dropdown menu opens with settings options

**Given** the settings dropdown is open
**When** I switch the theme from dark to light (or vice versa)
**Then** the entire application theme changes immediately
**And** my theme preference is saved and persists on page reload

**Given** the settings dropdown is open
**When** I select a different font size (Small, Medium, Large)
**Then** the application text size adjusts accordingly
**And** my font size preference persists on page reload

**Given** the settings dropdown is open
**When** I select a different font style
**Then** the application font changes to the selected style
**And** my font style preference persists on page reload

---

## Epic 3: YAML Workflow & Content Library

User can import/export architectures as YAML files, use the AI-Archie round-trip workflow, and explore pre-built example architectures (WhatsApp, Telegram). Journey 1 (AI Round-Trip) and Journey 2 (Explorer) work end-to-end.

### Story 3.1: YAML Import Pipeline

As a user,
I want to import a YAML file to load a complete architecture onto the canvas,
So that I can visualize and iterate on architectures generated by AI or saved from previous sessions.

**Acceptance Criteria:**

**Given** I am on the main app view
**When** I click the Import button in the toolbar (or drag a file onto the canvas)
**Then** a file picker opens allowing me to select a YAML file
**And** the import flow does not use modals for core interaction (UX10)

**Given** I select a valid YAML file
**When** the file is parsed
**Then** the architecture materializes on the canvas: components placed, connections drawn, configuration variants set
**And** the import completes within 1 second for up to 20 components (NFR4)

**Given** the imported YAML contains component IDs
**When** the system hydrates the skeleton from the component library
**Then** full component data (metrics, descriptions, pros/cons) is loaded from the library cache
**And** the YAML only needs to contain skeleton data: IDs, positions, connections, config selections (FR25)

**Given** the imported YAML references unknown component IDs
**When** the hydration process encounters them
**Then** placeholder nodes are displayed for unknown components (AR10)
**And** recognized components load normally

**Given** the imported YAML has unexpected keys or invalid structure
**When** validation runs against the Zod schema
**Then** the file is rejected with clear, specific error messages (FR27)
**And** errors are displayed inline near the import action

**Given** the imported YAML file exceeds 1MB
**When** the file size check runs
**Then** the file is rejected with an error message (NFR7)

**Given** the imported YAML contains string fields (component names, descriptions, labels)
**When** they are rendered in the DOM
**Then** all strings are sanitized (NFR8) -- no dangerouslySetInnerHTML with untrusted content

**Given** the imported YAML contains URL fields (docs links, icons)
**When** URLs are validated
**Then** only https:// URLs are accepted; javascript:, data:, and other schemes are rejected (NFR9)

**Given** the imported YAML has a schema_version header
**When** the version is checked
**Then** same-major/newer-minor versions import normally (new fields get defaults)
**And** older-major versions attempt migration if a migration function exists, otherwise reject with clear error
**And** newer-major versions are rejected with "created with a newer version of Archie" message (AR9)

### Story 3.2: YAML Export & Round-Trip

As a user,
I want to export my current architecture as a YAML file,
So that I can save my work, share it with AI tools, or reimport it later with identical results.

**Acceptance Criteria:**

**Given** I have an architecture on the canvas
**When** I click the Export button in the toolbar
**Then** a YAML file is downloaded containing the architecture skeleton

**Given** the exported YAML file
**When** I inspect its contents
**Then** it contains: component IDs, canvas positions, component type selections, configuration variant choices, connections, and schema/library version metadata (FR25)
**And** it does NOT contain derived data (metrics, descriptions, heatmap state, runtime state, environment data) (NFR11)

**Given** I export an architecture as YAML
**When** I reimport the same file without modifications
**Then** the canvas state is structurally identical: same component placements, connections, and configuration selections (FR26)
**And** computed state (metrics, heatmap, tier) is re-derived from the current component library

**Given** I export, modify the architecture, export again, then reimport the second file
**When** the reimport completes
**Then** the modifications are preserved in the reimported state (lossless skeleton round-trip)

**Given** the app does not use eval(), new Function(), or dynamic import() on any user-provided content
**When** YAML is processed
**Then** only safe YAML loading is used (NFR10)

### Story 3.3: Example Architectures & AI Prompt Template

As a user,
I want to load pre-built example architectures and access an AI prompt template,
So that I can explore real-world architecture trade-offs and generate Archie-compatible YAML from any AI tool.

**Acceptance Criteria:**

**Given** I am on the main app view
**When** I browse the Blueprints tab in the toolbox (or an example selector in the toolbar)
**Then** I see available example architectures: WhatsApp-style Messaging, Telegram-style Messaging (and possibly Facebook)

**Given** I select an example architecture
**When** it loads
**Then** the canvas displays a fully defined architecture with all components placed, connections drawn, configuration variants set, and metrics populated (FR29)
**And** the heatmap, dashboard, and tier system all reflect the example's data

**Given** I load an example architecture
**When** I interact with it (swap components, change configs)
**Then** the architecture behaves identically to any user-created architecture -- full recalculation, heatmap updates, tier evaluation

**Given** I want to generate Archie-compatible YAML from an AI tool
**When** I access the AI prompt template (FR30)
**Then** I see a static format guide explaining the YAML schema, field definitions, and example structure
**And** the template is accessible from the toolbar or a help menu

**Given** the example architectures exist as seed data
**When** the Firestore seed script runs
**Then** complete blueprint data (components, connections, configurations, metrics) is populated in Firestore
**And** the Blueprints tab in the toolbox shows the seeded examples

---

## Epic 4: Deep Intelligence & Polish

User gets rich insights into every component and connection -- code snippets per variant, metric explanations with contributing factors, variant recommendations for weak metrics, delta indicators on variant switch, metric filtering, connection inspection with endpoint health, dashboard drill-down with contributing factors, interactive category info, issues summary with canvas navigation, flow particle animation, and canvas legend. All three journeys fully enriched.

### Story 4.1: Code Snippets & Metric Explanations

As a user,
I want to see implementation code examples and understand why each metric scores the way it does,
So that I can connect abstract metric values to real implementation decisions and trust the directional data.

**Acceptance Criteria:**

**Given** I have a component selected in the inspector
**When** I view the code section
**Then** I see a syntax-highlighted code snippet for the active configuration variant (FR31)
**And** the snippet represents a typical implementation pattern for that variant

**Given** I switch the configuration variant
**When** the inspector updates
**Then** the code snippet changes to reflect the new variant's implementation pattern

**Given** I view a metric in the inspector
**When** I click to expand the metric
**Then** I see a plain-language explanation of why this component+variant scores this way (FR32)
**And** I see a list of specific contributing technical factors
**And** explanations are stored per component + variant + metric in the component library

**Given** I collapse an expanded metric explanation
**When** I click the collapse control
**Then** the explanation hides and the metric returns to its compact display

### Story 4.2: Variant Recommendations & Metric Tools

As a user,
I want the system to suggest better variants for weak metrics, show me what changed when I switch configs, and let me filter which metrics I see,
So that I can quickly identify improvements, understand trade-offs, and focus on what matters most.

**Acceptance Criteria:**

**Given** a component has a metric scoring below the health threshold
**When** I view the inspector
**Then** the system displays a recommendation: "Consider [variant name]" (FR33)
**And** shows the improvement amount for the weak metric
**And** shows the trade-off cost (which metric gets worse and by how much)

**Given** the recommendation is computed
**When** it is generated
**Then** it is derived from existing metric data in the component library (not pre-stored)

**Given** I switch a component's configuration variant
**When** the metrics update in the inspector
**Then** each metric shows a +/- delta indicator showing the change from the previous variant (FR34)
**And** deltas persist until the next variant switch

**Given** I want to focus on specific metrics
**When** I use the metric filter in the inspector (FR35)
**Then** I can show or hide individual metrics
**And** the filtered view persists while inspecting the current component

### Story 4.3: Connection Inspection System

As a user,
I want to click a connection to see its properties and health, and reposition connection labels for readability,
So that I can understand how components communicate and keep my canvas clean.

**Acceptance Criteria:**

**Given** a connection exists between two components
**When** I click the connection line or its label
**Then** the inspector switches to show connection properties: protocol, communication pattern, typical latency, and co-location potential (FR36)

**Given** the connection inspector is showing a connection
**When** I view the health section
**Then** I see per-endpoint health metrics showing how each endpoint contributes to overall connection health (FR37)

**Given** connection properties are displayed
**When** I review them
**Then** the properties are derived from the connected components and stored in the component library (connectionTypes collection -- AR12)

**Given** connections have labels on the canvas (showing protocol type)
**When** labels overlap or are hard to read
**Then** I can drag connection labels to reposition them for readability (FR38)
**And** repositioned labels maintain their position through recalculations

### Story 4.4: Dashboard Drill-Down & Issues Navigation

As a user,
I want to drill into dashboard categories for detailed breakdowns, learn about each category, and quickly navigate to problem components,
So that I can understand what drives each score and systematically address architecture issues.

**Acceptance Criteria:**

**Given** the dashboard is showing category bars
**When** I click an expand button on the dashboard
**Then** an overlay view shows per-category contributing factors -- which specific components and metrics drive each category score (FR39)

**Given** I view the dashboard
**When** I click a category bar
**Then** I see an info popup with: category description, key metrics, why it matters, and how to improve it (FR40)
**And** the category descriptions are loaded from the metricCategories Firestore collection (AR13)

**Given** the architecture has components with warning or bottleneck status
**When** I view the issues summary in the toolbar
**Then** I see a badge count of affected components (FR41)

**Given** I click the issues summary badge
**When** the dropdown opens
**Then** I see a list of each affected component with: name, health status, average score, and worst metric
**And** each entry is clickable to navigate to (select and center) that component on the canvas

### Story 4.5: Canvas Visual Polish

As a user,
I want animated flow particles on connections and a legend explaining visual indicators,
So that I can intuitively understand data flow health and quickly reference what each visual element means.

**Acceptance Criteria:**

**Given** the heatmap is enabled
**When** I view connections on the canvas
**Then** animated particles flow along connection lines (FR42)
**And** particle speed varies by health status: green = fast flow, yellow = moderate, red = slow/congested

**Given** the heatmap is disabled
**When** I view the canvas
**Then** no flow particles are visible

**Given** the heatmap is enabled
**When** I view the canvas
**Then** a semi-transparent legend is displayed explaining heatmap colors (green/yellow/red), connection line styles (solid/dashed), and connection type indicators (FR43)

**Given** the legend is visible
**When** I interact with the canvas normally
**Then** the legend does not interfere with drag-and-drop or component selection
