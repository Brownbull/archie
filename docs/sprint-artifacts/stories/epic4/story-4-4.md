# Story: 4-4 — Dashboard Drill-Down & Issues Navigation

## Status: done
## Epic: Epic 4 — Canvas Intelligence & UX Polish

## Overview
Enable users to drill into the scoring dashboard for deeper architectural insight. The collapsed dashboard panel gains an expand trigger that opens a full-screen overlay showing all seven metric categories with score breakdowns, explanatory text, and individual component metric values. Each category bar becomes clickable, opening a popup that explains the category's meaning and what the architecture's score reflects. An "Issues" summary badge in the Toolbar surfaces red/yellow metric counts; clicking any issue navigates the canvas to the offending component node.

Implements FR39 (Dashboard Expanded Overlay), FR40 (Category Info Popup), FR41 (Issues Navigation), and AR13 (metricCategories Firestore collection).

## Functional Acceptance Criteria

- [ ] **AC-FUNC-1** — Collapsed DashboardPanel has an expand icon button (chevron-up or grid icon). Clicking it opens DashboardOverlay.
- [ ] **AC-FUNC-2** — DashboardOverlay is a full-screen modal overlay (z-50) displaying all 7 category cards with: category name, icon, score bar, aggregate score, count of components, and a "breakdown" list (top 3 best/worst components per category with their metric value).
- [ ] **AC-FUNC-3** — DashboardOverlay has an accessible close button (X icon, Escape key closes).
- [ ] **AC-FUNC-4** — Each CategoryBar in the panel (and the equivalent row in the Overlay) is clickable. Clicking opens a CategoryInfoPopup tooltip/popover anchored near the click target.
- [ ] **AC-FUNC-5** — CategoryInfoPopup displays: category name, what it measures, why it matters, and the current score's plain-English interpretation (e.g., "Your score of 72 suggests moderate latency pressure — consider introducing caching at the API Gateway").
- [ ] **AC-FUNC-6** — CategoryInfoPopup closes on outside-click or Escape.
- [ ] **AC-FUNC-7** — IssuesSummary component renders in the Toolbar (right side, before SettingsMenu). It shows a badge count of critical issues (heatmap-red components) and warning issues (heatmap-yellow). Hidden when heatmap is disabled or zero issues exist.
- [ ] **AC-FUNC-8** — Clicking an issue item in IssuesSummary navigates the canvas: the target component node is centered and briefly highlighted (fitView + ring pulse animation). Navigation works via `pendingNavNodeId` in `uiStore` — IssuesSummary sets it; CanvasViewInner useEffect fires fitView and clears it.
- [ ] **AC-FUNC-9** — `metricCategories` Firestore collection is seeded. `componentLibrary.initialize()` loads it alongside components/stacks. CategoryInfoPopup content is sourced from this collection (name, description, why-it-matters, score-interpretation thresholds).
- [ ] **AC-FUNC-10** — All AC-FUNC items hold when the canvas has 0 components (empty state: overlay shows "No components on canvas", issues badge hidden).

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements
- [ ] **AC-ARCH-LOC-1** — `MetricCategorySchema` (Zod) lives in `src/schemas/metricCategorySchema.ts`. Its inferred TypeScript type (`MetricCategory`) is re-exported from this file with `export type`.
- [ ] **AC-ARCH-LOC-2** — Repository interface `MetricCategoryRepository` lives in `src/repositories/types.ts` (extend the existing file). Firestore implementation lives in `src/repositories/metricCategoryRepository.ts`.
- [ ] **AC-ARCH-LOC-3** — `DashboardOverlay` component lives in `src/components/dashboard/DashboardOverlay.tsx`.
- [ ] **AC-ARCH-LOC-4** — `CategoryInfoPopup` component lives in `src/components/dashboard/CategoryInfoPopup.tsx`.
- [ ] **AC-ARCH-LOC-5** — `IssuesSummary` component lives in `src/components/layout/IssuesSummary.tsx`.
- [ ] **AC-ARCH-LOC-6** — New `computeCategoryBreakdown()` pure function lives in `src/engine/dashboardCalculator.ts` (extend the existing file).
- [ ] **AC-ARCH-LOC-7** — Firestore seed script lives in `scripts/seed-metric-categories.ts` (standalone, not imported by app code).

