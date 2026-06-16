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

## Update 2026-06-16 (session 2) — incremental fix loop working

ENABLER: added `grep` input to e2e-desktop workflow_dispatch → validate a subset in ~2-4min
(`gh workflow run "E2E (desktop — informational)" --ref dev -f grep="<filter>"`). This makes
fix→validate cycles fast instead of 28-min full-suite gambles.

ROOT CAUSES FOUND + FIXED (all source-confirmed, not guessed):
1. **Node width drift**: nodes are variable-width (NODE_MIN_WIDTH 176 … NODE_MAX_WIDTH 280), tests
   asserted fixed "208px" (drifted to 213.5px). → assert the [176,280] range / font-independence.
   Fixed: canvas-and-placement (×2), settings-and-preferences font-size test.
2. **Center-click vs header-click**: the node CENTER now carries on-node vendor/config dropdowns
   (Fluidity P1). Clicking center opens a Radix listbox instead of selecting the node, so native
   React-Flow Delete never fires + inspector never opens. → click header `{x:12,y:6}`.
   Fixed: component-swapping local selectNodeOnCanvas + both cleanup-deletes.
3. **add-type-.first() = traffic-source** (TYPE_LIST[0]) which is SOURCE-ONLY (no target handle).
   → target `add-type-compute` when the test needs a node with both handles.

VERIFIED GREEN: canvas-and-placement (9/9). component-swapping: delete/select tests pass; the SWAP
tests (208/254/356) still fail on `.react-flow__edge` count 0 (connectNodes drag-to-connect not
creating an edge — separate root cause). settings:342 has a settings-dialog click timeout.

REMAINING (~55-60 distinct tests, 24 specs) are mostly INDEPENDENT runtime issues (edge creation,
settings dialog timing, vendor selection, history state, scoring cascades). No single root cause
clears them; each needs source-confirmation + a filtered-dispatch validation.

GOTCHAS confirmed: inspector widths 300/500/40px are LEGIT fixed constants (not drift) — do NOT
"fix" them. Always source-confirm before changing an assertion.

## Update 2026-06-16 (session 2c) — scoring-dashboard parked, finishing the tractable tail

WIN SO FAR: fan-out + manual fixes took e2e-desktop 80 → 20 failures (254 passed, 17.5min).

SCORING-DASHBOARD (12 of the remaining 20) — PARKED as a follow-up needing local-Firebase exec.
Symptom: after placing a node it shows cost ($20/mo) but the SCORE dashboard stays empty
("Add components to see architecture scores" persists → computedMetrics empty). Removing the
agent's broken config-change recalc step did NOT fix it. Unknown without running locally: whether a
single UNCONNECTED node produces computedMetrics at all (likely scoring needs a traffic source +
connection). The placement-recalc path is opaque from source-reading alone (mis-predicted 3×).
NEXT (when local Firebase E2E is possible): run scoring-dashboard locally, observe whether a lone
node scores; if not, the tests must place traffic-source + compute + connect (or seed a scored
canvas via architectureStore directly). Owner chose to skip it for now and fix the tractable rest.

TRACTABLE REMAINING (~8): component-swapping ×3 (edge-create via connectNodes), decision-support,
ui-batch-features, radial-menu, settings-and-preferences:284, inspector-responsiveness:231, ui-sweep:87.
