# Deployments

<!-- Append-only log of push / CI / deploy events. Written solely by /gabe-push Step 7.5. -->
<!-- History P1–P85 archived to DEPLOYMENTS-archive.md (2026-06-01) to clear the L2-004 churn gravity well. -->

| # | Date | Branch → Target | PR | CI Result | Notes | Decisions |
|---|------|-----------------|-----|-----------|-------|-----------|
| P86 | 2026-06-01 | dev → main | c66d212 | ✅ 1/1 (51s) | Progressive disclosure Phase 1: experience-level block gating — toolbox Beginner/Intermediate/Advanced selector (persisted; challenge sets it, user overrides); beginner sees ~7 essentials, above-level types collapse into a 'More advanced blocks' drawer; search bypasses gating. BlockLevel/typeLevel/typeWithinLevel + blockLevel pref + BlockLevelSelector. +16 unit tests (4082 total) | run 26765851480 |
| P87 | 2026-06-01 | dev → main | 86746eb | ✅ 1/1 (~55s) | Wider, more rectangular canvas nodes (NODE_WIDTH 140 → 192px, 12× the 16px grid) — declutters the on-node vendor dropdown + rps·ms·cost rows that crowded at 140px; single source of truth scales node/ghost/placeholder + all placement math; e2e + unit width pins → 192 | run 26766283509 |
