# Story: 4-5 — Canvas Visual Polish

## Status: done
## Epic: Epic 4 — Canvas Intelligence & UX Polish

## Overview
Elevate the canvas from functional to polished with two visual enhancements. First, flow particle animation on connections: when the heatmap is enabled, animated dashes travel along each connection path, with speed encoding the connection's heatmap status (fast = healthy, slow = bottleneck). Second, a canvas legend: a non-blocking overlay in the bottom-left corner explaining heatmap color coding and particle speed meaning — always visible when the heatmap is on, dismissible per session.

Implements FR42 (Flow Particle Animation on Connections) and FR43 (Canvas Legend).

## Functional Acceptance Criteria

- [x] **AC-FUNC-1** — When the heatmap is enabled and a connection has a computed `edgeHeatmapStatus`, a flow particle animates along the connection path. The particle is a short dashed stroke traveling from source to target in a continuous loop.
- [x] **AC-FUNC-2** — Particle animation speed encodes heatmap status:
  - `healthy` (green): fast — ~0.6s per cycle
  - `warning` (yellow): medium — ~1.4s per cycle
  - `bottleneck` (red): slow — ~3.0s per cycle
- [x] **AC-FUNC-3** — When heatmap is disabled OR the connection has no `edgeHeatmapStatus`, NO particle is rendered (zero DOM overhead).
- [x] **AC-FUNC-4** — Particle animation runs on the CSS compositor thread (no JavaScript animation loop). Zero React re-renders during animation.
- [x] **AC-FUNC-5** — CanvasLegend renders as a non-blocking overlay in the bottom-left of the canvas when heatmap is enabled. It explains: color coding (green/yellow/red) and particle speed encoding (fast/slow meaning).
- [x] **AC-FUNC-6** — CanvasLegend has a dismiss button (X icon). Once dismissed, it stays hidden for the session (uiStore flag). It reappears if the user toggles heatmap off and back on.
- [x] **AC-FUNC-7** — CanvasLegend does NOT block canvas interactions (pan, zoom, drag, click). It is pointer-events-none on its container with pointer-events-auto on interactive children only.
- [x] **AC-FUNC-8** — Both features gracefully degrade: empty canvas = no particles rendered, no legend shown; heatmap disabled = no particles, no legend.

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements
- [x] **AC-ARCH-LOC-1** — `CanvasLegend` component lives in `src/components/canvas/CanvasLegend.tsx`.
- [x] **AC-ARCH-LOC-2** — Flow particle CSS (`@keyframes flow-dash`, `.flow-particle`, `.flow-particle-healthy`, `.flow-particle-warning`, `.flow-particle-bottleneck`) lives in `src/index.css`.
- [x] **AC-ARCH-LOC-3** — Particle speed constants (`PARTICLE_SPEED_HEALTHY_MS`, `PARTICLE_SPEED_WARNING_MS`, `PARTICLE_SPEED_BOTTLENECK_MS`) live in `src/lib/constants.ts`.

### Pattern Requirements
- [x] **AC-ARCH-PAT-1** — Flow particle uses a second `<path>` element in `ArchieEdge.tsx` with the SAME `d={edgePath}` as `BaseEdge`. CSS classes drive the animation — no `style={{ animation }}` prop injection, no `requestAnimationFrame`, no `setInterval`.
- [x] **AC-ARCH-PAT-2** — `CanvasLegend` follows the `EmptyCanvasState` overlay pattern exactly: `pointer-events-none absolute bottom-4 left-4 z-[Z_INDEX.CANVAS_OVERLAY]` wrapper + `pointer-events-auto` inner panel.
- [x] **AC-ARCH-PAT-3** — `CanvasLegend` dismiss state lives in `uiStore` (new `legendDismissed: boolean` flag). It does NOT use `useState` for persistence across renders.
- [x] **AC-ARCH-PAT-4** — `CanvasLegend` reads heatmap colors from CSS variables (already defined in `src/index.css`: `--color-heatmap-green`, `--color-heatmap-yellow`, `--color-heatmap-red`) — NOT hardcoded hex values.
- [x] **AC-ARCH-PAT-5** — `ArchieEdge.tsx` renders the particle path ONLY when both `heatmapEnabled === true` AND `edgeHeatmapStatus` is defined (truthy guard). The guard prevents any DOM overhead on clean canvases.

### Anti-Pattern Requirements (Must NOT Happen)
- [x] **AC-ARCH-NO-1** — NO JavaScript animation loop (`requestAnimationFrame`, `setInterval`, `setTimeout` in a loop) for particle movement. CSS `@keyframes` only.
- [x] **AC-ARCH-NO-2** — CanvasLegend MUST NOT use `position: fixed` — it must be positioned relative to the canvas container (`absolute` inside `position: relative` parent). Fixed positioning breaks on canvas zoom/scroll.
- [x] **AC-ARCH-NO-3** — Particle `<path>` element MUST NOT have any React `key` prop that changes on each render — this would cause remount and animation restart flicker.
- [x] **AC-ARCH-NO-4** — `legendDismissed` state MUST NOT be stored in `localStorage` or `sessionStorage` directly from the component. If persistence beyond session is desired in future, it goes through a store action — not raw storage calls.

