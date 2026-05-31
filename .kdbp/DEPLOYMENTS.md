# Deployments

<!-- Append-only log of push / CI / deploy events. Written solely by /gabe-push Step 7.5. -->

| # | Date | Branch → Target | PR | CI Result | Notes | Decisions |
|---|------|-----------------|-----|-----------|-------|-----------|
| P1 | 2026-05-26 15:17 | dev → main | #27 | ✅ 2/2 (113s) | PR merged 2026-05-26T20:04 | — |
| P2 | 2026-05-26 23:20 | dev → main | #28 | ✅ 2/2 | — | — |
| P3 | 2026-05-27 06:30 | dev → main | #29 | ✅ 2/2 (2m2s) | Phase 5: status dots, swap popover, ripple | — |
| P4 | 2026-05-27 11:20 | dev → main | #30 | ✅ 1/1 (43s) | Epic 12 Phase 1: typed port system foundation + bezier edges | — |
| P5 | 2026-05-28 14:00 | dev → main | #30 | ✅ 1/1 (3s) | Epic 12 Phase 2: port-aware node rendering with colored handle dots | — |
| P6 | 2026-05-29 17:02 | dev → main | #30 | ✅ 1/1 (1s) | Epic 12 Phase 3: port-compatible edge creation with typed port checks | — |
| P7 | 2026-05-29 18:15 | dev → main | #30 | ✅ 1/1 | Epic 12 Phase 4: topology checker engine + Tarjan's bridge detection | — |
| P8 | 2026-05-30 18:30 | dev → main | #30 | ✅ 1/1 (1s) | Epic 12 Phase 5: typed port definitions for all 18 components | — |
| P9 | 2026-05-31 16:45 | dev → main | #30 | ✅ 1/1 (8s) | Epic 12 Phase 6: schema v3 migration with typed port edge extensions | — |
| P10 | 2026-06-02 | dev → main | — | ✅ 1/1 | Epic 12 Phase 7: edge visual upgrade — port-type coloring, legacy dashed, particle inheritance; CI fix: narrowed portTypeEnum cast | — |
| P11 | 2026-06-02 | dev → main | — | ✅ 1/1 | Epic 13 Phase 1: economics schema + 46 variant data (monthlyCost/maxRPS/baseLatencyMs) | — |
| P12 | 2026-06-02 | dev → main | — | ✅ 1/1 | Epic 13 Phase 2: cost computation + inline node cost badge | — |
| P13 | 2026-06-02 | dev → main | — | ✅ 1/1 | Epic 13 Phase 3: Budget HUD + toolbox cost ranges | — |
| P14 | 2026-06-02 | dev → main | — | ✅ 1/1 | Epic 13 Phase 4: inspector economics + delta indicators — Epic 13 COMPLETE | — |
| P15 | 2026-05-29 | dev → main | — | ✅ 1/1 (58s) | Epic 14 Phase 1: scaling-rules model + replicaCount schema v4 foundation | — |
| P16 | 2026-05-29 | dev → main | — | ✅ 1/1 (50s) | Epic 14 Phase 2: replica-aware economics (cost × replicas, capacity × factor) | — |
| P17 | 2026-05-29 | dev → main | — | ✅ 1/1 (51s) | Epic 14 Phase 3: canvas replica stepper + badges + topology rule. First push (af836f8) failed CI build (IssueKind union missing replicas-without-lb); hotfix 486d091 re-deployed green. | — |
| P18 | 2026-05-29 | dev → main | — | ✅ 1/1 (44s) | Epic 14 Phase 4: YAML round-trip integration + E2E export persistence — Epic 14 COMPLETE | — |
| P19 | 2026-05-29 | dev → main | — | ✅ 1/1 (44s) | Epic 15 Phase 1: pure time-stepped simulation engine + types (routing, shed capacity, 28 tests) | — |
| P20 | 2026-05-29 | dev → main | — | ✅ 1/1 (48s) | Epic 15 Phase 2: simulationStore playback state machine + buildSimGraph (16 tests) | — |
| P21 | 2026-05-29 | dev → main | — | ✅ 1/1 (45s) | Epic 15 Phase 3: per-node live telemetry overlay (RPS/latency/capacity bar) | — |
| P22 | 2026-05-29 | dev → main | — | ✅ 1/1 | Epic 15 Phase 4: stats panel + SVG timeline + playback controls (SimulationBar) | — |
| P23 | 2026-05-29 | dev → main | — | ✅ 1/1 | Epic 15 Phase 5: traffic curves + Run Simulation trigger (sim now UI-runnable) | — |
| P24 | 2026-05-29 | dev → main | — | ✅ 1/1 | Epic 15 Phase 6: integration + E2E simulation journey — Epic 15 COMPLETE | — |
| P25 | 2026-05-29 | dev → main | — | ✅ 1/1 | Epic 16 Phase 1: challenge schema + types + loader + scheduled-events engine (43 tests) | — |
| P26 | 2026-05-29 | dev → main | — | ✅ 1/1 | Epic 16 Phase 2: star rubric scorer + challengeStore state machine (14 tests) | — |
| P27 | 2026-05-29 | dev → main | 80c84b1 | ✅ 1/1 (54s) | Epic 16 Phase 3: challenge selector + checklist + budget HUD (data-tier + ARIA; 9→11 tests) | run 26645289463 |
| P28 | 2026-05-29 | dev → main | b555ec6 | ✅ 1/1 | Epic 16 Phase 4: Start button + auto-score + results modal (snapshot-scored; +integration test) | run 26646590475 ⚠ node20-deprecation annotation |
| P29 | 2026-05-29 | dev → main | 2576e58 | ✅ 1/1 | Epic 16 Phase 5: 10 challenge levels (engine-aligned content; Chaos Day made winnable) | run 26647741341 |
| P30 | 2026-05-29 | dev → main | 912439e | ✅ 1/1 (49s) | Epic 16 Phase 6: integration + E2E challenge journey (+ durationSeconds bug fix) — EPIC 16 COMPLETE | run 26648812806 |
| P31 | 2026-05-29 | dev → main | b2e3a70 | ✅ 1/1 (44s) | CI: node24 action bump (checkout/setup-node@v6 + FORCE node24) — D8 resolved, deploy gate validated under Node 24 | run 26656837212 |
| P32 | 2026-05-29 | dev → main | 8e1a53b | ✅ 1/1 (47s) | Epic 17 Phase 1: shadow-simulation suggestion engine (first deploy on node24 stack) | run 26658951140 |
| P33 | 2026-05-29 | dev → main | 73bd8e6 | ✅ 1/1 (47s) | Epic 17 Phase 2: "Try this next" suggestion card in challenge results | run 26659718139 |
| P34 | 2026-05-29 | dev → main | b0bbf52 | ✅ 1/1 (53s) | Epic 17 Phase 3: challenge-mode auth verified (global AuthGuard, D35) + useCurrentUserId seam | run 26660008483 |
| P35 | 2026-05-29 | dev → main | 4bbaaad | ✅ 1/1 (44s) | Epic 17 Phase 4: Firestore attempts persistence + hardened owner-only rules (anti-spoof) | run 26661527552 |
| P36 | 2026-05-29 | dev → main | 986b5a6 | ✅ 1/1 (43s) | Epic 17 Phase 5: History tab (submissions log) + cross-user isolation hardening | run 26662388763 |
| P37 | 2026-05-29 | dev → main | 5a3cc99 | ✅ 1/1 (52s) | Epic 17 Phase 6: score→persist→History integration + brand-logo deferral — EPIC 17 COMPLETE | run 26662690555 |
| P38 | 2026-05-30 | dev → main | 6e4f0a5 | ✅ 1/1 (44s) | Epic 17 polish: 18 PixelLab pixel-art component icons (ComponentIcon + lucide fallback) — resolves D10 | run 26684678322 |
| P39 | 2026-05-30 | dev → main | 7434eba | ✅ 1/1 (55s) | Tech debt: D4 (ComponentDetail render-safe hooks) + D3 (split architectureStore.ts → slice, <800) | run 26685135445 |
| P40 | 2026-05-30 | dev → main | db01acd | ✅ 1/1 (47s) | Tech debt: D2+D6 (split oversized test files) + D1 (port tooltips already done) | run 26685433334 |
| P41 | 2026-05-30 | dev → main | 45b6192 | ✅ 1/1 (~30s) | P1 single-player: on-object Remove/Duplicate toolbars (node+edge) + removeEdges selection-clear fix | run 26700944887 |
| P42 | 2026-05-30 | dev → main | e4ded41 | ✅ 1/1 (~30s) | P2 single-player: auto-fit on load + forgiving wiring (connectionRadius 40, connectOnClick) + clearer budget label | run 26701254717 |
| P43 | 2026-05-30 | dev → main | cffad5e | ✅ 1/1 (~30s) | P3 single-player: information density — compact palette (collapsible categories) + inspector collapse-by-default hierarchy + per-node util% | run 26701637973 |
