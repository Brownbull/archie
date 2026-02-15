# Story: 3-3 Example Architectures & AI Prompt Template

## Status: ready-for-dev
## Epic: Epic 3 — YAML Workflow & Content Library

## Overview

As a user, I want to load pre-built example architectures and access an AI prompt template, so that I can explore real-world architecture trade-offs and generate Archie-compatible YAML from any AI tool.

This story creates 2 example architecture blueprints (WhatsApp-style Messaging, Telegram-style Messaging) as seed data, populates the Blueprints tab in the toolbox with browsable blueprint cards, implements blueprint loading onto the canvas (reusing the import pipeline from Story 3-1), creates a static AI prompt template document, and makes it accessible from the toolbar. Journey 2 (Explorer) works end-to-end after this story.

## Functional Acceptance Criteria

**AC-1: Blueprint Browsing**
**Given** I am on the main app view
**When** I click the Blueprints tab in the toolbox
**Then** I see available example architectures: "WhatsApp-style Messaging" and "Telegram-style Messaging"
**And** each blueprint shows a card with name, description, and component count

**AC-2: Blueprint Loading**
**Given** I select an example architecture from the Blueprints tab
**When** I click "Load" (or double-click the blueprint card)
**Then** the canvas displays a fully defined architecture with all components placed, connections drawn, configuration variants set, and metrics populated (FR29)
**And** the heatmap, dashboard, and tier system all reflect the example's data

**AC-3: Blueprint Interactivity**
**Given** I load an example architecture
**When** I interact with it (swap components, change configs, add/remove connections)
**Then** the architecture behaves identically to any user-created architecture — full recalculation, heatmap updates, tier evaluation

**AC-4: Blueprint Replaces Canvas**
**Given** there are existing components on the canvas
**When** I load a blueprint
**Then** the current canvas is replaced with the blueprint architecture (same behavior as YAML import from Story 3-1)

**AC-5: AI Prompt Template Access**
**Given** I want to generate Archie-compatible YAML from an AI tool
**When** I click the "AI Prompt" button in the toolbar (or a help menu item)
**Then** I see a static format guide explaining the YAML schema, field definitions, and example structure (FR30)
**And** the template is copyable to clipboard

**AC-6: Blueprint Seed Data**
**Given** the example architectures need to exist in Firestore
**When** the seed script runs (`scripts/seed-firestore.ts`)
**Then** complete blueprint data (skeleton YAML with component placements, connections, configuration selections) is populated in Firestore
**And** the Blueprints tab shows the seeded examples after refresh

**AC-7: WhatsApp Example Content**
**Given** the WhatsApp-style example architecture is loaded
**When** I inspect it
**Then** it includes components spanning multiple categories (e.g., compute, data storage, caching, messaging, delivery network)
**And** connections between components reflect realistic data flow
**And** the tier system evaluates it at a meaningful tier (not trivially low or max)

**AC-8: Telegram Example Content**
**Given** the Telegram-style example architecture is loaded
**When** I compare it to the WhatsApp example
**Then** it uses different component choices or configuration variants for some categories
**And** the trade-off differences between the two architectures are visible in heatmap and dashboard scores

**AC-9: Empty Blueprint State**
**Given** the Firestore collection has no blueprint data (or Firestore is unreachable)
**When** I view the Blueprints tab
**Then** I see a meaningful empty state message (not a blank panel or crash)

## Architectural Acceptance Criteria (MANDATORY)

### File Location Requirements

