# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Mastery Tracks — pivot the Challenge system into a game-like progression/leveling system. Challenges become a deterministic, loadable tech tree (Factorio-style DAG): completing a challenge unlocks blocks + downstream challenges and grants XP toward a specialization track. Players climb 7 tracks (Foundations, Data, Edge & Delivery, Realtime, Reliability & Ops, Security & Identity, AI/ML) Novice → Architect, unlocking titles + PixelLab avatars. Challenge mode is login-only and hard-gates the block palette to what's unlocked/available; free-build mode is unchanged. The interface experience-level (beginner/intermediate/advanced) stays a separate density layer.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-06-02
- **Last Updated:** 2026-06-02
- **Design artifact:** docs/gabe/plans/2026-06-02-mastery-tracks/index.html (interactive learning-tree: 7 tracks × 5 tiers, branching DAG, WoW-style level gating, per-node detail)
- **Source:** recon of the existing challenge/attempts/taxonomy systems + Coding-Ducks archetypes (use as base, build deeper). Strictly an extension of the existing challengeSchema/challengeStore/rubricScorer.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Challenge schema v2 + tech-tree foundation | Deterministic, loadable challenge file (`schema_version`, `track`, `tier`, `requires`, `unlocks`, `available_blocks`, `rewards.xp`) mirroring the architecture schema; runtime "Load Challenge…" import; recast the 10 authored challenges into the tree spine; a pure `techTree` resolver (locked/available/completed + unlocked blocks) with tests. No UI/gating behavior change. | ent | high | ✅ | ⬜ | ✅ | ✅ |
| 2 | Progress model + challenge-mode gating | Cloud-only owner-only Firestore `userProgress/{uid}` (D9 rules); progressStore + persistence; award XP at `scoreAttempt` (delta-above-best, no farming); per-track tiers derived from XP; hard-gate the challenge-mode palette to unlocked/available blocks; login-required challenge mode; WoW relative-level coloring + 2-tier lock in the challenge selector. | ent | high | ✅ | ⬜ | ✅ | ⬜ |
| 3 | Leveling UX — profile, tiers & avatars | Profile panel anchored on AccountMenu: per-track XP bars + tiers + unlockable titles; PixelLab tier avatars (local PNGs + resolver + lockstep test); unlock/tier-up toasts; a tech-tree progression view. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Branch challenges (content) | Author greenfield-track + archetype challenges with the v2 schema: Static Site+CDN, E-Commerce flash-sale (uses the surge traffic pattern), IoT telemetry, Social feed; Security & AI/ML ladders; deeper Data/Realtime/Reliability tiers. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Challenge Forge (authoring) | In-app visual editor (fully scoped — no free-form strings, all pickers from allowlists; only budget/RPS/latency numeric); export (challengeExporter reverse serializer → YAML); import (file-gate + loadChallengeFromYaml); separate user-challenge registry (origin-tagged, id-namespaced); localStorage drafts + owner-only Firestore `userChallenges/{uid}` cloud persistence; share = export file only. D45 zero-progression rules enforced by Phase 2. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec ⬜/🔄/✅. Review/Commit/Push auto-ticked. User-facing phases require runtime journey evidence. -->

## Phase Details

### Phase 1 — Challenge schema v2 + tech-tree foundation
```yaml
phase: 1
types: [data, schema, file-io]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D41
```
- **Tier:** ent — the schema is load-bearing + user-loadable; deterministic round-trip + a tested resolver matter. See D40 (model) + D41.

### Phase 2 — Progress model + challenge-mode gating
```yaml
phase: 2
types: [data, auth, user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Integration]
suppressed_dims_count: 0
decisions_entry: D42
```
- **Tier:** ent — per-user cloud data + owner-only Firestore rules (D9); XP integrity + login-gated correctness. Runtime journey evidence required (gating). See D42.
- **D45-AC1:** scoreAttempt reward path skips `origin !== 'builtin'` — user-authored challenges grant ZERO XP/grants.
- **D45-AC2:** For `origin: 'user'` challenges, `available_blocks` intersected with player's `unlockedBlocks` — no self-authored palette bypass.

### Phase 3 — Leveling UX — profile, tiers & avatars
```yaml
phase: 3
types: [user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UX]
suppressed_dims_count: 0
decisions_entry: D43
```
- **Tier:** ent — core player identity/UX; needs polish + runtime journey evidence. See D43.

