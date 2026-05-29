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