- **AC-ARCH-LOC-1:** WhatsApp blueprint YAML at `src/data/blueprints/whatsapp-messaging.yaml`
- **AC-ARCH-LOC-2:** Telegram blueprint YAML at `src/data/blueprints/telegram-messaging.yaml`
- **AC-ARCH-LOC-3:** AI prompt template at `src/data/prompt-template.md`
- **AC-ARCH-LOC-4:** BlueprintTab component modified at `src/components/toolbox/BlueprintTab.tsx`
- **AC-ARCH-LOC-5:** Blueprint schema extended at `src/schemas/blueprintSchema.ts`
- **AC-ARCH-LOC-6:** Seed script updated at `scripts/seed-firestore.ts`
- **AC-ARCH-LOC-7:** Component library extended at `src/services/componentLibrary.ts`
- **AC-ARCH-LOC-8:** Toolbar modified at `src/components/layout/Toolbar.tsx`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** Blueprint data in Firestore stores the architecture skeleton in the same format as the YAML export schema (`ArchitectureFileSchema`). Loading a blueprint uses the same hydration pipeline as YAML import — NOT a separate code path
- **AC-ARCH-PATTERN-2:** Blueprint YAML files in `src/data/blueprints/` use the `ArchitectureFileYamlSchema` format (snake_case fields) — same schema as user-created YAML files
- **AC-ARCH-PATTERN-3:** The seed script reads blueprint YAML files, validates them against the schema, and writes them to a `blueprints` Firestore collection. Blueprint documents include: id, name, description, skeleton (nodes + edges + schema_version)
- **AC-ARCH-PATTERN-4:** `componentLibrary.ts` is extended to cache blueprint data alongside components, stacks — same two-layer caching pattern (Firestore SDK persistence + in-memory Maps)
- **AC-ARCH-PATTERN-5:** BlueprintTab reads from `componentLibrary` (sync, cached) — no direct Firestore queries from components (AR6)
- **AC-ARCH-PATTERN-6:** Blueprint loading calls `architectureStore.loadArchitecture()` (from Story 3-1) — single code path for importing architecture data, whether from YAML file or blueprint
- **AC-ARCH-PATTERN-7:** AI prompt template is a static markdown file bundled at build time — no Firestore storage, no runtime generation

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** BlueprintTab MUST NOT query Firestore directly — reads from componentLibrary cache only (AR6)
- **AC-ARCH-NO-2:** Blueprint loading MUST NOT use a separate hydration pipeline — reuses the import pipeline from Story 3-1
- **AC-ARCH-NO-3:** Blueprint YAML files MUST NOT contain computed data (metrics, heatmap, tier) — skeleton only, consistent with export format
- **AC-ARCH-NO-4:** Seed script MUST NOT write more than 500 operations per batch (Firestore limit)

## File Specification

| File/Component | Exact Path | Pattern Reference | Status |
|----------------|------------|-------------------|--------|
| whatsapp-messaging.yaml | `src/data/blueprints/whatsapp-messaging.yaml` | Seed data (FR28) | NEW |
| telegram-messaging.yaml | `src/data/blueprints/telegram-messaging.yaml` | Seed data (FR28) | NEW |
| prompt-template.md | `src/data/prompt-template.md` | Static content (FR30) | NEW |
| BlueprintTab | `src/components/toolbox/BlueprintTab.tsx` | React component | MODIFY |
| blueprintSchema | `src/schemas/blueprintSchema.ts` | Zod schema (AR5) | MODIFY |
| seed-firestore | `scripts/seed-firestore.ts` | Admin script (AR8) | MODIFY |
| componentLibrary | `src/services/componentLibrary.ts` | Service (AR7) | MODIFY |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15) | MODIFY |
| Toolbar | `src/components/layout/Toolbar.tsx` | Layout component | MODIFY |
| PromptTemplateDialog | `src/components/import-export/PromptTemplateDialog.tsx` | React component | NEW |

## Tasks / Subtasks

### Task 1: Blueprint Schema Extension
- [ ] 1.1 Extend `src/schemas/blueprintSchema.ts` to include a `skeleton` field containing the architecture file structure (nodes, edges, schema_version) — reuse types from `architectureFileSchema.ts`
- [ ] 1.2 Add YAML variant for blueprint seeding (snake_case input)
- [ ] 1.3 Define `BlueprintFull` type: `{ id, name, description, tier?, skeleton: ArchitectureFile }`
- [ ] 1.4 Write unit tests: schema validates, skeleton field required, rejects invalid skeleton

### Task 2: Example Architecture YAML Files
- [ ] 2.1 Create `src/data/blueprints/whatsapp-messaging.yaml` with WhatsApp-style architecture: 5-7 components (e.g., API Gateway/compute, PostgreSQL/data-storage, Redis/caching, Kafka/messaging, CDN/delivery-network, WebSocket server/real-time), connections between them, specific config variants chosen
- [ ] 2.2 Create `src/data/blueprints/telegram-messaging.yaml` with Telegram-style architecture: 5-7 components with different choices (e.g., different messaging queue, different caching strategy), making trade-off differences visible
- [ ] 2.3 Validate both YAML files against `ArchitectureFileYamlSchema` — must parse cleanly
- [ ] 2.4 Ensure all component_ids and config_variant_ids reference actual components in the seed data (`src/data/components/*.yaml`)
- [ ] 2.5 Layout positions: arrange components in a readable flow (left-to-right or top-to-bottom), no overlapping, snapped to grid