### Pattern Requirements
- [ ] **AC-ARCH-PAT-1** — `MetricCategorySchema` uses `.strict()`. All fields have explicit types (no implicit `z.any()`). Schema is the single source of truth — `MetricCategory` type is inferred, not hand-written.
- [ ] **AC-ARCH-PAT-2** — `metricCategoryRepository.ts` follows the existing repository pattern: `getAll()` returns `Promise<MetricCategory[]>`, catches Firestore errors and rethrows as typed errors.
- [ ] **AC-ARCH-PAT-3** — `componentLibrary.ts` adds `metricCategories: Map<string, MetricCategory>` to its cache. `initialize()` fetches it in the same `Promise.all` alongside components/stacks/blueprints. No new singleton is introduced.
- [ ] **AC-ARCH-PAT-4** — `computeCategoryBreakdown()` is a pure function: `(nodes: ArchieNode[], categoryId: string, library: ComponentLibrary) => CategoryBreakdown`. No side effects, no async, no imports from React/Zustand/Firebase.
- [ ] **AC-ARCH-PAT-5** — Navigation from IssuesSummary to canvas node uses the `pendingNavNodeId` pattern exclusively. IssuesSummary calls `uiStore.setPendingNavNodeId(nodeId)`. CanvasViewInner has a `useEffect` watching `pendingNavNodeId` that calls `fitView({ nodes: [{ id }], duration: 300 })` then calls `setPendingNavNodeId(null)`.
- [ ] **AC-ARCH-PAT-6** — DashboardOverlay uses `Z_INDEX.OVERLAY` (`z-50`) from `src/lib/constants.ts`. It renders as a portal or as a sibling to the canvas root — NOT nested inside ReactFlow.
- [ ] **AC-ARCH-PAT-7** — CategoryInfoPopup uses a Radix UI Popover (shadcn `<Popover>`) — no custom positioning logic. NEVER use `dangerouslySetInnerHTML`.
- [ ] **AC-ARCH-PAT-8** — IssuesSummary reads heatmap node statuses from `architectureStore` selectors only — it does NOT recompute metrics itself.

### Anti-Pattern Requirements (Must NOT Happen)
- [ ] **AC-ARCH-NO-1** — `useReactFlow()` is NEVER called outside `CanvasViewInner`. IssuesSummary lives in Toolbar (outside ReactFlowProvider) — it MUST use the `pendingNavNodeId` bridge pattern, not direct React Flow calls.
- [ ] **AC-ARCH-NO-2** — `metricCategoryRepository.ts` does NOT import or depend on any React component or Zustand store. It is a pure data-access module.
- [ ] **AC-ARCH-NO-3** — `DashboardOverlay` does NOT re-implement score calculations. It reads pre-computed scores from `architectureStore` selectors and passes them as props to category cards.
- [ ] **AC-ARCH-NO-4** — CategoryInfoPopup text is NOT hardcoded in the component. Content is sourced from the `metricCategories` cache in `componentLibrary`.
- [ ] **AC-ARCH-NO-5** — No direct Firestore calls from components. All reads go through repositories → `componentLibrary` cache.

## File Specification

| File/Component | Exact Path | Action | AC Reference |
|----------------|------------|--------|--------------|
| MetricCategorySchema | `src/schemas/metricCategorySchema.ts` | CREATE | AC-ARCH-LOC-1, AC-ARCH-PAT-1 |
| MetricCategoryRepository (interface + impl) | `src/repositories/types.ts` + `src/repositories/metricCategoryRepository.ts` | MODIFY + CREATE | AC-ARCH-LOC-2, AC-ARCH-PAT-2 |
| componentLibrary (add metricCategories) | `src/services/componentLibrary.ts` | MODIFY | AC-ARCH-PAT-3 |
| computeCategoryBreakdown() | `src/engine/dashboardCalculator.ts` | MODIFY | AC-ARCH-LOC-6, AC-ARCH-PAT-4 |
| DashboardOverlay | `src/components/dashboard/DashboardOverlay.tsx` | CREATE | AC-ARCH-LOC-3, AC-ARCH-PAT-6 |
| CategoryInfoPopup | `src/components/dashboard/CategoryInfoPopup.tsx` | CREATE | AC-ARCH-LOC-4, AC-ARCH-PAT-7 |
| DashboardPanel (add expand trigger) | `src/components/dashboard/DashboardPanel.tsx` | MODIFY | AC-FUNC-1 |
| CategoryBar (add onClick) | `src/components/dashboard/CategoryBar.tsx` | MODIFY | AC-FUNC-4 |
| IssuesSummary | `src/components/layout/IssuesSummary.tsx` | CREATE | AC-ARCH-LOC-5, AC-ARCH-PAT-8 |
| Toolbar (add IssuesSummary) | `src/components/layout/Toolbar.tsx` | MODIFY | AC-FUNC-7 |
| uiStore (add pendingNavNodeId) | `src/stores/uiStore.ts` | MODIFY | AC-ARCH-PAT-5 |
| CanvasView (add fitView effect) | `src/components/canvas/CanvasView.tsx` | MODIFY | AC-ARCH-PAT-5, AC-ARCH-NO-1 |
| Seed script | `scripts/seed-metric-categories.ts` | CREATE | AC-FUNC-9 |