## File Specification

| File/Component | Exact Path | Action | AC Reference |
|----------------|------------|--------|--------------|
| ArchieEdge (add particle path) | `src/components/canvas/ArchieEdge.tsx` | MODIFY | AC-ARCH-PAT-1, AC-ARCH-PAT-5 |
| index.css (add particle keyframes) | `src/index.css` | MODIFY | AC-ARCH-LOC-2 |
| constants.ts (add speed constants) | `src/lib/constants.ts` | MODIFY | AC-ARCH-LOC-3 |
| CanvasLegend | `src/components/canvas/CanvasLegend.tsx` | CREATE | AC-ARCH-LOC-1, AC-ARCH-PAT-2 |
| uiStore (add legendDismissed flag) | `src/stores/uiStore.ts` | MODIFY | AC-ARCH-PAT-3 |
| CanvasView (render CanvasLegend) | `src/components/canvas/CanvasView.tsx` | MODIFY | AC-FUNC-5, AC-ARCH-PAT-2 |
| ArchieEdge unit tests | `tests/unit/components/canvas/ArchieEdge.test.tsx` | MODIFY | AC-FUNC-1, AC-FUNC-3 |
| CanvasLegend unit tests | `tests/unit/components/canvas/CanvasLegend.test.tsx` | CREATE | AC-FUNC-5, AC-FUNC-6 |

## Tasks / Subtasks

- [x] **Task 1: CSS particle animation**
  - [x]1a. Add to `src/index.css`:
    ```css
    @keyframes flow-dash {
      to { stroke-dashoffset: -24; }
    }
    .flow-particle {
      fill: none;
      stroke-width: 2;
      stroke-dasharray: 6 18;
      animation: flow-dash linear infinite;
      pointer-events: none;
    }
    .flow-particle-healthy  { stroke: var(--color-heatmap-green);  animation-duration: 0.6s; }
    .flow-particle-warning  { stroke: var(--color-heatmap-yellow); animation-duration: 1.4s; }
    .flow-particle-bottleneck { stroke: var(--color-heatmap-red);  animation-duration: 3.0s; }
    ```
  - [x]1b. Add to `src/lib/constants.ts`:
    ```typescript
    export const PARTICLE_SPEED_HEALTHY_MS = 600;
    export const PARTICLE_SPEED_WARNING_MS = 1400;
    export const PARTICLE_SPEED_BOTTLENECK_MS = 3000;
    ```
  - [x]1c. Visual smoke test: verify animation plays in browser with correct speed/color for each status.

- [x] **Task 2: ArchieEdge particle integration**
  - [x]2a. In `src/components/canvas/ArchieEdge.tsx`, after the existing `<BaseEdge>`, add:
    ```tsx
    {heatmapEnabled && edgeHeatmapStatus && (
      <path
        d={edgePath}
        className={`flow-particle flow-particle-${edgeHeatmapStatus}`}
      />
    )}
    ```
  - [x]2b. Ensure `heatmapEnabled` is read from `uiStore` (already available via `useUiStore`).
  - [x]2c. Ensure `edgeHeatmapStatus` is derived from edge data (existing pattern in ArchieEdge).
  - [x]2d. Update `tests/unit/components/canvas/ArchieEdge.test.tsx`:
    - Add test: particle path renders when `heatmapEnabled=true` and `edgeHeatmapStatus='healthy'`.
    - Add test: NO particle path when `heatmapEnabled=false`.
    - Add test: NO particle path when `edgeHeatmapStatus` is undefined.
    - Add test: particle class reflects status (`flow-particle-warning`, `flow-particle-bottleneck`).

- [x] **Task 3: uiStore legendDismissed flag**
  - [x]3a. Add `legendDismissed: boolean` (default `false`) and `setLegendDismissed: (val: boolean) => void` to `src/stores/uiStore.ts`.
  - [x]3b. Verify uiStore TypeScript types remain strict (no `: any`).

- [x] **Task 4: CanvasLegend component**
  - [x]4a. Create `src/components/canvas/CanvasLegend.tsx`.
    - Wrapper: `pointer-events-none absolute bottom-4 left-4 z-[Z_INDEX.CANVAS_OVERLAY]`
    - Inner panel: `pointer-events-auto` — rounded card with dark background.
    - Renders when `heatmapEnabled === true && legendDismissed === false`.
    - Content: 3 color swatches (green/yellow/red) with labels ("Healthy", "Warning", "Bottleneck") + particle speed legend ("Fast ↔ Slow = Healthy ↔ Bottleneck").
    - Dismiss X button: calls `uiStore.setLegendDismissed(true)`.
    - When heatmap is toggled off then back on: `legendDismissed` resets to `false` (add this reset in the heatmap toggle action in `uiStore`).
  - [x]4b. Add `data-testid="canvas-legend"` on the inner panel.
  - [x]4c. Add `data-testid="canvas-legend-dismiss"` on the X button.