### Task 3: Seed Script Update
- [ ] 3.1 Update `scripts/seed-firestore.ts` to read blueprint YAML files from `src/data/blueprints/`
- [ ] 3.2 Validate each blueprint against `BlueprintYamlSchema` before writing to Firestore
- [ ] 3.3 Write to `blueprints` collection in Firestore with document ID = blueprint id
- [ ] 3.4 Respect Firestore 500-operation batch limit (batch chunking if needed — unlikely for 2 blueprints but pattern in place)
- [ ] 3.5 Add error handling: log which blueprints succeeded/failed, continue on individual failures

### Task 4: Component Library Extension
- [ ] 4.1 Extend `src/services/componentLibrary.ts` to load and cache blueprint data from Firestore `blueprints` collection
- [ ] 4.2 Add `getAllBlueprints(): BlueprintFull[]` method (sync, from cache)
- [ ] 4.3 Add `getBlueprint(id: string): BlueprintFull | undefined` method (sync, from cache)
- [ ] 4.4 Load blueprints during `initialize()` alongside components — same two-layer caching pattern
- [ ] 4.5 Write unit tests: blueprints loaded into cache, getBlueprint returns correct data, getAllBlueprints returns all, missing blueprint returns undefined

### Task 5: Blueprint Tab & Loading UI
- [ ] 5.1 Rewrite `src/components/toolbox/BlueprintTab.tsx` to display blueprint cards from componentLibrary
- [ ] 5.2 Each card shows: name, description, component count (from skeleton.nodes.length)
- [ ] 5.3 Add "Load" button on each card — calls `architectureStore.loadArchitecture()` with the blueprint's skeleton data (hydrated through the import pipeline)
- [ ] 5.4 Add loading state (skeleton/spinner) while blueprints are being fetched from cache
- [ ] 5.5 Add empty state when no blueprints available: "No example architectures available"
- [ ] 5.6 Add confirmation if canvas has existing components: "Loading a blueprint will replace your current architecture. Continue?"
- [ ] 5.7 Add `data-testid` attributes: `blueprint-card`, `blueprint-load-button`, `blueprint-tab-empty`, `blueprint-tab-loading`
- [ ] 5.8 Wrap BlueprintTab with ErrorBoundary — Firestore/cache failures show fallback UI

### Task 6: AI Prompt Template
- [ ] 6.1 Create `src/data/prompt-template.md` with the AI prompt template explaining:
  - YAML schema structure (schema_version, nodes, edges)
  - Field definitions (component_id, config_variant_id, position)
  - Available component IDs and their config variant IDs (or a reference to where to find them)
  - An example valid YAML file
  - Instructions for the AI to generate Archie-compatible output
- [ ] 6.2 Create `src/components/import-export/PromptTemplateDialog.tsx` — displays the template in a readable format with a "Copy to Clipboard" button
- [ ] 6.3 Add "AI Prompt" button to `src/components/layout/Toolbar.tsx` next to Import/Export buttons
- [ ] 6.4 Template is loaded as a static import at build time (import from `@/data/prompt-template.md?raw` using Vite raw import)
- [ ] 6.5 Add `data-testid` attributes: `prompt-template-button`, `prompt-template-dialog`, `prompt-template-copy`

### Task 7: E2E & Build Verification
- [ ] 7.1 Create E2E scenarios in `tests/e2e/import-export.spec.ts`: browse blueprints tab, load blueprint onto canvas, verify components render
- [ ] 7.2 Add E2E: load blueprint → interact (change config) → verify recalculation works
- [ ] 7.3 Add E2E: access AI prompt template → verify content visible → copy to clipboard
- [ ] 7.4 Save screenshots at blueprint loading steps
- [ ] 7.5 Run `npx tsc --noEmit` — no type errors
- [ ] 7.6 Run `npm run test:quick` — all tests pass
- [ ] 7.7 Verify coverage meets thresholds

## Dev Notes

### Architecture Guidance

**Blueprint Loading Flow:**
```
User clicks "Load" on a blueprint card in BlueprintTab
  → Read blueprint.skeleton from componentLibrary cache (sync)
  → Hydrate the skeleton through the same pipeline as YAML import:
    → For each node: componentLibrary.getComponent(componentId) → build ArchieNode
    → For each edge: build ArchieEdge with compatibility check
  → Call architectureStore.loadArchitecture(hydratedNodes, hydratedEdges)
  → Canvas renders, recalculation triggers, heatmap/dashboard/tier update
```