## Tasks / Subtasks

- [ ] **Task 1: Schema + Repository for metricCategories (AR13)**
  - [ ] 1a. Create `src/schemas/metricCategorySchema.ts` — define `MetricCategorySchema` with Zod `.strict()`. Fields: `id: string`, `name: string`, `description: string`, `whyItMatters: string`, `icon: string`, `scoreInterpretations: z.array(ScoreInterpretationSchema)` where ScoreInterpretation has `minScore: number`, `maxScore: number`, `text: string`. Export inferred `MetricCategory` type.
  - [ ] 1b. Add `MetricCategoryRepository` interface to `src/repositories/types.ts` with `getAll(): Promise<MetricCategory[]>`.
  - [ ] 1c. Create `src/repositories/metricCategoryRepository.ts` — Firestore `getDocs(collection(db, "metricCategories"))` → validate each doc against schema → return typed array.
  - [ ] 1d. Create `scripts/seed-metric-categories.ts` — seed all 7 categories (Performance, Reliability, Scalability, Maintainability, Security, Cost, Developer Experience) with descriptive text and 3-tier score interpretations (0-40 / 41-70 / 71-100).
  - [ ] 1e. Run seed script against dev Firestore and verify data in console.

- [ ] **Task 2: componentLibrary metricCategories integration**
  - [ ] 2a. Add `private metricCategories: Map<string, MetricCategory>` to `componentLibrary.ts`.
  - [ ] 2b. Add `metricCategoryRepository.getAll()` to the `Promise.all` in `initialize()`.
  - [ ] 2c. Expose `getMetricCategory(id: string): MetricCategory | undefined` and `getAllMetricCategories(): MetricCategory[]` public methods.
  - [ ] 2d. Add unit test: `componentLibrary` caches metricCategories after `initialize()`.

- [ ] **Task 3: computeCategoryBreakdown pure function + CategoryInfoPopup**
  - [ ] 3a. Add `computeCategoryBreakdown(nodes: ArchieNode[], categoryId: string, library: ComponentLibrary): CategoryBreakdown` to `src/engine/dashboardCalculator.ts`. Returns top 3 best and worst component metric values for a given category.
  - [ ] 3b. Add unit tests for `computeCategoryBreakdown` (empty nodes, single node, multi-node ordering).
  - [ ] 3c. Create `src/components/dashboard/CategoryInfoPopup.tsx` — shadcn `<Popover>` with category name, description, why-it-matters text, score interpretation for current score, and component breakdown list.
  - [ ] 3d. Modify `CategoryBar.tsx` to accept `onClick?: () => void` prop and render a clickable wrapper.
  - [ ] 3e. Wire popup trigger to CategoryBar in DashboardPanel — clicking a bar opens CategoryInfoPopup with that category's data.

- [ ] **Task 4: DashboardOverlay (expanded view)**
  - [ ] 4a. Create `src/components/dashboard/DashboardOverlay.tsx` — full-screen overlay at `Z_INDEX.OVERLAY` (z-50). Shows all 7 category cards with: name, icon, score bar, component count, and top-3 best/worst breakdown from `computeCategoryBreakdown`.
  - [ ] 4b. Overlay closes on Escape key and X button. Accessible: focus trap, `role="dialog"`, `aria-modal="true"`.
  - [ ] 4c. Modify `DashboardPanel.tsx` — add expand icon button (chevron-up). Local `isOverlayOpen` state controls `DashboardOverlay` visibility.
  - [ ] 4d. Add unit test: DashboardOverlay renders category cards, closes on Escape.

- [ ] **Task 5: IssuesSummary component**
  - [ ] 5a. Create `src/components/layout/IssuesSummary.tsx`. Reads `architectureStore` for nodes with `heatmapStatus === 'bottleneck'` (red) and `heatmapStatus === 'warning'` (yellow). Returns null if heatmap disabled or zero issues.
  - [ ] 5b. Renders a compact badge: red count + yellow count. Clicking opens a dropdown list of issue items (component name + metric category of worst score).
  - [ ] 5c. Each issue item has an onClick that calls `uiStore.setPendingNavNodeId(nodeId)` and closes the dropdown.
  - [ ] 5d. Add unit tests: badge count accuracy, null render when no issues, onClick sets pendingNavNodeId.