- [x] **Task 5: CanvasView integration + tests**
  - [x]5a. In `src/components/canvas/CanvasView.tsx`, render `<CanvasLegend />` as a sibling to the `<ReactFlow>` component inside the `canvas-panel` div (same level as `EmptyCanvasState`).
  - [x]5b. Create `tests/unit/components/canvas/CanvasLegend.test.tsx`:
    - Test: renders when heatmap enabled and not dismissed.
    - Test: does NOT render when heatmap disabled.
    - Test: does NOT render when `legendDismissed = true`.
    - Test: clicking dismiss button calls `setLegendDismissed(true)`.
  - [x]5c. Run `npm run test:story` — all tests pass.
  - [x]5d. Run `npm run typecheck` — zero errors.

## Dev Notes

### Architecture Guidance

**CSS compositor animation** — The `stroke-dashoffset` technique is the standard SVG animation pattern for "ants marching" effects. It runs entirely on the GPU compositor thread — no JS, no React re-renders. The particle `<path>` is a static DOM element; the browser handles movement via CSS.

**Same `d={edgePath}` for particle** — Both the `BaseEdge` path and the particle path use the identical `edgePath` string from `getSmoothStepPath()`. React Flow recalculates `edgePath` when nodes move; the particle just follows automatically.

**CanvasLegend placement** — The `canvas-panel` div in `CanvasView.tsx` is `position: relative`. `CanvasLegend` uses `absolute` positioning within it. Do NOT use `position: fixed` (breaks canvas zoom). Reference `EmptyCanvasState.tsx` for the exact pattern.

**legendDismissed reset on heatmap toggle** — When the user turns heatmap off, the legend hides (because `heatmapEnabled === false`). When they turn heatmap back on, the legend should reappear (reset dismissed state). Implement this by resetting `legendDismissed: false` inside the `toggleHeatmap` action in `uiStore`.

**Particle key stability** — The particle `<path>` does NOT need a `key` prop. React Flow re-uses the edge component instance — a key would cause remount and animation restart flicker (AC-ARCH-NO-3).

### Technical Notes

No specialized database or security review required. This story is purely CSS/React visual work.

- **No user input paths** — Neither CanvasLegend nor particle animation handle any user-provided content. No sanitization needed.
- **Performance guard** — AC-FUNC-3/AC-ARCH-PAT-5 ensures zero DOM overhead when heatmap is off. The guard `{heatmapEnabled && edgeHeatmapStatus && (...)}` evaluates in React reconciliation without DOM cost when false.
- **CSS variables** — `--color-heatmap-green`, `--color-heatmap-yellow`, `--color-heatmap-red` are already defined in `src/index.css` and used by `HEATMAP_COLORS` in constants. CanvasLegend swatches should use `bg-[--color-heatmap-green]` Tailwind arbitrary value syntax or inline `style={{ backgroundColor: 'var(--color-heatmap-green)' }}`.

### E2E Testing
- **Action:** CREATE | **File:** `tests/e2e/flow-particles-and-legend.spec.ts` | **Result:** PASS
- **Multi-User:** SINGLE-USER | **Quality Score:** 82/100 | **Date:** 2026-02-25
- **Tests:** 9 (4 legend + 3 particle + 1 combined + 1 no-connection guard)
- **Determinism:** 2/2 consecutive runs passed, no flakiness
- **Fixes applied:** Extracted `connectNodes`, `placeTwoComponents`, `triggerRecalcViaConfigChange` to shared `canvas-helpers.ts`; replaced bare `waitForTimeout` with assertion-based wait on particle element

## Tech Debt Tracking

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| TD-4-5a | Constants & type conventions cleanup (unused PARTICLE_SPEED_*_MS, Z_INDEX format) | LOW | CREATED |
| (N/A) | Protocol field allowlist for YAML import | LOW | ALREADY_TRACKED (TD-4-3b AC-3 documents rendering defense) |

## Senior Developer Review (ECC)
- **Date:** 2026-02-25
- **Classification:** STANDARD
- **Agents:** code-reviewer (sonnet), security-reviewer (sonnet)
- **Outcome:** APPROVE 9.25/10
- **Quick fixes applied:** 4 (allowlist guard, toggleHeatmap simplification, legendDismissed test, persistence constraint comment)
- **TD stories created:** 1 (TD-4-5a)
- **Test health:** All green (82 files, 1329 tests)

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Moderate
- Classification: STANDARD
- Agents consulted: orchestrator (planner + architect analysis inlined)
