# e2e-desktop stabilization tracker

> Goal (owner, 2026-06-16): get the chronically-red `e2e-desktop` suite GREEN before merging the
> Kane feedback feature work (PR #31). The suite is informational/non-required and has never been
> green on `main` recently. Baseline (correct helper): **80 failed / 181 passed / 26 skipped**,
> 52 distinct failing tests across 28 specs.

## Root cause (verified)

D23 removed the `component-card-*` grid from the default toolbox; it now renders `type-block-<id>`
/ `add-type-<id>` (`TypeBlockCard`). ~15 specs still use the stale "read `component-card-` id from
DOM → drag" pattern. Most other failures cascade (a test fails to place a component, then asserts
on `aggregate-score` / `inspector-panel` / `rf__node-` that never got created).

**Correct pattern:** `dragComponentToCanvas(page, "<known-id>", x, y)` + assert `archie-node` count
(see `placeTwoComponents()`), or click `add-type-<typeId>` / `add-component-…` per the toolbox.
Do NOT touch `waitForComponentLibrary` (the `component-tab` wait is correct).

## Categories

### A. Stale component-card / add-to-canvas placement (the bulk + their cascades)
Migrate to known-id drag or `add-type-`. Specs:
- [ ] canvas-and-placement.spec.ts (5: L60, L112, L190, L212, L262)
- [ ] scoring-dashboard.spec.ts (7: L104, L131, L160, L237, L328, L353, L390)
- [ ] import-export.spec.ts (4: L9, L22, L36, L174)
- [ ] inspector-and-config.spec.ts (2: L130, L562)
- [ ] inspector-responsiveness.spec.ts (3: L88, L130, L187)
- [ ] replicas-and-scaling.spec.ts (2: L8, L60)
- [ ] economics-cost-badge.spec.ts (1: L7)
- [ ] economics-full-journey.spec.ts (1: L7)
- [ ] expanded-content.spec.ts (1: L279)
- [ ] simulation-engine.spec.ts (1: L7)
- [ ] settings-and-preferences.spec.ts (1: L284)
- [ ] guidance.spec.ts (1: L25)
- [ ] component-icons.spec.ts (1: L7 — toolbox card pixel icons; may need type-block icon testid)
- [ ] metric-filter-and-recommendations.spec.ts (1: L11)
- [ ] port-handles.spec.ts (1: L91)
- [ ] status-dot-and-swap-popover.spec.ts (1: L172)
- [ ] decision-support.spec.ts (1: L8 — provider swap delta)
- [ ] ui-sweep.spec.ts (1: L87 — dense canvas)

### B. Genuinely independent (individual diagnosis)
- [ ] auth-and-app-shell.spec.ts:33 — "sign out" button click times out (account menu)
- [ ] flow-particles-and-legend.spec.ts (2: L88, L225) — canvas-legend toggle
- [ ] history-tab.spec.ts:6 — history-empty not visible
- [ ] challenge-validation.spec.ts (3: L105, L118, L210) — required_types / progression
- [ ] toolbox-browsing.spec.ts (2: L44, L188) — library init state / tab placeholders
- [ ] ux-connections.spec.ts (2: L38, L48) — stacks catalog count / guidance banner
- [ ] vendor-links.spec.ts:45 (3 vendors) — vendor info + link
- [ ] ui-batch-features.spec.ts:14 — quest log mode toggle
- [ ] demand-simulation.spec.ts:367 — failure selector banner/restore

## Progress log
- 2026-06-16: inventory built, root cause confirmed, tracker created. Reverted the wrong
  waitForComponentLibrary change (d87494b). Starting Category A migration.

## Update 2026-06-16 — Category A migrated (parallel agents)

Migrated 14 specs off `component-card-`/`add-to-canvas-` → `type-block-`/`add-type-`/known-id drag:
canvas-and-placement, scoring-dashboard, expanded-content, replicas-and-scaling, inspector-and-config,
economics-cost-badge, economics-full-journey, simulation-engine, settings-and-preferences, guidance,
component-icons, toolbox-browsing, component-swapping, ghost-placement.

- **0 live stale selectors remain** across all e2e specs (grep-verified; only comments/screenshot names left).
- Playwright `--list` compiles all **303 tests / 69 files** clean.
- toolbox-browsing IS/GAIN/COST assertions dropped (that benefit grid was removed by D23); retargeted to type-block h4 label.
- NOTE: tests/e2e is NOT in any tsconfig include — Playwright typechecks specs at runtime, so CI is the real validator.
- Specs NOT touched (no stale pattern / not in failed-52): inspector-responsiveness, metric-filter, port-handles,
  status-dot, decision-support, ui-sweep, import-export, connection-wiring, component-types — verify on CI run.

Next: CI run to confirm Category A passes, then Category B (independent failures).
