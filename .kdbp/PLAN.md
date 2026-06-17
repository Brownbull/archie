# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Kane QA remediation (2026-06-15 handoff) — close the *verified* findings from the Khujta Scanner
7-session evaluation, after correcting the report's severity for stale-build + test-harness artifacts.
The import init-race (B1) and stale AI-prompt template (B2) are already fixed this session; this plan
covers the remaining real work: redeploy current HEAD to retire the already-fixed "MAJOR" items,
build the novice on-ramp (S1 — the keystone for the public self-serve audience), fix the real WCAG
contrast failures, and add agent/SEO discoverability files.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool (react, typescript, vite, react-flow)
- **Created:** 2026-06-15
- **Last Updated:** 2026-06-15
- **Source:** `reports/archie/archie-qa-handoff.md` (Khujta Scanner / Kane, 7 sessions). Every claim
  verified against code + live Firestore this session — see "Verification ledger" in Notes.
- **Audience (owner-confirmed):** public self-serve novices → S1 onboarding is high-value, not optional.
- **Already done (not in phases):** B1 import init-race fix (`importYaml` awaits `componentLibrary.initialize()`
  + `LIBRARY_UNAVAILABLE` guard + 2 regression tests); B2 `prompt-template.md` regenerated to schema
  4.0.0 / 114 components via `scripts/gen-prompt-template.ts` + 5-test drift gate.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Redeploy + re-verify the stale-build items | Ship current HEAD (carries B1/B2 + the already-landed M2/M3/C3 fixes), then re-test M1/M2/M3/C3 on a NORMALLY-PLAYED account to confirm they're resolved; document residual gaps (loading skeleton, "test accounts excluded" copy) only if still real. | ent | low | ✅ | ✅ | ✅ | ✅ |
| 2 | Novice on-ramp (S1 keystone) | First-run route fork ("New to architecture?" → Quest Mode / "I know architecture" → Free Mode), persisted; S1c promote "Start from a Blueprint" as the beginner Free-Mode default; S1d plain-language layer on the bottom-bar scores (extend the Build-Health checklist style). | ent | high | ✅ | ✅ | ✅ | ✅ |
| 3 | Accessibility & discoverability | M4: fix the 5 verified WCAG-AA contrast failures (Free-Mode pill, Test-Conditions label, tour Next button, History date/tags); C4 valid robots.txt; C5 llms.txt for agentic browsing. | ent | med | ✅ | ✅ | ✅ | ✅ |
| 4 | Polish & research | S1b beginner-mode chrome reduction (design/research doc first — overlaps shipped Beginner-mode work, scope it before building); M5 failure-selector discoverability ("stop sim to change conditions" hint) — keep the intentional idle-gate. | ent | med | ✅ | ✅ | ✅ | ✅ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->

## Phase Details

### Phase 1 — Redeploy + re-verify the stale-build items

```yaml
phase: 1
types: [user-facing, deployment]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client-state]
suppressed_dims_count: 0
decisions_entry: D108
```

- **Scope:** Kane tested an OLDER deployed build. Current HEAD already contains: M2 leaderboard
  empty-state ("No ranked architects yet…", LeaderboardDialog.tsx:143) + self-placement
  (`myRow.rank`, :107); M3 tour `tour-skip` button (:227) + `pointer-events-none` backdrop (:175/196,
  so it does NOT intercept clicks) + once-only `tourSeen` gate; C3 `<main>` landmark (AppLayout.tsx:86).
  HEAD also now carries the B1/B2 fixes. So a redeploy retires those four findings at once. After
  deploy, re-run the journey on a *normally-played* account (NOT the REST-seeded `qa-unlocked` — its
  M1 contradictions are seed artifacts: `isTestAccount` excludes it from the board, and it never
  logged attempts). Capture before/after evidence.
- **Exit:** current HEAD live on prod; B1 re-validated via the cold-load import reproduction (now
  passes); M2/M3/C3 confirmed resolved by browser journey artifacts; residual gaps (loading skeleton,
  "excluded" copy) either closed or logged to PENDING with a trigger.
