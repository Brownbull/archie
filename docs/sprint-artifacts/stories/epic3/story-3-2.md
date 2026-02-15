# Story: 3-2 YAML Export & Round-Trip

## Status: ready-for-dev
## Epic: Epic 3 — YAML Workflow & Content Library

## Overview

As a user, I want to export my current architecture as a YAML file, so that I can save my work, share it with AI tools, or reimport it later with identical results.

This story creates the YAML export service (dehydrate canvas state → skeleton YAML), the export button in the toolbar, and validates lossless round-trip fidelity (import → modify → export → reimport = identical structural state). It completes the AI-Archie round-trip workflow: AI generates YAML → import into Archie → iterate visually → export YAML → return to AI with full context.

## Functional Acceptance Criteria

**AC-1: Export Trigger**
**Given** I have an architecture on the canvas (at least one component)
**When** I click the Export button in the toolbar
**Then** a YAML file is downloaded via the browser's download mechanism

**AC-2: Skeleton-Only Export**
**Given** the exported YAML file
**When** I inspect its contents
**Then** it contains: schema_version, node IDs, canvas positions, component type selections (component_id), configuration variant choices (config_variant_id), edge definitions (source/target node IDs)
**And** it does NOT contain derived data: metrics, descriptions, heatmap state, pros/cons, code snippets, computed scores, tier assessment, or any runtime state (NFR11)

**AC-3: Lossless Round-Trip (No Modifications)**
**Given** I export an architecture as YAML
**When** I reimport the same file without modifications
**Then** the canvas state is structurally identical: same component placements (positions), same connections (source/target pairs), same configuration variant selections (FR26)
**And** computed state (metrics, heatmap, tier) is re-derived from the current component library

**AC-4: Lossless Round-Trip (With Modifications)**
**Given** I export, modify the architecture (add/remove components, change configs), export again, then reimport the second file
**When** the reimport completes
**Then** the modifications are preserved in the reimported state

**AC-5: Schema Version in Export**
**Given** I export an architecture
**When** the YAML is generated
**Then** it includes `schema_version: "1.0.0"` matching CURRENT_SCHEMA_VERSION from architectureFileSchema

**AC-6: Empty Canvas Handling**
**Given** the canvas has no components
**When** I click the Export button
**Then** the export is either disabled (button grayed out) or exports a valid but empty YAML file with schema_version and empty nodes/edges arrays

**AC-7: No Unsafe Code Execution**
**Given** YAML is generated during export
**When** serialization executes
**Then** only safe YAML dumping is used (`js-yaml dump()`) — no eval or dynamic code (NFR10)

**AC-8: Blob URL Cleanup**
**Given** a Blob URL is created for the download
**When** the download completes (or after a timeout)
**Then** the Blob URL is revoked to prevent memory leaks

**AC-9: Placeholder Nodes Excluded**
**Given** the canvas contains placeholder nodes (from unknown components during import)
**When** I export the architecture
**Then** placeholder nodes are excluded from the export (or included with their original component_id for fidelity)

## Architectural Acceptance Criteria (MANDATORY)

### File Location Requirements

