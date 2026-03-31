# Competitive Analysis Session Reference

**Date:** 2026-03-19 → 2026-03-20
**Trigger:** Gabe found [Simulador de Arquitetura](https://simuladordearquitetura.com.br) — a Brazilian architecture simulator with AI-at-runtime
**Second analysis:** [paperdraw.dev](https://paperdraw.dev) — Flutter-based system design tool with traffic simulation + chaos engineering
**Outcome:** 2 new epics (9, 10) from Simulador + major scope expansions from paperdraw (live simulation, chaos engineering, cost estimation, component catalog expansion, engineering report)

---

## 1. Competitor Analyzed

**Tool:** Simulador de Arquitetura
**URL:** https://simuladordearquitetura.com.br/#/simulador
**Creator:** Alexsandro Nunes Lacerda (solo developer)
**Language:** Portuguese (BR) with English toggle
**Access:** Free, no login, no API key required (user provides their own for AI features)
**Stack:** React SPA, dark theme, hash-based routing

### Competitor Feature Map

| Feature | Details |
|---------|---------|
| **Components** | 26 pre-configured across 8 categories: Entry/Interface, Processing, Data, Communication, Infrastructure, Security, Observability, Integration |
| **Templates** | 10+ (e-commerce, microservices, serverless, data pipeline, observability, event-driven, BFF+services, auth+search, API+Service+DB, service mesh) |
| **Canvas** | Drag-and-drop with color-coded cards showing inline key-value properties (stack: Java, sla: 100, engine: Redis) |
| **AI modes** | Editor (generate/modify diagrams from text prompt) + Pergunta (Q&A about architecture) |
| **AI providers** | OpenAI (GPT-5.2/5.1/4o/o1), Gemini (3/2/1.5), Claude (4.5/3.5), Grok, DeepSeek |
| **Analysis** | AI-powered scenario analysis (e.g., "Traffic Peak") — sends diagram to LLM |
| **Connections** | Simple directional dashed arrows — no protocol info, no compatibility checking |
| **Metrics** | Flat key-value properties only (no scoring, no heatmap, no trade-off engine) |
| **Export** | Proprietary .sax format |
| **Scoring** | None — relies on AI analysis for evaluation |

### Screenshot Reference

Competitor screenshot saved during analysis (not committed to git). Key UI layout:
- Left sidebar: 8 component categories (expandable) + scrollable template list
- Center: Canvas with color-coded component cards (blue=service, red=entry, green=DB, yellow=cache)
- Right sidebar: AI Analysis panel (provider, model, API key, scenario dropdown, Analyze button)
- Bottom bar: AI prompt input with Editor/Pergunta mode toggle
- Top bar: Project settings, Clear, Export, Import, EN toggle, About

---

## 2. A/B Analysis Summary

### Core Strategic Difference

| | Simulador | Archie |
|---|-----------|--------|
| **Core question** | "Help me BUILD a diagram" | "Help me UNDERSTAND trade-offs" |
| **AI role** | Runtime — AI generates, edits, analyzes | Build-time only — AI generates data library |
| **Value source** | AI quality (external, variable, costs money) | Data + engine quality (internal, deterministic, free) |
| **Learning model** | Ask and receive answers | Discover through interaction |

### Strengths Simulador Has Over Archie

1. AI-powered diagram generation from text
2. AI Q&A about architecture diagrams
3. Scenario-based AI analysis
4. 10+ templates vs Archie's 2
5. Zero friction (no login)
6. Multi-AI provider support

### Strengths Archie Has Over Simulador

1. Deterministic trade-off engine (no hallucination, no API cost)
2. 38 metrics with directional scoring across 7 categories
3. Two-level configuration modeling (infrastructure + data patterns)
4. Heatmap visualization
5. Architecture Tier System
6. Pathway guidance (weighted, personalized)
7. Constraint guardrails with WARN mode
8. Priority weighting (7 weight sliders)
9. Component intelligence (code snippets, explanations, deltas)
10. YAML round-trip (open format)

### Features Extracted for Archie

| # | Feature | Source Observation | Decision |
|---|---------|-------------------|----------|
| 1 | **More templates** | Simulador has 10+, Archie has 2 | Add 8 more blueprints → Epic 10, Story 10-2 |
| 2 | **Zero friction** | Simulador needs no login | REJECTED — not a priority for Archie |
| 3 | **Scenario-based analysis** | Simulador's "Traffic Peak" dropdown | Build deterministic demand simulation → Epic 9 |
| 4 | **Component categories** | Simulador has 8, Archie has 10 | NO CHANGE — Archie already richer. "Integration" deferred to library growth |
| 5 | **Inline property display** | Simulador shows key-values on canvas cards | Add weight-responsive inline metrics → Epic 10, Story 10-1 |

---

## 3. Architectural Decisions Made

### Decision 1: Demand Simulation Approach

**Options evaluated:**

| Option | Description | Verdict |
|--------|-------------|---------|
| A: Weight presets only | Scenario changes which metrics matter (weights), not component metrics | Too shallow — doesn't answer "what happens to my components" |
| B: Scenario modifiers | Apply multipliers to metrics based on demand conditions | Middle ground — considered |
| C: Per-scenario profiles | Components define different metric values per scenario | User's preference — explored further |

**Adversarial review conducted** — 6 attack vectors tested:

1. **Variant × Demand interaction** — per-component data is imprecise (different variants degrade differently). Decision: per-component for MVP, per-variant at Enterprise.
2. **Delta stacking is naive** — additive deltas can zero out metrics. Decision: multiplicative deltas (0.7× not -3).
3. **Cognitive load** — 5 demand sliders + 7 weight sliders = 12 controls. Decision: MVP shows 1 dropdown only, no demand sliders.
4. **Data quality** — AI-generated demand data is speculative. Decision: acknowledged via V2 (honest uncertainty).
5. **Decomposition vs atomic** — decomposed variables allow custom scenarios later but are more complex. Decision: decomposed data structure, atomic UI.
6. **Testing explosion** — decomposed variables create combinatorial test space. Decision: MVP tests 6 preset scenarios only.

**Tiered analysis performed** (MVP / Enterprise / Scale):

| Aspect | MVP | Enterprise | Scale |
|--------|-----|-----------|-------|
| Data structure | Decomposed (demand variables) | Same | Same + interaction coefficients |
| UI | 1 preset dropdown | Simple/Advanced toggle | Custom scenario builder |
| Data scope | Per-component | Per-variant | Per-variant + per-connection |
| Delta math | Multiplicative | Multiplicative | Nonlinear interaction matrix |

**Final decision: Path B** — Scale-ready decomposed data structure with MVP-restricted UI (preset dropdown only). No migration needed when evolving to Enterprise/Scale.

### Decision 2: Inline Canvas Metrics

- **Weight-responsive:** Top 2 metrics by current weight profile, changes when weights change
- **Active variant name** shown on card
- Card grows ~48px taller (2 bars × 16px + variant label 16px)

### Decision 3: Template Count

- 8 new blueprints using existing 10 components only
- AI-generated, hand-validated
- No new components needed for first pass

### Decision 4: Component Categories

- No change now (Archie 10 > Simulador 8)
- "Integration" category deferred until API Gateway / Service Mesh / BFF components ship

---

## 4. Behavioral Changes (archie-clarity)

### V6: Semantic Verification — NEW VALUE

**Created during this session.** Emerged from code review of Story 7.5-4 E2E tests.

**Problem identified:** V5 (Execution Proof) validates that tests RUN, but not that tests verify MEANING. Story 7.5-4's E2E asserted `expect(afterTexts).not.toEqual(beforeTexts)` — proves something changed, doesn't prove the ranking reflects the user's weight profile.

**V6 fills the gap:**
- V5 = "Did you run the test?"
- V6 = "Does the test verify the promise?"

**Full Value Block:** Written in `_kdbp/behaviors/archie-clarity/VALUES.md` (lines 249-306)

**Key constraint:**
```
IS:      Test assertions must verify value-aligned outcomes
IS NOT:  Requiring tests to verify cognitive comprehension (untestable)
DECIDES: When choosing between simpler assertion (element exists) and harder
         one (element contains value-aligned content), invest in the harder one
```

**Handle:** "Test what it means, not just that it renders."

**Enforcement:** Required on every E2E-bearing story. Manually ask permission to skip if cannot be enforced.

### V5: Execution Proof — UPDATED

- Added cross-reference to V6 in ANALOGY LIMITS: "See V6 for assertion depth"
- IS NOT clause updated: "Not a substitute for human value evaluation"

### BEHAVIOR.md — UPDATED

- Version bumped to 1.2.0 (was 1.1.1)
- Updated date to 2026-03-18
- Added V4 linkage: `tests/e2e/pathway-guidance.spec.ts` proves pathway suggestions respond to weight+constraint changes

### Trajectory Ledger — UPDATED

- **V4 pathway guidance drift: RESOLVED** (2026-03-18) — Epic 7.5 shipped it
- **V2 fit indicator trust: RESOLVED** (2026-03-18) — functional promise met, trust validation carry-forwarded as UX concern
- **Remaining unresolved:** V2 user trust validation (requires real user feedback, not code)

### Maturity Assessment Results

Current level: **SEEDLING** (passing)
Promotion to **GROWING**: 3 gaps blocking
1. V5 lacks formal Value Block in VALUES.md (now resolved — V5 + V6 both formalized)
2. Orphan analysis never run
3. No formal stress test (3 scenarios)
4. ANALOGY LIMITS never reviewed since creation

---

## 5. Files Created

| File | Purpose |
|------|---------|
| `docs/sprint-artifacts/stories/epic9/9-1.md` | Demand Schema & Scenario Preset Definitions |
| `docs/sprint-artifacts/stories/epic9/9-2.md` | Component Demand Response Data |
| `docs/sprint-artifacts/stories/epic9/9-3.md` | Demand Simulation Engine |
| `docs/sprint-artifacts/stories/epic9/9-4.md` | Scenario Selector UI & Store Integration |
| `docs/sprint-artifacts/stories/epic9/9-5.md` | E2E — Demand Simulation Flow |
| `docs/sprint-artifacts/stories/epic10/10-1.md` | Inline Canvas Metrics — Weight-Responsive Node Display |
| `docs/sprint-artifacts/stories/epic10/10-2.md` | Blueprint Library Expansion |
| `docs/sprint-artifacts/stories/epic10/10-3.md` | E2E — Canvas Metrics & Blueprint Loading |
| `docs/competitive-analysis/2026-03-20-session-reference.md` | This document |

## 6. Files Modified

| File | What Changed |
|------|-------------|
| `_kdbp-output/epics.md` | Added Epic 9 + Epic 10 definitions, story tables, FR/NFR refs, updated Phase 2 summary table and story index |
| `_kdbp/behaviors/archie-clarity/VALUES.md` | Added V5 full Value Block, added V6 full Value Block, version bumped to 1.2.0 |
| `_kdbp/behaviors/archie-clarity/BEHAVIOR.md` | Updated date, added V4 E2E linkage row |
| `_kdbp/behaviors/trajectory/ledger.md` | Resolved V4 + V2 drift signals, updated unresolved signals |
| `~/.claude/projects/.../memory/MEMORY.md` | Updated current status, next steps, added references section |
| `~/.claude/projects/.../memory/project_competitive_analysis.md` | NEW — saved competitive analysis decisions |

## 7. Functional Requirements Created

| FR | Description | Epic | Story |
|----|-------------|------|-------|
| FR78 | Define demand variables (5 dimensions × 3-4 levels each) | 9 | 9-1 |
| FR79 | Define scenario presets (6 named scenarios with demand profiles) | 9 | 9-1 |
| FR80 | All components define demand response data (multiplicative modifiers) | 9 | 9-2 |
| FR81 | Engine applies demand modifiers to base metrics (multiplicative stacking) | 9 | 9-3 |
| FR82 | Batch computation of demand-adjusted metrics for all canvas nodes | 9 | 9-3 |
| FR83 | Scenario selector dropdown on canvas (6 presets + "No Scenario") | 9 | 9-4 |
| FR84 | Heatmap and dashboard update with demand-adjusted metrics | 9 | 9-4 |
| FR85 | Pathway suggestions respond to demand + YAML export/import | 9 | 9-4 |
| FR86 | Active variant name visible on canvas card | 10 | 10-1 |
| FR87 | Top 2 weight-responsive metrics shown inline on canvas card | 10 | 10-1 |
| FR88 | 8 additional blueprint architectures in library | 10 | 10-2 |

| NFR | Description | Epic | Story |
|-----|-------------|------|-------|
| NFR21 | Demand response validation (multiplier range, complete profiles) | 9 | 9-1 |
| NFR22 | Demand computation <20ms for 15 components | 9 | 9-3 |

## 8. Demand Variables Defined

| Variable | Levels | What It Stresses |
|----------|--------|-----------------|
| traffic-volume | low / medium / high / extreme | Throughput, latency, scalability |
| data-size | small / medium / large / massive | Storage, query performance, cost |
| concurrent-users | low / medium / high | Connection pooling, memory, real-time |
| geographic-spread | single-region / multi-region / global | Latency, replication, consistency |
| burst-pattern | steady / periodic-spikes / unpredictable | Queue depth, cache invalidation, autoscaling |

## 9. Scenario Presets Defined

| Scenario | Traffic | Data | Users | Geo | Burst |
|----------|---------|------|-------|-----|-------|
| Traffic Peak | extreme | medium | high | single-region | periodic-spikes |
| Cost Optimized | low | small | low | single-region | steady |
| Security First | medium | medium | medium | single-region | steady |
| Startup MVP | low | small | low | single-region | steady |
| Enterprise Production | high | large | high | multi-region | unpredictable |
| High Availability | high | large | high | multi-region | periodic-spikes |

## 10. Engine Pipeline (Updated)

```
Base metrics (component library YAML)
    ↓
Config variant overrides (Level 1+2, existing since Epic 1)
    ↓
Demand modifiers (Level 3, NEW — Epic 9)           ← multiplied here
    ↓
Weighted scoring (Level 4, existing since Epic 5)
    ↓
Heatmap + Dashboard + Pathway guidance (existing)
```

## 11. Blueprint Library (After Epic 10)

| # | Blueprint | Components | Pattern |
|---|-----------|-----------|---------|
| 1 | WhatsApp Messaging (existing) | CDN, Nginx, Node+Express, Kafka, WebSocket, Redis Cache, PostgreSQL | High-throughput real-time |
| 2 | Telegram Messaging (existing) | Nginx, Node+Express, RabbitMQ, Redis, PostgreSQL | Cost-efficient messaging |
| 3 | E-Commerce Storefront | CDN, Nginx, Node+Express, PostgreSQL, Redis Cache | Caching-heavy request-response |
| 4 | Event-Driven Pipeline | Kafka, Node+Express, PostgreSQL, Redis | Pub-sub async processing |
| 5 | Real-Time Dashboard | WebSocket Server, Node+Express, Redis, Prometheus | Push-based monitoring |
| 6 | API Gateway Pattern | Nginx, Node+Express, Redis Cache, PostgreSQL | Reverse proxy + rate limiting |
| 7 | Observability Stack | Prometheus, Nginx, Node+Express, PostgreSQL | Metrics collection |
| 8 | Cache-First Read-Heavy | CDN, Redis Cache, PostgreSQL, Nginx | Multi-tier caching |
| 9 | Message Queue Worker | RabbitMQ, Node+Express, PostgreSQL, Redis | Queue-based job processing |
| 10 | Secure API Service | Nginx, Node+Express, PostgreSQL, Redis Cache | Auth-heavy TLS termination |

## 12. Decisions That Can Be Overridden

If a future competitive analysis suggests changes, these are the decision points and where they're codified:

| Decision | Current Choice | Override Would Require | Files Affected |
|----------|---------------|----------------------|----------------|
| Decomposed vs atomic scenarios | Decomposed (Path B) | Rewrite 9-1 through 9-5 stories, change schema approach | `epic9/*.md`, `demandSchema.ts` (when created) |
| Multiplicative vs additive deltas | Multiplicative (0.7×) | Change engine math in 9-3, update all component data in 9-2 | `demandEngine.ts`, `src/data/components/*.yaml` |
| Per-component vs per-variant demand data | Per-component (MVP) | Expand 9-2 to define responses per variant, ~3× more data | `src/data/components/*.yaml` |
| 6 scenario presets | 6 specific scenarios | Add/remove/modify preset YAML files in 9-1 | `src/data/scenarios/*.yaml` |
| Weight-responsive inline metrics | Top 2 by weight | Could be fixed metrics, or 3 instead of 2 | `ArchieNode.tsx`, `useTopMetrics.ts` |
| 8 specific blueprint patterns | Specific set listed above | Swap out blueprints, change component mix | `src/data/blueprints/*.yaml` |
| No AI at runtime | Deterministic engine only | Fundamental architecture change — would need new epic | `architecture.md`, multiple engine files |
| No demand variable sliders (MVP) | Dropdown only | Add slider UI to 9-4, expose demand variables | `ScenarioSelector.tsx` |
| Component categories unchanged | 10 categories, no "Integration" | Add category to constants, create new components | `constants.ts`, new component YAMLs |
| V6 Semantic Verification | Enforced on all E2E stories | Relax to advisory | `VALUES.md`, workflow config |

---

## 13. paperdraw.dev Analysis (Second Competitor)

**Date:** 2026-03-20
**Tool:** paperdraw.dev
**URL:** https://paperdraw.dev
**Stack:** Flutter Web (Dart, canvas-based)
**Access:** Free tier + Pro (upgrade button), cloud-saved SaaS
**Pricing:** Freemium

### Competitor Feature Map

| Feature | Details |
|---------|---------|
| **Components** | 70+ across 11 categories: Traffic & Edge, Network, Compute, Storage, Messaging, Fintech & Banking, Security, Data Engineering, My Services, AI & Agents, Techniques |
| **Templates** | 9 (Global URL Shortener, Social Media Feed, AI Agent Orchestration, Secure Banking Ledger, Video Streaming Platform, Real-time Ride Sharing, Modern Data Analytics, SOS UML Blueprint, Minimal Canvas) |
| **Canvas** | Drag-and-drop with component groups (visual containers), drawing tools (UML, ERD, Flow, State, Mind Maps), auto layout |
| **Simulation** | Live traffic simulation with animated flow particles, real-time RPS/latency/availability/cost metrics, speed + traffic controls |
| **Chaos Engineering** | 40+ scenarios across 4 categories: Infrastructure Failures, Network Chaos, Application-Level Chaos, Data Layer Chaos |
| **Engineering Report** | Post-simulation report with executive summary, incident history table (timestamp, component, issue, explanation, severity %, recommendation), downloadable .md |
| **Cost Tracking** | Real-time $/hr, $/mo during simulation, projected monthly cost |
| **Component Settings** | Per-component: name, deployment region, workload profiles, replicas, capacity (RPS), replication, auto-scale (min/max), circuit breaker, retries with jitter, rate limiting |
| **Connections** | Simple directional arrows — NOT inspectable, no protocol/pattern metadata |
| **Design Explanation** | Auto-generated panel with Why/Rationale/Trade-off per component for each template |
| **Community Library** | Categories (Social Media, E-Commerce, FinTech, Backend), complexity (Easy/Medium/Expert), upvotes, sort (Popular/Newest/Top Rated) — very early stage (1 design) |
| **AI** | AI button (minimal, possibly Pro-gated) |
| **Export** | Video, .md report, share link |
| **Context Menu** | Open Settings, Rename, Start/Connect Connection, Copy, Paste, Duplicate, Delete |

### paperdraw Component Catalog (11 categories)

| Category | Components |
|----------|-----------|
| **Traffic & Edge** (6) | DNS, CDN, Load Balancer, API Gateway, WAF, Ingress |
| **Network** (20+) | L4/L7 LB, Reverse Proxy, Edge Router, VPC, Subnet, NAT Gateway, VPN Gateway, Service Mesh, DNS Server, Discovery Service, Routing Rule, Rate Limiter, Health Check Service, Network Interface, Routing Table, Security Group, Firewall Rule, Sidecar Proxy, Registry/Storage, Routing Policy |
| **Compute** (16+) | App Server, Worker, Serverless, Auth Service, Notification Service, Search Service, Analytics Service, Scheduler, Service Discovery, Config Service, Secrets Manager, Feature Flags, Log Aggregation, Distributed Tracing, Alerting Engine, Health Check Monitor, Media Processor |
| **Storage** (11) | Time-Series Metrics Store, Cache, Database, Object Store, KV Store, Time Series DB, Graph DB, Vector DB, Search Index, Data Warehouse, Data Lake |
| **Messaging** (3) | Message Queue, Pub/Sub, Stream |
| **Fintech & Banking** (4) | Payment Gateway, Ledger Service, Fraud Detection, HSM |
| **Security** (2) | DDoS Shield, SIEM |
| **Data Engineering** (5) | ETL Pipeline, CDC Service, Schema Registry, Batch Processor, Feature Store |
| **My Services** (2) | Users, Service (custom) |
| **AI & Agents** (5) | LLM Gateway, Tool Registry, Memory Fabric, Agent Orchestrator, Safety & Observability |
| **Techniques** (7) | Sharding, Hashing, Shard Node, Partition Manager, Replica Node, Input Source, Output Sink |

### paperdraw Chaos Scenarios (40+ across 4 categories)

| Category | Scenarios |
|----------|-----------|
| **Infrastructure Failures** | AZ Failure, Data Center, System Crash, Database Shutdown, Disk Failure, Disk Corruption, Image Corruption, Storage Throttling, Extra I/O, Crypto Failure, Host Hardware |
| **Network Chaos** | Network Partition, Cross Region, Packet Loss, High Latency, Bandwidth Throttle, Connection Throttle, Load Balancer Failure, DNS Routing, Routing Blackhole, API Gateway Failure, DNS Reset, Routing Blackhole |
| **Application-Level Chaos** | Memory Leak, Out-of-Memory, Thread Pool, Deadlock, GC Pressure, Config Leak, Deployment Failure, Feature Flag, Resource Leaking, Logging Shutdown |
| **Data Layer Chaos** | Database Permission, Replica Lag, Replication Errors, Table/Shard, Data Corruption, Split Brain, Connection Pool, Lock Contention, Query Timeout, Replica Offline, Live Corruption, Metadata Inconsistency |

---

## 14. paperdraw vs Existing Decisions — Contrast & Overrides

### Adversarial Review (2026-03-20)

**7 CRITICAL, 7 HIGH, 4 MEDIUM issues identified.** All proposed paperdraw features were filtered through three gates before inclusion:

1. **Identity Gate:** Does it help users *understand trade-offs* or *simulate operations*?
2. **Data Model Gate:** Can it be expressed in Archie's `MetricValue` schema (1-10, low/medium/high)? If not, what new type is needed?
3. **Effort Gate:** Is the data generation burden sized and budgeted?

### Decision Override Matrix (Post-Adversarial)

| # | paperdraw Feature | Identity Gate | Data Model Gate | Final Decision |
|---|---|---|---|---|
| 1 | **Live traffic simulation** (RPS, latency, availability) | FAILS — operational simulation, not trade-off education | FAILS — MetricValue has no RPS/latency units | **ADAPT:** Animate *score transitions* when scenarios change (educational). NOT live traffic flow. Particle density/speed = metric health, not RPS. |
| 2 | **9 templates** spanning AI/ML, FinTech, Streaming | PASSES — more examples = better trade-off education | PASSES — blueprints use existing MetricValue schema | **EXPAND:** Add 5 paperdraw-sourced blueprints. Ship after new components exist. |
| 3 | **70+ components** across 11 categories | PASSES — more components = richer trade-off comparisons | PASSES — same YAML schema per component | **EXPAND (scoped):** Add 8-10 priority components, not 20. Budget: 2-3 hrs each = 20-30 hrs. |
| 4 | **Warning badges** (STOP, FIX, DATA LOSS RISK) | PARTIAL — constraint violations (PASSES), simulation alerts (FAILS — operational) | PASSES — constraint evaluator already exists | **EXTEND:** Add constraint violation badges only. NOT runtime failure badges. |
| 5 | **Chaos engineering** (40+ scenarios) | PARTIAL — "what breaks" is educational. Live injection is operational. | FAILS — no mapping to 38 quality metrics defined | **ADAPT:** 6 failure scenario presets (not 40+). Same engine as demand (multiplicative modifiers). Must map each scenario to specific metrics. |
| 6 | **Cost tracking** ($/hr, $/mo) | PARTIAL — relative cost comparison (PASSES). Precise dollars (FAILS — abstract model) | FAILS — cost is not a MetricValue (dollars ≠ 1-10 scale) | **ADAPT:** Cost as directional band (1-10 scale, "cost: high") in existing MetricValue. NOT precise $/hr. New metric category "Cost & Resource" added to 38→39+ metrics. |
| 7 | **Engineering report** (.md export) | PASSES — summarizes trade-off assessment | PASSES — reads existing pipeline output | **ADD:** Story within Epic 10. Export current architecture assessment as .md. |
| 8 | **Flow particle animation** | PARTIAL — decorative unless mapped to data | N/A — visual layer | **ADAPT:** Particle density = connection health (heatmap score). Speed = data flow direction. Toggle-able for performance. Ship as story within Epic 9, not standalone epic. |
| 9 | **Component grouping** | DEFERRED | N/A | Not necessary now. |
| 10 | **Export video** | OUT OF SCOPE | N/A | Not relevant. |
| 11 | **Deployment region per component** | COVERED by geographic-spread demand variable | N/A | No override. |
| 12 | **Connections: inspectable** | CONFIRMED unique differentiator | N/A | Double down. Both competitors have dumb arrows. |

### Critical Adaptation: Cost as Directional Metric, NOT Dollars

paperdraw shows "$56.5K/mo" — precise dollar amount. Archie CANNOT do this because:
- Archie's components are abstract archetypes (e.g., "Redis Cache"), not cloud instances
- Cloud pricing changes monthly — AI-generated $/hr data has a shelf life
- Precise dollars contradict Archie's identity ("directional, not exact")

**Archie's approach:** Add "cost-efficiency" as a new quality metric (1-10 scale):
- 1-3 = expensive (managed services, multi-region, heavy compute)
- 4-6 = moderate
- 7-10 = cost-efficient (open source, single-instance, minimal infra)

This metric participates in existing weighted scoring, heatmap, and demand scenarios. No new data type needed.

### Critical Adaptation: Chaos as Failure Scenario Presets, NOT Injection

paperdraw injects failures during live simulation (Network Partition → availability drops to 0%). Archie CANNOT do this because:
- Archie has no operational availability metric — it has directional quality attributes
- 40+ chaos scenarios × 30 components = 1,200+ data points (unsized, unrealistic)

**Archie's approach:** 6 failure scenario presets using the SAME engine as demand simulation:

| Failure Preset | Metrics Affected | Modifier |
|---|---|---|
| Single Node Failure | availability, fault-tolerance, operational-complexity | 0.5× to 0.7× |
| Network Partition | latency, data-consistency, horizontal-scalability | 0.4× to 0.6× |
| Database Failure | data-durability, availability, disaster-recovery | 0.3× to 0.5× |
| Traffic Spike (10×) | throughput, latency, auto-scaling | 0.5× to 0.8× |
| Region Outage | disaster-recovery, geographic-distribution, availability | 0.2× to 0.4× |
| Data Corruption | data-durability, data-consistency, backup-recovery | 0.3× to 0.5× |

These use the same multiplicative modifier engine as demand scenarios (Epic 9). Same dropdown UI pattern. Same data format. Minimal new code.

### Component Expansion — Scoped to 8-10 Priority Components

**Why 8-10, not 20:** Each component requires ~1,720 data points across the full profile (38 metrics + variants + code snippets + explanations + connection properties + demand response). At 2-3 hours per component, 20 components = 40-60 hours. 8-10 = 16-30 hours. More realistic for solo dev.

| Priority | Component | Domain | Why |
|----------|-----------|--------|-----|
| 1 | **LLM Gateway** | AI & Agents | Hottest architecture domain |
| 2 | **Vector DB** | Storage | Core to AI architectures |
| 3 | **Serverless** | Compute | Fundamentally different trade-off profile |
| 4 | **ETL Pipeline** | Data Engineering | Data architecture is essential |
| 5 | **Payment Gateway** | FinTech | High-value domain |
| 6 | **Graph DB** | Storage | Unique relationship trade-offs |
| 7 | **Data Lake** | Storage | Contrasts with Data Warehouse |
| 8 | **SIEM** | Security | Security architecture awareness |
| 9 | Tool Registry | AI & Agents | Pairs with LLM Gateway |
| 10 | Data Warehouse | Storage | Pairs with Data Lake |

Components 9-10 are stretch goals. Components 1-8 are the target.

### Expanded Blueprint Library (After Component Expansion)

| # | Blueprint | Components Needed | Source | Ships With |
|---|-----------|------------------|--------|-----------|
| 1-2 | WhatsApp + Telegram | existing | Existing | Shipped |
| 3-10 | 8 Simulador blueprints | existing | Simulador | Epic 10 |
| 11 | **Social Media Feed** | Graph DB (new) | paperdraw | Epic 11 |
| 12 | **AI Agent Orchestration** | LLM Gateway, Vector DB, Tool Registry (new) | paperdraw | Epic 11 |
| 13 | **Data Analytics Pipeline** | ETL Pipeline, Data Lake, Data Warehouse (new) | paperdraw | Epic 11 |
| 14 | **Video Streaming** | existing (CDN, Nginx, Redis) + Object Store concept | paperdraw | Epic 11 |
| 15 | **FinTech Payment** | Payment Gateway (new) | paperdraw | Epic 11 |

**Total: 15 blueprints.** 10 ship with existing components (Epic 10). 5 ship with Epic 11 (after new components exist).

### Corrected Engine Pipeline

```
Base metrics (component library YAML)
    ↓
Config variant overrides (Level 1+2, existing since Epic 1)
    ↓
Demand modifiers (Level 3, Epic 9)              ← multiplicative
    ↓
Failure scenario modifiers (Level 4, Epic 9)    ← same engine, same format as demand
    ↓
Weighted scoring (Level 5, existing since Epic 5)
    ↓
    ├──→ Heatmap + Dashboard + Pathway guidance (existing)
    ├──→ Cost-efficiency scoring (parallel — same weighted pipeline, "cost" is a metric)
    ├──→ Constraint evaluator → Warning badges on canvas (Epic 10)
    ├──→ Connection health → Particle animation on edges (Epic 9)
    └──→ Architecture report export (Epic 10)
```

**Key corrections from adversarial review:**
- Cost is a METRIC in weighted scoring, not a separate pipeline step
- Failure scenarios use same engine as demand modifiers (not a separate chaos engine)
- Animation, badges, and report are OUTPUT CONSUMERS, not pipeline steps
- All output layers read from the same weighted scoring result

---

## 15. Revised Epic Structure (Post-Adversarial)

### Merges Applied (7 epics → 3 epics)

**Why merge:** 7 sequential epics for a solo developer = 12-18 months. Merging related features into existing epics reduces to 3 epics shipping in 6-10 weeks.

| Original Proposal | Adversarial Verdict | Merged Into |
|---|---|---|
| Epic 9: Demand Simulation (5 stories) | KEEP + EXTEND | **Epic 9** (add animation + failure scenarios) |
| Epic 10: Canvas & Content (3 stories) | KEEP + EXTEND | **Epic 10** (add badges + report export) |
| Epic 11: Component Catalog Expansion | KEEP (scoped to 8-10) | **Epic 11** (+ 5 paperdraw blueprints) |
| Epic 12: Live Simulation & Animation | MERGE — animation is UX on demand engine | → Story 9-6 in Epic 9 |
| Epic 13: Chaos & Failure Scenarios | MERGE — same engine as demand, just different presets | → Story 9-7 in Epic 9 |
| Epic 14: Cost Estimation | MERGE — cost is a new metric, not a new engine | → Story 11-X in Epic 11 (add cost-efficiency metric to all components) |
| Epic 15: Architecture Report Export | MERGE — 1-2 stories, not an epic | → Story 10-4 in Epic 10 |

### Epic 9: Demand Simulation + Animation + Failure Scenarios (EXTENDED)

| Story | Description | Source |
|-------|-------------|--------|
| 9-1 | Demand Schema & Scenario Preset Definitions | Simulador (existing) |
| 9-2 | Component Demand Response Data | Simulador (existing) |
| 9-3 | Demand Simulation Engine | Simulador (existing) |
| 9-4 | Scenario Selector UI & Store Integration | Simulador (existing) |
| 9-5 | E2E — Demand Simulation Flow | Simulador (existing) |
| **9-6** | **Score Transition Animation** — particle animation on connections (density = health score), animated metric bar transitions on scenario change. Toggle-able. | **paperdraw** |
| **9-7** | **Failure Scenario Presets** — 6 failure scenarios using demand engine (same multiplicative modifiers). Dropdown alongside demand scenarios. | **paperdraw** |

### Epic 10: Canvas & Content + Badges + Report (EXTENDED)

| Story | Description | Source |
|-------|-------------|--------|
| 10-1 | Inline Canvas Metrics + **Constraint Warning Badges** | Simulador + **paperdraw** |
| 10-2 | Blueprint Library Expansion (8 Simulador blueprints, existing components) | Simulador (existing) |
| 10-3 | E2E — Canvas Metrics & Blueprint Loading | Simulador (existing) |
| **10-4** | **Architecture Report Export** — downloadable .md: executive summary, component scores, constraint violations, scenario comparison, top recommendations | **paperdraw** |

### Epic 11: Component Catalog Expansion + Paperdraw Blueprints (NEW)

| Story | Description | Effort Estimate |
|-------|-------------|----------------|
| 11-1 | Component Data: LLM Gateway, Vector DB, Serverless, ETL Pipeline (4 components) | ~8-12 hrs AI gen + validation |
| 11-2 | Component Data: Payment Gateway, Graph DB, Data Lake, SIEM (4 components) | ~8-12 hrs AI gen + validation |
| 11-3 | Cost-Efficiency Metric — add to ALL components (existing + new) as metric #39 | ~4-6 hrs |
| 11-4 | Demand + Failure Response Data for 8 new components | ~6-8 hrs |
| 11-5 | 5 paperdraw Blueprint Architectures (Social Media, AI Agent, Data Analytics, Video, FinTech) | ~4-6 hrs |
| 11-6 | E2E — New Components + Blueprints | ~4-6 hrs |

**Total estimate for Epic 11:** ~34-50 hours

### Revised Build Order

```
Epic 9 (Demand + Animation + Failure)     ← ships first, foundation
    ↓
Epic 10 (Canvas + Blueprints + Report)    ← ships second
    ↓
Epic 11 (Components + Cost Metric + paperdraw Blueprints)  ← ships third
```

**Parallelization:** Epic 11 Story 11-1 and 11-2 (AI data generation) can begin during Epic 9 development since they only produce YAML data files with no code dependencies.

---

## 16. Updated Overridable Decisions

| Decision | Current Choice | Override Would Require | Files Affected |
|----------|---------------|----------------------|----------------|
| Cost as directional metric (1-10) | "cost-efficiency" in MetricValue | Switch to precise $/hr — requires new data type, cloud pricing API | MetricValue schema, component YAMLs, new CostEngine |
| 6 failure scenario presets | Specific set using demand engine | Add more scenarios (need metric mapping per scenario), or remove entirely | Failure preset YAMLs, scenario selector UI |
| 8-10 new components | Specific priority list above | Add/remove components — 2-3 hrs per component | Component YAML files, library constants |
| 5 paperdraw-sourced blueprints | Depend on Epic 11 components | Swap blueprints, change component mix | Blueprint YAML files |
| Animation = score visualization | Particle density = health, not RPS | Switch to operational animation (requires new data model) | Custom React Flow edges |
| Constraint badges only | No simulation failure badges | Add chaos-state badges (requires operational state model) | ArchieNode.tsx, badge components |
| Report as .md export | Architecture assessment snapshot | Could be PDF, interactive HTML, or live dashboard | Report generator, export logic |
| Chaos scenarios ≤6 | Minimum viable educational set | Expand to 10-20 (need more metric mappings) | Failure preset YAMLs |

---

## 17. How to Use This Document for Future Analysis

When analyzing another competitor:

1. **Start here:** Use Section 2 (A/B Analysis) as a template. Compare the new competitor against both Archie AND Simulador.
2. **Check Section 10 (Pipeline):** Any new feature must fit into this pipeline or extend it. If the new analysis suggests a feature that breaks the pipeline, it's a major decision.
3. **Check Section 16 (Overridable Decisions):** If the new analysis contradicts a decision here, you know exactly what to change and where.
4. **Check story status:** If stories are still `drafted`, overriding is cheap. If `done`, overriding means refactoring shipped code.
5. **Values check:** Any new feature must pass V1-V6 alignment. If a competitor feature conflicts with a value, document the tension — don't silently drop the value.
