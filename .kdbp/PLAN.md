# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Epic 17: Smart Suggestions & History — post-simulation "Try this next" card (shadow-simulates candidate changes and shows cost/latency/uptime deltas), plus persistent attempt history. Challenge mode now requires sign-in; attempts persist to a Firestore `attempts` collection (owner-only) and surface in a History tab + submissions table. Closes Phase 3. Builds on Epic 16 (challenge mode + scoring) and Epic 15 (simulation engine).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-05-29
- **Last Updated:** 2026-05-29
- **Roadmap:** Phase 3, Epic 17 (docs/roadmap/phase-3-plan.md) — final epic. Auth/persistence per D33; tiers per D34.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Shadow-simulation suggestion engine | `suggestionEngine`: for each candidate change (add/drop a replica, swap to a cheaper/bigger variant, add a missing required category) re-run the sim and compute {uptimeDelta, latencyDelta, costDelta}; rank net-positive, return the best. Pure logic + deterministic tests. No UI/auth. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | "Try this next" card | Post-results suggestion card showing the best change + its deltas (↑uptime / ↓latency / ↓cost), or "well optimized" when none beats current. Mounted in the results modal / sim bar. | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 3 | Require auth for challenge mode | Gate challenge-mode entry on Firebase Auth (sign-in prompt); sandbox canvas stays anonymous. useAuth wiring + entry guard on the Challenges trigger/Start. (D33) | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 4 | attemptsStore + Firestore attempts collection | On score, persist `{ userId, challengeId, timestamp, stars, uptime, latency, budget, requestsTotal, requestsFailed }` to Firestore `attempts`; owner-only security rules; attemptsStore (load/subscribe per user). security-reviewer pass. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 5 | History tab + submissions table | Sidebar History tab: past attempts with status icon, stars, key metrics; sortable submissions table (date/stars/challenge); best-stars surfaced. Reads attemptsStore. | ent | medium | ✅ | ✅ | ✅ | ⬜ |
| 6 | Integration + E2E + brand-logo polish | integration (score → persist → history) + E2E (signed-in attempt → appears in History); optional brand logos on variants (`brand`, `logoUrl`). | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec: ⬜/🔄/✅. Review/Commit/Push auto-ticked. User-facing/web phases require runtime journey evidence. -->

## Current Phase

Phase 5: History tab + submissions table

## Dependencies

- P2 depends on P1 (card renders engine output). P4 depends on P3 (persistence needs an authed userId). P5 depends on P4 (History reads persisted attempts). P6 depends on all. P1+P2 (suggestions) are independent of the auth/persistence track (P3-P5) and can ship first.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Firestore rules too permissive → users read/write others' attempts | high | Owner-only rules (`request.auth.uid == resource.data.userId`); security-reviewer pass in P4; rules unit-tested if emulator available |
| Requiring auth breaks anonymous challenge flow shipped in Epic 16 | medium | Gate only challenge-mode entry; sandbox canvas + Run Simulation stay anonymous. E2E covers the signed-in path |
| Shadow simulation is expensive (N candidates × full sim) | medium | Bounded candidate set; reuse the deterministic engine; compute lazily on results, not every tick |
| Persisting unauthenticated/partial attempts | medium | Write only after a scored attempt with a valid userId; guard in attemptsStore |