- [ ] **Task 6: uiStore + CanvasViewInner navigation bridge**
  - [ ] 6a. Add `pendingNavNodeId: string | null` (default `null`) and `setPendingNavNodeId: (id: string | null) => void` to `src/stores/uiStore.ts`.
  - [ ] 6b. In `src/components/canvas/CanvasView.tsx` (inside `CanvasViewInner`), add `useEffect` watching `pendingNavNodeId`. When non-null: call `fitView({ nodes: [{ id: pendingNavNodeId }], duration: 300 })`, apply a 600ms ring pulse CSS class to the node, then call `setPendingNavNodeId(null)`.
  - [ ] 6c. Add `data-testid="issues-nav-effect"` marker or similar for E2E targeting.
  - [ ] 6d. Add unit test: setting pendingNavNodeId triggers fitView call (mock `useReactFlow`).

- [ ] **Task 7: Toolbar integration + tests**
  - [ ] 7a. Modify `src/components/layout/Toolbar.tsx` — render `<IssuesSummary />` on the right side before `<SettingsMenu />`.
  - [ ] 7b. Add `data-testid="toolbar-issues-summary"` to the IssuesSummary wrapper in Toolbar.
  - [ ] 7c. Run `npm run test:story` — all tests pass.
  - [ ] 7d. Run `npm run typecheck` — zero errors.

## Dev Notes

### Architecture Guidance

**Navigation bridge pattern** — IssuesSummary cannot call `useReactFlow()` because it lives in Toolbar, which is a sibling of `<CanvasView>` outside `ReactFlowProvider`. The bridge:
```
IssuesSummary.onClick(nodeId)
  → uiStore.setPendingNavNodeId(nodeId)
    → CanvasViewInner useEffect watches pendingNavNodeId
      → fitView({ nodes: [{ id }], duration: 300 })
      → setPendingNavNodeId(null)   // clear immediately after
```

**metricCategories Firestore collection** — AR13 requires this collection for CategoryInfoPopup content. The seed script populates it once. `componentLibrary.initialize()` fetches it in the same `Promise.all` — zero extra round-trips.

**computeCategoryBreakdown** — Pure function taking `nodes`, `categoryId`, `library`. It maps over nodes, looks up each component's metric for that category via library cache, sorts descending, and returns top-3 best and worst as `{ nodeId, componentName, value, label }[]`. Does NOT touch the DOM or any store.

**DashboardOverlay render location** — Must NOT be nested inside `<ReactFlow>`. Render it as a sibling to the canvas root (same level as `<Toolbar>` and `<CanvasView>`), controlled by state in `DashboardPanel` lifted to the layout level, or via a Zustand flag.

**Shadcn Popover for CategoryInfoPopup** — Use `@radix-ui/react-popover` (already in project via shadcn). No custom portal logic needed. Set `side="right"` or `side="top"` to avoid canvas overlap.

### Technical Notes

No specialized database or security review was required for this story. Key checks:

- **Firestore security rules** — `metricCategories` collection is read-only for all authenticated users; write access is admin-only (enforced via service account in seed script, not in app code).
- **Input sanitization** — CategoryInfoPopup renders text from Firestore (`category.description`, `category.whyItMatters`, `scoreInterpretation.text`). These are admin-controlled strings (not user input) but MUST still be rendered as React text nodes (not `dangerouslySetInnerHTML`) per `.claude/rules/security.md`.
- **Zod validation on Firestore reads** — `metricCategoryRepository.ts` MUST validate each Firestore document against `MetricCategorySchema` before returning. Invalid documents should log a warning and be filtered out — do not crash the app.
- **Real-time query limits** — If any live listeners are added to `metricCategories` in future, they MUST have a `limit()` applied. For this story, a one-time `getDocs()` is sufficient.

### E2E Testing
E2E coverage recommended — run `/ecc-e2e 4-4` after implementation.
Key journeys: (1) open overlay → verify all 7 categories render → close via Escape, (2) click category bar → verify popup appears → verify content matches Firestore seed, (3) issues badge appears with heatmap-red nodes → click issue → canvas pans to node.

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: Complex
- Classification: COMPLEX
- Agents consulted: orchestrator (planner + architect analysis inlined)

## Tech Debt Tracking (Code Review 2026-02-25)

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| td-4-4a | Dashboard component test coverage (CategoryInfoPopup + CategoryBar) | MEDIUM | CREATED |
| td-4-4b | Schema contiguous range validation + repository error wrapping | LOW | CREATED |