### Phase 4 — Branch challenges (content)
```yaml
phase: 4
types: [content, data]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D44
```
- **Tier:** mvp — authoring challenge YAMLs against the v2 schema; iterate on content. See D44.

## Current Phase

Phase 2: Progress model + challenge-mode gating

## Dependencies

- P2 depends on P1 (the techTree resolver + schema v2 define unlock/XP edges P2 persists + gates on).
- P3 depends on P2 (renders the per-user progress + tiers P2 produces).
- P4 depends on P1 (authors against schema v2); benefits from P2/P3 to play-test the tree.
- P5 depends on P1 (schema + loadChallengeFromYaml + techTree) and P2 (the zero-progression + palette-intersection acceptance criteria D45-AC1/AC2). Content-wise benefits from P4 (proves schema is hand-authorable).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Schema v2 must not break the 10 existing challenges or their build-time glob loader | high | All new fields optional + `schema_version`; recast the 10 as the spine; round-trip + lockstep tests (mirror architectureFileSchema) |
| `userProgress` Firestore rules (owner-only, schema-mirrored, server-timestamp) per D9 | high | Mirror the attempts rules; rules need a manual `firebase deploy --only firestore:rules` (CI deploys hosting only — D9 memory) |
| Hard-gating must NOT leak into free-build mode | medium | Gate keyed strictly on challenge-mode (attemptState); free-build ignores unlockedBlocks (today's behavior) |
| XP farming via re-attempts | medium | Award delta-above-best per challenge (deterministic) |
| PixelLab tier avatars are manual MCP generation, no pipeline | low | Generate incrementally (PixFlux 64×64, "Config C"); Lucide fallback via id-Set + lockstep test (D38 pattern) |
| Self-authored challenges must not grant progression (XP, block grants, palette widening) | critical | D45: runtime origin field (builtin vs user); id-namespace prefix; palette intersection with unlockedBlocks; separate registry. Phase 2 ACs D45-AC1/AC2 |
| Firestore `userChallenges/{uid}` rules need manual deploy (D9 pattern) | high | Mirror attempts rules; manual `firebase deploy --only firestore:rules`; localStorage drafts as fallback until rules deployed |

## Notes

- Two intertwined layers: the **tech tree** (gating — challenge availability + block unlocks) and **Mastery Tracks** (identity — XP→tier→title/avatar). `experienceLevel` stays a separate UI-density knob.
- Block availability is **per-challenge config** (`available_blocks` palette), hard-gated in challenge mode; the tree gates which challenges are reachable.
- WoW item-rarity coloring (grey→white→green→blue→purple→orange) by challenge tier relative to the player; ≥3 tiers above is locked; red reserved for theoretical/open-ended challenges.
- Coding-Ducks archetypes are content seeds (REST API+caching, async jobs, search, chat, global API gateway already map to existing nodes; Static Site, E-Commerce flash-sale, IoT, Social feed are new) — build deeper variants for higher tiers.

## Review Artifacts

- HTML review artifact: docs/gabe/plans/2026-06-02-mastery-tracks/index.html (custom interactive learning-tree — richer than the gabe template; `--no-html-artifact` set so gabe-plan did not generate its own)
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- Phase 2 (challenge-mode gating): Playwright journey — enter challenge mode logged-in, confirm palette hard-gated to unlocked blocks + WoW lock on too-high challenges; screenshots.
- Phase 3 (leveling UX): Playwright journey — complete a challenge → XP/tier-up → unlocked title/avatar visible in profile; screenshots.

### Phase 5 — Challenge Forge (authoring)
```yaml
phase: 5
types: [user-facing, data, file-io, auth]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Integration, UX, Security]
suppressed_dims_count: 0
decisions_entry: D46
```
- **Tier:** ent — visual editor touches the progression-integrity boundary (origin, separate registry, id namespacing, palette intersection). Imported YAML is untrusted. Cloud persistence needs Firestore rules (D9 pattern). See D45 (model) + D46.
- Phase 5 (Challenge Forge): Playwright journey — create a challenge in the visual editor (all-picker, no free-form), export as YAML, import on a fresh session, play the imported challenge, confirm zero XP awarded; screenshots.