- **AC-ARCH-LOC-1:** YAML export service located at `src/services/yamlExporter.ts`
- **AC-ARCH-LOC-2:** Export button component located at `src/components/import-export/ExportButton.tsx`
- **AC-ARCH-LOC-3:** Toolbar modified at `src/components/layout/Toolbar.tsx`
- **AC-ARCH-LOC-4:** Architecture store export helper in `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-5:** Export service unit tests at `tests/unit/services/yamlExporter.test.ts`
- **AC-ARCH-LOC-6:** Round-trip integration test at `tests/integration/yamlRoundTrip.test.ts`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** `yamlExporter.ts` dehydrates canvas state into skeleton format — extracts only IDs, positions, connections, config selections. Derived data is explicitly excluded (NFR11)
- **AC-ARCH-PATTERN-2:** Export uses camelCase→snake_case transform at the export boundary — inverse of import transform. YAML fields use snake_case convention (AR21)
- **AC-ARCH-PATTERN-3:** Export validates the generated YAML against `ArchitectureFileSchema` before writing — catches serialization bugs at the boundary
- **AC-ARCH-PATTERN-4:** Export uses `js-yaml dump()` for YAML serialization — safe, deterministic output
- **AC-ARCH-PATTERN-5:** File download uses `URL.createObjectURL()` with a Blob, triggers via a hidden `<a>` element click, then revokes the URL
- **AC-ARCH-PATTERN-6:** Round-trip test verifies structural equality: node count, edge count, component IDs, variant IDs, positions (within grid-snap tolerance) — NOT computed values

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** Export MUST NOT include runtime state (computedMetrics, heatmapColors, rippleActiveNodeIds, currentTier) in the YAML output (NFR11)
- **AC-ARCH-NO-2:** Export MUST NOT include environment variables, auth tokens, or any credentials
- **AC-ARCH-NO-3:** Export MUST NOT leave Blob URLs un-revoked — always clean up after download
- **AC-ARCH-NO-4:** Export MUST NOT use `eval()` or `new Function()` — only `js-yaml dump()` (NFR10)

## File Specification

| File/Component | Exact Path | Pattern Reference | Status |
|----------------|------------|-------------------|--------|
| yamlExporter | `src/services/yamlExporter.ts` | Service (AR18) | NEW |
| ExportButton | `src/components/import-export/ExportButton.tsx` | React component | NEW |
| Toolbar | `src/components/layout/Toolbar.tsx` | Layout component | MODIFY |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15) | MODIFY |
| yamlExporter.test | `tests/unit/services/yamlExporter.test.ts` | Unit test (AR22) | NEW |
| yamlRoundTrip.test | `tests/integration/yamlRoundTrip.test.ts` | Integration test (AR22) | NEW |
| import-export.spec | `tests/e2e/import-export.spec.ts` | E2E test (AR22) | MODIFY |

## Tasks / Subtasks

### Task 1: YAML Export Service
- [ ] 1.1 Create `src/services/yamlExporter.ts` with `exportArchitecture(nodes, edges): string` — returns YAML string
- [ ] 1.2 Extract skeleton data from each ArchieNode: `{ id, component_id: data.archieComponentId, config_variant_id: data.activeConfigVariantId, position: { x, y } }`
- [ ] 1.3 Extract skeleton data from each ArchieEdge: `{ id, source_node_id: source, target_node_id: target }`
- [ ] 1.4 Apply camelCase→snake_case transform for YAML output (matching import's inverse)
- [ ] 1.5 Add `schema_version: CURRENT_SCHEMA_VERSION` to the output
- [ ] 1.6 Validate the output against `ArchitectureFileYamlSchema.safeParse()` before returning — catch serialization bugs
- [ ] 1.7 Serialize to YAML string using `js-yaml dump()` with default options
- [ ] 1.8 Handle placeholder nodes: include them with their original `component_id` (preserves round-trip fidelity for unknown components)
- [ ] 1.9 Write unit tests: single node export, multi-node with edges, empty canvas (empty arrays), skeleton-only (no metrics/descriptions in output), schema version present, placeholder node handling, round-trip field mapping (camelCase↔snake_case)

### Task 2: Export UI Component
- [ ] 2.1 Create `src/components/import-export/ExportButton.tsx` with download trigger
- [ ] 2.2 Create Blob from YAML string, generate download URL with `URL.createObjectURL()`
- [ ] 2.3 Create hidden `<a>` element with `download` attribute, click it programmatically
- [ ] 2.4 Revoke Blob URL after download using `setTimeout(() => URL.revokeObjectURL(url), 1000)` — delay ensures download starts
- [ ] 2.5 Generate filename: `archie-{name or "architecture"}-{timestamp}.yaml`
- [ ] 2.6 Disable export button when canvas is empty (no nodes) — use store selector
- [ ] 2.7 Add `data-testid="export-button"` attribute
- [ ] 2.8 Add Export button to `src/components/layout/Toolbar.tsx` next to Import button

### Task 3: Store Integration
- [ ] 3.1 Add `getArchitectureSkeleton()` selector function (not a store action — pure extraction from current state)
- [ ] 3.2 The selector returns `{ nodes: ArchieNode[], edges: ArchieEdge[] }` from current store state — ExportButton reads this

### Task 4: Round-Trip Integration Test
- [ ] 4.1 Create `tests/integration/yamlRoundTrip.test.ts`
- [ ] 4.2 Test: create architecture (3 nodes, 2 edges, specific configs) → export → import → verify structural equality
- [ ] 4.3 Test: import → modify (change variant) → export → reimport → verify modification preserved
- [ ] 4.4 Test: structural equality assertion — node count, edge count, component IDs match, variant IDs match, positions within CANVAS_GRID_SIZE snap tolerance
- [ ] 4.5 Test: computed values NOT in exported YAML (no metrics, no heatmap, no tier)
- [ ] 4.6 Test: empty architecture round-trip (export empty → import empty → no crash)

### Task 5: E2E & Build Verification
- [ ] 5.1 Update `tests/e2e/import-export.spec.ts` with export scenarios: export from populated canvas, export button disabled on empty canvas
- [ ] 5.2 Add round-trip E2E: import example → export → verify file downloaded
- [ ] 5.3 Add `data-testid` attributes to export-related elements
- [ ] 5.4 Save screenshots at export steps
- [ ] 5.5 Run `npx tsc --noEmit` — no type errors
- [ ] 5.6 Run `npm run test:quick` — all tests pass

## Dev Notes

### Architecture Guidance

**Export Pipeline:**
```
User clicks Export button
  → ExportButton reads nodes/edges from architectureStore
  → Calls yamlExporter.exportArchitecture(nodes, edges)
    → Extract skeleton from each node (ID, componentId, variantId, position)
    → Extract skeleton from each edge (ID, sourceNodeId, targetNodeId)
    → Transform camelCase → snake_case for YAML convention
    → Add schema_version header
    → Validate against ArchitectureFileYamlSchema (catch serialization bugs)
    → js-yaml dump() → YAML string
  → Create Blob → URL.createObjectURL()
  → Hidden <a download="filename.yaml"> → .click()
  → setTimeout → URL.revokeObjectURL()