- **Key files:** (deploy only — no source change expected) `firebase.json`, the build output;
  re-verify against `src/components/layout/LeaderboardDialog.tsx`, `src/components/onboarding/*`.
- **Runtime evidence:** `npm run build` + `firebase deploy --only hosting`; browser journey on
  prod (login → import fixture → leaderboard → tour) with screenshots to `test-results/qa-reverify/`.

### Phase 2 — Novice on-ramp (S1 keystone)

```yaml
phase: 2
types: [user-facing, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client-state]
suppressed_dims_count: 0
decisions_entry: D109
```

- **Scope:** The report's highest-leverage UX item, justified by the public-novice audience. (a) S1a:
  on first visit (no persisted choice), present a route fork — "New to architecture?" → Quest Mode
  (First Service) vs "I know architecture" → Free Mode. Persist the choice (preferencesStore, like
  `tourSeen`). (b) S1c: in Free Mode's empty state, promote "Start from a Blueprint" as the visually
  primary beginner option (it's already the most novice-friendly path, just buried as 1 of N). (c)
  S1d: add a plain-language gloss to the bottom-bar architectural scores (e.g., "6.0 C — solid but
  the database is a bottleneck"), reusing the Build-Health checklist's plain-language style. No engine
  change — presentation over existing recalculation output.
- **Exit:** a first-time visitor is offered the Quest/Free fork and lands where they chose; Blueprint
  is the obvious beginner start in Free Mode; every bottom-bar score carries a plain-language line;
  E2E journey artifact of the first-run fork + a fresh account landing in Quest Mode.
- **Key files:** `src/components/canvas/EmptyCanvasState.tsx`, `src/components/layout/ModeToggle.tsx`,
  `src/stores/preferencesStore.ts` (first-run flag), `src/components/dashboard/**` (score gloss),
  `src/components/toolbox/BlueprintTab.tsx` (beginner promotion).
- **Runtime evidence:** E2E spec for the first-run fork on a brand-new account → screenshots of both
  branches; unauthenticated + authenticated paths.

### Phase 3 — Accessibility & discoverability

```yaml
phase: 3
types: [user-facing, web]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client-state]
suppressed_dims_count: 0
decisions_entry: D110
```

- **Scope:** (a) M4: raise contrast to WCAG AA (4.5:1 normal / 3:1 large) on the 5 verified elements —
  Free-Mode mode pill (~3.5:1), Test-Conditions label (`text-text-secondary/80` at 9px, ~1.1:1),
  tour Next button (~3.5:1), History date (~1.8:1), History tags (~1.6:1). Fix via token/opacity
  bumps; verify ratios. (b) C4: ship a valid `public/robots.txt`. (c) C5: ship `public/llms.txt`
  (agentic-browsing score was 67) describing the app for agent crawlers.
- **Exit:** all 5 elements meet AA (measured); robots.txt + llms.txt present and valid; Lighthouse
  a11y ≥ 95 on the affected pages (was 92).
- **Key files:** `src/components/canvas/TestConditionsPanel.tsx`, `src/components/layout/ModeToggle.tsx`,
  `src/components/onboarding/SpotlightTour.tsx`, History panel components, `src/index.css`/theme tokens;
  `public/robots.txt`, `public/llms.txt` (new).
- **Runtime evidence:** contrast-ratio measurement per element (devtools/axe) + Lighthouse a11y re-run.

### Phase 4 — Polish & research

```yaml
phase: 4
types: [user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D111
```

- **Scope:** (a) S1b: "Beginner mode reduces chrome, not just palette" — but this overlaps the already-
  shipped Beginner-mode work and the report flagged it Medium. Research/design FIRST (short doc:
  what chrome to collapse at beginner level — minimap, overlapping panels, overlay toolbar — and
  whether it's worth it), then implement only if the doc justifies it. (b) M5: the failure selector
  is intentionally idle-only (`TestConditionsPanel.tsx:16`, "live STATS panel owns this rail" during
  sim) — keep the gate, add a one-line discoverability hint ("Stop the simulation to change test
  conditions") so the disappearance isn't surprising.
- **Exit:** S1b decision doc written with a build/skip verdict (+ implementation only if "build");
  M5 hint shipped; no regression to the sim STATS rail.
- **Key files:** `docs/gabe/design/beginner-chrome-reduction.md` (new, research), `src/components/canvas/
  TestConditionsPanel.tsx` (M5 hint), beginner-mode chrome components (only if S1b → build).

## Current Phase

Phase 1: Redeploy + re-verify the stale-build items

## Dependencies

- Phase 1 (redeploy) should land FIRST — it ships the B1/B2 fixes already made and retires the
  stale-build findings, shrinking what the later phases must touch.
- Phase 2 (S1) is the headline feature work; independent of 3 and 4.
- Phase 3 is independent; can run parallel to 2.
- Phase 4(a) S1b is design-gated — do not implement before the research doc verdict.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| B1 race re-appears on prod after deploy (local can't reproduce — Firebase env unset locally) | medium | Phase 1 exit re-runs the live cold-load import reproduction against the new deploy; unit tests already lock the await-ordering contract |
| S1 route fork annoys returning users or mis-detects "novice" | medium | Persist the choice like `tourSeen`; offer both branches explicitly; never auto-decide — the user picks |
| Plain-language score gloss drifts from the real scoring math | low | Generate the gloss from the existing recalculation output (read-only); no parallel logic |
| Contrast fixes change the visual design language unexpectedly | low | Token-level opacity/color bumps only; measure ratios before/after; visual diff |
| S1b chrome reduction re-opens settled Beginner-mode design | medium | Research doc gate before any code; explicit build/skip verdict |

## Notes

### Verification ledger (what was checked, what changed)

| Finding | Report severity | Verified verdict | Disposition |
|---------|-----------------|------------------|-------------|
| B1 import broken | BLOCKER | Reproduced live — but it's an INIT RACE, not a bundling/data bug (deployed Firestore has all 114 components; settled import works) | **FIXED this session** |
| B2 stale prompt | (blocker) | Confirmed: schema 1.0.0 vs 4.0.0; ~19 vs 114 components | **FIXED this session** (auto-gen + drift test) |
| S1 route novices | STRATEGIC | Sound; aligns with audience | **Phase 2** |
| M1 gamification contradiction | MAJOR | Artifact of the REST-seeded `qa-unlocked` account (isTestAccount excludes it; no attempts logged) | Re-verify in **Phase 1**; likely no real bug |
| M2 leaderboard | MAJOR | Empty-state + self-placement ALREADY in HEAD; stale build | **Phase 1** redeploy + minor polish |
| M3 tour | MAJOR | `tour-skip` + `pointer-events-none` backdrop + once-only gate ALREADY in HEAD; stale build | **Phase 1** redeploy |
| M4 contrast | MAJOR | Confirmed real (5 elements) | **Phase 3** |
| M5 failure selector idle-only | MAJOR | Confirmed but INTENTIONAL | **Phase 4** hint only |
| C3 main landmark | MINOR | ALREADY exists (AppLayout.tsx:86) | **Phase 1** redeploy retires it |
| C4 robots.txt / C5 llms.txt | MINOR | Genuinely absent | **Phase 3** |
| C1/C2/C6 (jargon, drag model, console) | MINOR | Subjective / partly addressed by S1d + S1b | Folded into Phase 2/4 or parked |

### Parked (not in this plan)
- C1 jargon / C2 drag-model signposting — partly served by S1d (plain language) and the tour; revisit
  if novice testing still flags after S1 ships.
- C6 console issues — investigate opportunistically; Lighthouse best-practices was already 96.

## Review Artifacts

- HTML review artifact: none — remediation plan with a verified text ledger; canonical Markdown suffices.
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- **Phase 1:** prod journey (login → import fixture → leaderboard → tour) → `test-results/qa-reverify/`;
  live cold-load import reproduction re-run against the new deploy.
- **Phase 2:** E2E first-run route fork on a fresh account → both branches screenshotted.
- **Phase 3:** per-element contrast-ratio measurements + Lighthouse a11y re-run artifact.
