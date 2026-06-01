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
| P44 | 2026-05-30 | dev → main | 9bf9b69 | ✅ 1/1 (~30s) | P4 single-player: History load fix (drop composite-index orderBy → client sort) + 'vs your past attempts' deltas on results modal | run 26701997932 |
| P45 | 2026-05-31 | dev → main | 44a8505 | ✅ 1/1 (~30s) | P5 single-player: component model type→provider→tier — schema typeId, toolbox-by-type, in-node Provider picker, +3 providers (Fastly/Memcached/MySQL) + Firestore re-seed | run 26717273361 |
| P46 | 2026-05-31 | dev → main | 6bc35ed | ✅ 1/1 (~30s) | P6 single-player: live build-health checklist + restartable first-run guided tour (final phase) — EPIC COMPLETE | run 26717729471 |
| P47 | 2026-05-31 | dev → main | 86df56b | ✅ 1/1 (~30s) | Tech debt: D14 (forward-compatible component reader schema) + D11 (E2E spec-drift fixes, flaky set 11→4) | run 26720895039 |
| P48 | 2026-05-31 | dev → main | 841883b | ✅ 1/1 (~30s) | Content: +3 providers (AWS S3 / AWS SQS / Datadog) — object-storage, message-queue, observability now offer comparison (6/17 types); Firestore re-seeded (24 components) | run 26721134116 |
| P49 | 2026-05-31 | dev → main | b0a0bfa | ✅ 1/1 (~30s) | UI fix: Run Simulation + Start Challenge moved off the overlay-mode toolbar (were occluding Cost/Tier/Flow) → bottom-center; + ui-layout audit E2E (overlap guards) | run 26721885354 |
| P50 | 2026-05-31 | dev → main | (content b2) | ✅ 1/1 (~30s) | Content b2: +3 providers (AWS Lambda / Go Service / Pinecone) — serverless, compute, vector-store now offer comparison (9/17 types); Firestore re-seeded (27 components) | run 26722061913 |
| P51 | 2026-05-31 | dev → main | abd8b09 | ✅ 1/1 (49s) | UI fix (deeper visual sweep): icon-only overlay-mode toolbar (active mode keeps label) — clears scenario/failure selectors when inspector narrows the canvas; + ui-layout inspector-open guard + 7-state ui-sweep.spec.ts | run 26722559800 |
| P52 | 2026-05-31 | dev → main | e5ccfb4 | ✅ 1/1 | UI polish (deeper sweep round 2): inspector code snippets now WRAP instead of clipping at the panel edge (wrapLongLines + pre-wrap/break-word on pre+code); + ui-sweep-edge.spec.ts (7 edge states - empty/filtered/no-result/long-name/settings/light-theme/import). Light theme + all edge states reviewed clean. | run 26722971325 |
| P53 | 2026-05-31 | dev → main | 31eeeb2 | ✅ 1/1 | Content b3: +3 providers (HAProxy / AWS Kinesis / AWS Bedrock) - load-balancer, event-stream, llm-gateway now offer comparison (12/17 types); +3 PixelLab icons; Firestore re-seeded (30 components) | run 26723811468 |
| P54 | 2026-05-31 | dev → main | ef4f3ff | ✅ 1/1 | Content b4: +3 providers (Stripe / Neo4j / Apache Airflow) - payments, graph-db, etl now offer comparison (15/17 types); + python syntax highlighting in inspector (Airflow DAGs); +3 PixelLab icons; Firestore re-seeded (33 components) | run 26724261893 |
| P55 | 2026-05-31 | dev → main | 6325213 | ✅ 1/1 | Content b5: +2 providers (Pusher / Splunk) - realtime + security now offer comparison. MILESTONE: 17/17 fundamental types multi-provider, 35 providers; +2 PixelLab icons; Firestore re-seeded (35 components) | run 26724602663 |
| P56 | 2026-05-31 | dev → main | 10d4f5f | ✅ 1/1 | Stacks tab POPULATED: 6 starter stacks + seed pipeline (loadAndValidateStacks / computeStackTradeOffProfile / seedStacksToFirestore); trade_off_profile derived from components; +15 unit tests; Story-8-4 E2E now 4/4. Firestore: 35 components + 15 blueprints + 6 stacks | run 26725162345 |
| P57 | 2026-05-31 | dev → main | 9d73382 | ✅ 1/1 (42s) | UX connect part 1: empty-canvas Get-started card now 5 actionable options (Blueprint/Stack/Components/Challenge/Import) - fixes P0 dead buttons; challenge picker open-state lifted to uiStore; History empty-state 'Start a challenge' CTA | run 26726154346 |
| P58 | 2026-05-31 | dev → main | 9731569 | ✅ 1/1 (57s) | UX connect part 2: toolbox tab tooltips (incl. Stacks ADD vs Blueprints REPLACE); ComponentTab challenge-guidance banner (required categories) + implemented allowedCategories palette restriction | run 26726324989 |
| P59 | 2026-05-31 | dev → main | 7e95724 | ✅ 1/1 (47s) | Content: +6 stacks (12 total) - microservices-gateway, streaming-analytics, batch-etl, payment-checkout, graph-recommendations, jamstack; renamed cache-aside stack display name; Firestore re-seeded | run 26726398333 |
| P60 | 2026-05-31 | dev → main | 41129e3 | ✅ 1/1 (46s) | Architect-audit c2 (reveal tools): Scenario/Failure selector tooltips + banners now show preset descriptions; overlay toolbar legend per active mode | run 26727205384 |
| P61 | 2026-05-31 | dev → main | 0620219 | ✅ 1/1 (53s) | Architect-audit c3 (tour): rewrote guided tour to 6 steps - 3 ways to start, type→provider→tier, analyze & stress-test (overlays + scenarios/failures) | run 26727258980 |
| P62 | 2026-05-31 | dev → main | bc97ea6 | ✅ 1/1 | Architect-audit c1a (decision support): Provider swap dropdown shows per-provider monthly-cost range - compare providers without swapping | run 26727398922 |
| P63 | 2026-05-31 | dev → main | 668a157 | ✅ 1/1 | Decision support complete (1b+1c): provider-swap before/after delta (unified economics tracker; metric delta already worked); inline actionable Pathway 'Suggested next' panel in Components tab with one-click Add. E2E-verified swap delta | run 26727817314 |
| P64 | 2026-06-01 | dev → main | 6aa15ca | ✅ 1/1 | Toolbox redesign Phase 1: left panel now LOGICAL BLOCKS (17 types, grouped by category, PixelLab type icons + cost range) instead of vendors; drop a block → default vendor, refine in inspector; canvas node reads type-first (type label + vendor·variant subtitle). +17 type icons, typeIcons resolver, TypeBlockCard | run 26729105214 |
| P65 | 2026-06-01 | dev → main | c66b5c8 | ✅ 1/1 | Toolbox redesign Phase 2: connector ports now reveal a clear label on hover ('Database in', 'Cache out') outside the node edge, color-matched - were only a weak native tooltip | run (latest) |
| P66 | 2026-06-01 | dev → main | 86daabf | ✅ 1/1 | Toolbox redesign Phase 3: inspector headline-first - heading = logical type (matches node), vendor in summary line, prominent one-line 'what it is' headline, longer desc moved to on-demand disclosure (junior-architect progressive disclosure) | run (latest) |
| P67 | 2026-06-01 | dev → main | bf5c51f | ✅ 1/1 | Toolbox 2-column block grid (matches reference): compact logical-block cells (icon + wrapping label + cost + add), vendor hover detail as non-reflowing overlay | run (latest) |
| P68 | 2026-06-01 | dev → main | 690fd1c | ✅ 1/1 | Label polish: shortened compound type labels (SQL Database, Graph DB, Event Stream, Realtime, Compute, ETL Pipeline, Vector DB, Security) so the 2-col grid reads cleanly; 'Components' tab → 'Blocks' to declutter the tab row | run (latest) |
| P69 | 2026-06-01 | dev → main | f733776 | ✅ 1/1 (47s) | Node display: vendor icon left of the subtitle (chosen provider, e.g. Node.js); cost line → stats row with throughput (rps) on LEFT, monthly cost on RIGHT | run 26731895440 |
| P70 | 2026-06-01 | dev → main | d411dcd | ✅ 1/1 (49s) | +5 compute providers (Python+Django, Java+Spring, Ruby on Rails, C#+ASP.NET, PHP+Laravel) - Compute now 7 vendors; +5 icons + PHP code highlighting; Firestore re-seeded (40 components) | run 26732184803 |
| P71 | 2026-06-01 | dev → main | 2bc7817 | ✅ 1/1 (46s) | +30 providers across all 16 block types (Flask/FastAPI + full vendor sweep: CockroachDB/Aurora, Neptune/ArangoDB, Qdrant/Weaviate, GCS/MinIO, NATS/Amazon MQ, Redpanda/Pub-Sub, OpenAI/Anthropic, ALB/Envoy, CF Workers, PayPal/Adyen, CloudFront, Ably/Socket.IO, Grafana/New Relic, CF WAF/Vault, dbt/Fivetran) + 30 icons (70 total); Firestore re-seeded → 70 components | run 26734100548 |
| P72 | 2026-06-01 | dev → main | 9b5761e | ✅ 1/1 (48s) | Inspector: code snippet moved behind collapse-by-default 'Code example' disclosure (progressive disclosure); new DataSourceNote 'ⓘ Data source' provenance note (AI-compiled directional estimates, not benchmarks) on block inspector + Stacks + Blueprints tabs | run 26734705457 |
| P73 | 2026-06-01 | dev → main | 87d854a | ✅ 1/1 (48s) | Animated concept loops (SVG+CSS) for all 17 block types — 'miniblock with dots' emulating each concept; new BlockConceptLoop + ~30 bl-* keyframes; mounted in toolbox cards, canvas node headers, inspector hero; honors animations pref + prefers-reduced-motion | run 26736149607 |
| P74 | 2026-06-01 | dev → main | 58f761d | ✅ 1/1 (49s) | +9 block types/17 providers (DNS, API Gateway, NoSQL, Search Engine, Time-Series DB, Worker, Stream Processor, Auth, Rate Limiter) + Load Balancer Compute→Networking (convention + fixes upstream-LB scaling); +17 component icons + 9 type icons + 9 concept loops; Firestore re-seeded → 87 components | run 26737636067 |
| P75 | 2026-06-01 | dev → main | 4759a89 | ✅ 1/1 (48s) | UX Bundle 1/4: canvas autosave to localStorage + restore-on-load (debounced graph snapshot; version-gated corrupt-safe read; 'Start fresh' toast). Fixes silent diagram loss on refresh/close | run 26752049439 |
| P76 | 2026-06-01 | dev → main | 445a1b6 | ✅ 1/1 (45s) | UX Bundle 2/4: anchored spotlight tour (dims all but the region each step teaches: start-card/toolbox/canvas/overlay/scenario/dashboard) + first-node auto-select + one-time nudge | run 26752578103 |
| P77 | 2026-06-01 | dev → main | b9e50d4 | ✅ 1/1 (49s) | UX Bundle 3/4: undo/redo (snapshot history + toolbar buttons + ⌘Z/⌘⇧Z), copy/paste node (⌘C/⌘V), keyboard-shortcuts dialog (? + Settings); multi-select native (React Flow) documented | run 26753219037 |
| P78 | 2026-06-01 | dev → main | b807e3a | ✅ 1/1 (48s) | UX Bundle 4/4: clarity wins — overall-score letter grade (A–F) + tooltip, jargon tooltips (config tier / replicas / AI-prompt), AI-Prompt dialog clarified as copy-paste-to-external-LLM. (Deferred: scenario grouping label, edge a11y cue, challenge run-again) | run 26753667431 |
| P79 | 2026-06-01 | dev → main | 224bdbb | ✅ 1/1 (49s) | UX deferred clarity: 'Test conditions' group label, edge health line-style a11y (solid/dashed/dotted), node heatmap numeric score on hover+aria, challenge scoring-rule text + 'Adjust & retry' | run 26754392980 |
| P80 | 2026-06-01 | dev → main | fa77ae2 | ✅ 1/1 (49s) | Sim/observability Part C: cost+latency+RPS shown for every block (node stats row adds latency; config-tier dropdown shows \$/rps/ms per tier; inspector header adds throughput+latency). Inspector swap-deltas already covered all three | run 26758555823 |
| P81 | 2026-06-01 | dev → main | 0b65efd | ✅ 1/1 (58s) | Sim Part A: right-side live STATS panel (uptime, avg latency+p99, current RPS served/target, monthly cost vs budget, per-block status list with RPS/Latency/Util toggle, t=Ns); durationS added to sim store | run 26759016811 |