```

**Round-Trip Fidelity Contract:**
The round-trip guarantee is about STRUCTURAL equality, not exact byte-for-byte YAML equality:
- Node IDs: preserved exactly
- Component IDs: preserved exactly
- Config variant IDs: preserved exactly
- Positions: preserved within grid-snap tolerance (CANVAS_GRID_SIZE = 16px)
- Edge source/target: preserved exactly
- Computed values: NOT compared (re-derived from library on each import)

### Technical Notes

**Blob URL Lifecycle:** The pattern is: create → trigger download → revoke. The revoke must happen AFTER the browser initiates the download, hence the setTimeout delay. 1000ms is sufficient for most browsers to start the download.

**YAML Field Order:** `js-yaml dump()` serializes in insertion order. The export function should construct the output object in a logical order: schema_version first, then name, then nodes, then edges.

**Placeholder Node Round-Trip:** Placeholder nodes (from unknown components) are exported with their original `component_id`. On reimport, they will again become placeholders if the component is still unknown. This preserves the user's intent without data loss.

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 3-1: architectureFileSchema (YAML format definition), yamlImporter (for round-trip test), architectureStore.loadArchitecture
- Story 1-3: architectureStore (nodes, edges state)
- Story 2-1: recalculationService (reimport triggers recalculation in round-trip)

**CONSUMED BY (outbound):**
- Story 3-3 (Examples): Example loading validates using the same schema
- TD-3-1a (Import Robustness): Round-trip test patterns reused

### Hardening Notes (Built-in)

**Pattern 1 (Data Pipeline):** camelCase↔snake_case transform, export validates against schema, skeleton-only (no runtime state).
**Pattern 4 (E2E Testing):** data-testid on export button, E2E spec with export + round-trip scenarios.
**Security:** Blob URL revocation (memory leak prevention), no credentials/env in export, safe YAML dumping only.

### E2E Testing

Key E2E scenarios:
- Export from canvas with components → YAML file downloaded
- Export button disabled on empty canvas
- Import → export → reimport → verify canvas looks the same (visual round-trip)

## ECC Analysis Summary
- Risk Level: LOW (exports trusted in-memory state, not user input)
- Complexity: Medium
- Sizing: MEDIUM (5 tasks, ~22 subtasks, ~7 files)
- Agents consulted: Planner, Architect, Security Reviewer
- Hardening: BUILT-IN (schema validation on export, Blob URL cleanup, E2E)
- Key risks: Memory leak from un-revoked Blob URLs (mitigated by setTimeout revoke), stale export from race condition (unlikely at MVP scale)