**Blueprint Data Structure in Firestore:**
```
blueprints/
  whatsapp-messaging:
    id: "whatsapp-messaging"
    name: "WhatsApp-style Messaging"
    description: "High-throughput messaging with eventual consistency..."
    tier: 2
    skeleton:
      schema_version: "1.0.0"
      nodes: [{ id, component_id, config_variant_id, position }...]
      edges: [{ id, source_node_id, target_node_id }...]
```

**Shared Hydration Pipeline:**
The key design principle is that blueprint loading and YAML file import use the EXACT same hydration code. Create a shared function (e.g., `hydrateArchitectureSkeleton(skeleton, componentLibrary)`) that both `yamlImporter.ts` and the blueprint loading path call. This ensures consistent behavior and reduces code duplication.

**AI Prompt Template Content Guidance:**
The template should be copy-pasteable into any AI chat (Claude, ChatGPT, etc.). It should explain:
1. What Archie is (one sentence)
2. The YAML format with all fields documented
3. Available component IDs (list all from `src/data/components/` seed files)
4. Available config variant IDs per component
5. A complete working example

### Technical Notes

**Vite Raw Import:** Use `import template from '@/data/prompt-template.md?raw'` to import the markdown file as a string at build time. Add `*.md` to the TypeScript module declarations if needed (`declare module '*.md?raw' { const content: string; export default content }`).

**Blueprint YAML Files:** These are NOT imported at runtime — they're seed data processed by `scripts/seed-firestore.ts` at deploy time. The YAML files live in `src/data/blueprints/` for colocation with other seed data, but the running app reads from Firestore (via componentLibrary cache).

**Example Architecture Design:** The two examples should highlight DIFFERENT trade-off profiles:
- WhatsApp: optimized for throughput and real-time delivery (Kafka + Redis + WebSocket)
- Telegram: optimized for operational simplicity and cost efficiency (simpler queue + managed services)
This contrast makes the "Explorer" journey (Journey 2) immediately valuable.

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 3-1: architectureFileSchema, yamlImporter hydration logic, architectureStore.loadArchitecture
- Story 3-2: Round-trip fidelity (blueprints should survive export → reimport)
- Story 1-2: componentLibrary service (extended for blueprints), seed-firestore.ts (extended for blueprints)
- Story 2-1/2-2/2-3/2-4: Full recalculation pipeline (imported blueprints trigger recalc, heatmap, dashboard, tier)

**CONSUMED BY (outbound):**
- TD-3-3a (Seed Hardening): Hardens the seed script additions made here
- EmptyCanvasState: "Try an example" suggestion should link to BlueprintTab (or trigger blueprint loading)

### Hardening Notes (Built-in)

**Pattern 1 (Data Pipeline):** Validate blueprint YAML against schema before seeding, batch chunking in seed script (Firestore 500-op limit).
**Pattern 2 (Error Resilience):** ErrorBoundary on BlueprintTab, empty state handling, graceful Firestore failure.
**Pattern 4 (E2E Testing):** data-testid on all blueprint UI elements, E2E spec for blueprint browsing and loading.
**Pattern 5 (Pure Component):** BlueprintTab handles empty, loading, and error states cleanly.

### E2E Testing

Key E2E scenarios:
- Browse Blueprints tab → see 2 example architectures
- Load WhatsApp blueprint → canvas populates with components, heatmap shows colors, dashboard shows scores
- Load blueprint → change config → verify recalculation works (blueprint behaves like user architecture)
- Access AI prompt template → content visible, copy to clipboard works

## ECC Analysis Summary
- Risk Level: MEDIUM (seed data pipeline + new Firestore collection)
- Complexity: Medium-High (YAML content creation + seed script + UI + template)
- Sizing: LARGE (7 tasks, ~32 subtasks, ~10 files)
- Agents consulted: Planner, Architect, Security Reviewer
- Hardening: BUILT-IN (schema validation, error resilience, E2E, pure component)
- Separate TD: TD-3-3a (seed script & blueprint hardening)
- Key risks: Blueprint YAML referencing non-existent components (mitigated by schema validation + seed order), seed script failures (mitigated by error handling + batch chunking)
