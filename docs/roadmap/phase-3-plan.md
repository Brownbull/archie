# Archie — Phase 3 Plan

## Where We Are

Epics 1–11 are done. Phase 1 delivered the core architecture simulator (canvas, intelligence, import/export). Phase 2 added personalization (priority sliders, constraints, data context, pathway guidance, demand simulation, stacks, content expansion). Archie is a deep analysis tool with ~30 components, 15 blueprints, 7-category weighted scoring, demand/failure simulation, and YAML round-trip.

**What shipped in Phase 2:** Priority sliders, constraint guardrails, data context & fit scoring, stacks tab, pathway guidance, demand simulation, failure scenarios, inline canvas metrics, blueprint expansion, architecture report export, expanded content library (18 new components).

**Uncommitted on `dev`:** Bezier curve edges (cosmetic — step→bezier migration).

---

## Phase 3 — Overview

Phase 3 transforms Archie from a **sandbox analysis tool** into a **dual-mode platform**: sandbox mode (existing — explore and analyze) + challenge mode (new — learn through scored, time-limited architecture challenges).

This is informed by the [Coding Ducks feature extraction](coding-ducks-feature-extraction.md) — a reference app that reframes architecture design as timed, scored, traffic-driven challenges with typed ports, live simulation, budget caps, and star ratings.

### Design Principle: Dual Mode

| Mode | Entry point | Purpose | What's active |
|------|-------------|---------|---------------|
| **Sandbox** | Default — open canvas | Explore trade-offs, analyze architectures | All existing features + new port system, replicas, topology checker, concrete economics. No timer, no scoring rubric, no required components. |
| **Challenge** | Challenge selector | Learn through constrained design problems | Everything in sandbox + budget cap, timer, required components checklist, star rubric, traffic curve, scheduled failure events, hints, attempt history. |

The simulation engine works in both modes. In sandbox, the user triggers it manually ("run simulation"). In challenge mode, it runs automatically after the user clicks "Start."

### Dependency Chain

```
Epic 12: Typed Port System (schema v3 — foundation for everything)
  → Epic 13: Concrete Variant Economics (cost/throughput/latency numbers)
    → Epic 14: Replicas & Horizontal Scaling
      → Epic 15: Simulation Engine (time-stepped, builds on ports + economics + replicas)
        → Epic 16: Challenge Mode (game layer on top of simulation)
          → Epic 17: Smart Suggestions & History (polish + retention)

Epic 12 is the keystone. Every subsequent epic becomes easier once edges carry semantic type information.
```

---

## Feature Breakdown

### Epic 12: Typed Port System & Schema v3

**What changes:** Components gain typed, colored port dots on their perimeter. Each port has a semantic type (http, database, cache, stream, worker, storage) and direction (in/out). Connections are made between compatible port pairs — incompatible drops are silently rejected. The topology checker validates graph well-formedness in real time.

**Why it matters:** This is Archie's biggest UX gap. Users can't currently see what a component *needs* or *provides* at a glance. Typed ports make architecture grammar visible — "App Server needs a database, a cache, and a stream output" is communicated by the ports physically present on the node.

**Architecture impact:**
- New `Port` type: `{ id, type: PortType, direction: 'in'|'out', color: string, position: 'top'|'right'|'bottom'|'left', maxConnections?: number }`
- `PortType` enum: `http | database | cache | stream | worker | storage | search | monitoring | auth`
- `Component` schema gains `ports: Port[]` — replaces the flat `compatibility` record
- `ArchieEdge` gains `sourceHandleId` and `targetHandleId` (port-level references)
- `compatibilityChecker` → `portCompatibilityChecker` (port-pair lookup instead of category-pair)
- New `topologyChecker` engine: orphan nodes, missing required hops, unreachable components
- `ArchieNode` component renders colored `Handle` elements from port definitions
- YAML schema v3 with migration from v2 (new `ports` field, deprecated `compatibility` field)
- All 30+ components in Firestore need port definitions authored

**Key decisions needed:**
1. **Port taxonomy** — How many port types? The reference app uses ~5 (http, db, cache, stream, worker). We have 10 component categories — do ports map 1:1 to categories, or is it a smaller set?
2. **Strict vs. warn mode** — Do we keep WARN for sandbox mode (allow but warn) and enforce strictly only in challenge mode? Or go strict everywhere?
3. **Backward compatibility** — v2 YAML files have no port data. Import path: treat all connections as `http` type? Or reject and require re-export?

**Estimated stories:** 6-8 user stories + TD stories (~30-40 pts)

---

### Epic 13: Concrete Variant Economics

**What changes:** Every config variant gains concrete operational numbers: `monthlyCost` ($/mo), `maxRPS` (requests/sec), `baseLatencyMs` (milliseconds). The canvas shows cost per node. A budget HUD shows total architecture cost. The toolbox shows cost ranges per component.

**Why it matters:** Abstract metric scores (1-10) tell you "this is expensive" but not "this costs $165/mo at 3 replicas." Concrete numbers make cost a first-class constraint and are required for realistic simulation.

**Architecture impact:**
- `ConfigVariant` schema gains: `monthlyCost: number`, `maxRPS: number`, `baseLatencyMs: number`
- New derived computation: `totalCost = Σ(variant.monthlyCost × node.replicaCount)` across architectureStore
- Budget HUD component (progress bar, color-coded)
- Inline cost display on canvas nodes
- Toolbox cards show cost range across variants
- All 30+ components need concrete numbers authored (AI-generated, validated)
- Existing abstract metrics (1-10) coexist — they serve different purposes (abstract for trade-off exploration, concrete for simulation)

**Key decision:**
- **Cost data source** — Hand-authored from real cloud pricing? AI-generated approximations? Range with disclaimers? Recommendation: AI-generated with "approximate — not real pricing" disclaimer, since exact pricing changes constantly.

**Estimated stories:** 3-4 user stories (~12-15 pts)

---

### Epic 14: Replicas & Horizontal Scaling

**What changes:** Scalable components gain a replica count control (− N× +). Cost and capacity multiply. Special rules enforce realistic constraints: SQL replicas are read-only, stateless components with replicas > 1 need a load balancer upstream, load balancers show backend count.

**Why it matters:** "How many instances do I need?" is a core architecture question. Without replicas, Archie treats every component as a singleton, which limits both analysis accuracy and simulation realism.

**Architecture impact:**
- `ArchieNode` data gains `replicaCount: number` (default: 1)
- New scaling rules per category: `{ scalable: boolean, replicaType: 'full'|'read-only'|'none', requiresUpstreamLB: boolean }`
- Cost: `variant.monthlyCost × replicaCount`
- Capacity: `variant.maxRPS × replicaFactor` (factor depends on category — stateless = linear, DB reads = linear, DB writes = 1)
- Inline badges on nodes: "3×", "reads only", "needs LB", "N backends"
- Topology checker extended: replica > 1 without LB upstream → warning
- YAML export/import gains `replicas` field per node

**Estimated stories:** 3-4 user stories (~15-18 pts)

---

### Epic 15: Simulation Engine

**What changes:** A time-stepped simulation engine drives traffic through the architecture graph over 60-120 simulated seconds. Each node displays live telemetry (RPS, latency, capacity %). Edges animate when carrying traffic. A timeline chart plots successful vs. failed requests. Playback controls allow replay at variable speed. Components visually degrade (color shift, capacity bar) when overwhelmed and "collapse" beyond their capacity.

**Why it matters:** This is the single highest-impact feature. Instead of looking at scores that say "this might be a bottleneck," users *watch* the bottleneck form in real time. It makes Archie's "architecture trade-offs visible" promise literal and visceral.

**Architecture impact:**
- New `simulationEngine`: time-stepped loop (50-100 ticks), reads traffic curve, routes through port graph, applies capacity models
- New `simulationStore`: tick state, per-node metrics history, replay buffer, playback state
- Per-component `capacityModel`: `{ maxRPS (from variant × replicas), latencyFunction(load%), failureMode: 'shed'|'queue'|'crash', recoveryTime }` 
- Traffic routing follows the port graph (typed edges determine flow path)
- Per-node live telemetry overlay: RPS, latency ms, capacity bar (green→yellow→red)
- Stats panel: uptime %, avg latency, p99 latency, current/target RPS, cost vs. budget
- Block status list: per-component health dots
- Bottom timeline chart (Recharts): successful vs. failed requests over time
- Playback controls: Play | Pause | Replay | 1x/2x/5x/10x | Skip to end
- Traffic curve: `trafficCurve: {t: number, rps: number}[]` — time-varying demand (replaces constant-multiplier scenario presets)
- Existing `demandEngine` refactored to consume time-varying curves instead of constant levels
- Works in both sandbox (manual trigger, user-defined curve or preset) and challenge (auto-start, challenge-defined curve) modes

**Key decisions:**
1. **Tick granularity** — 50 ticks over 90s = ~1.8s per tick. Enough for visual smoothness?
2. **Routing algorithm** — Traffic enters at "Users" source node, follows port graph via BFS. What happens at branches (load balancer → multiple app servers)?
3. **Failure cascading** — When a node collapses, do upstream nodes queue, shed, or also cascade? Per-component or global?
4. **Charting library** — Recharts (already in React ecosystem) vs. lightweight alternative?

**Estimated stories:** 8-10 user stories (~40-50 pts) — this is the largest epic

---

### Epic 16: Challenge Mode

**What changes:** A challenge selector presents 10 progressive architecture design challenges (beginner → advanced). Each challenge has a brief, budget cap, duration, traffic curve, required components, scheduled failure events, hints, and a star rubric. Users build the architecture, hit "Start," watch the simulation, and receive a star rating based on uptime, latency, budget, and topology.

**Why it matters:** This converts Archie from a sandbox into a learning curriculum. Users have a reason to return, and constrained design problems are more educational than open exploration because they force specific trade-off decisions.

**Architecture impact:**
- New `Challenge` schema: `{ id, title, brief, difficulty: 'beginner'|'intermediate'|'advanced', budgetCap, durationSeconds, trafficCurve, requiredComponents: string[], targetMetrics: {uptimePercent, p99LatencyMs}, scheduledEvents: {t, type, target}[], hints: string[], allowedCategories?: string[] }`
- New `challengeStore`: active challenge, attempt state, completion status
- Challenge selector UI: level cards with difficulty badge, stars earned, best scores
- Required components checklist panel (ticks as nodes are placed)
- Budget cap enforcement (progress bar turns red over budget)
- Timer display (countdown during simulation)
- Sidebar component filtering (dim unavailable categories per challenge)
- Scheduled failure events: simulation engine consumes `{t, type: 'component_failure'|'az_outage'|'latency_spike', target}` timeline
- Hints panel (collapsible, numbered, challenge-specific)
- Star rubric: `evaluateAttempt(simResult, challenge) → {stars: 0-3, breakdown}` — pass thresholds → 1 star, under budget → +1, clean topology → +1
- Results modal: stars, uptime %, latency, budget %, requests chart, topology issues
- Challenge content: 10 levels authored (AI-generated, hand-tuned)

**Challenge catalog (draft):**

| # | Level | Difficulty | Budget | Duration | Key Concept |
|---|-------|-----------|--------|----------|-------------|
| 1 | Static Site with CDN | Beginner | $50 | 60s | CDN caching, DNS |
| 2 | Simple Web Application | Beginner | $150 | 60s | App server + database basics |
| 3 | REST API with Caching | Beginner | $300 | 90s | Cache layer, read optimization |
| 4 | E-Commerce Checkout | Intermediate | $500 | 90s | Transactions, payment flow |
| 5 | Async Job Processing | Intermediate | $400 | 90s | Workers, message queues |
| 6 | Search Platform | Intermediate | $600 | 90s | Search engines, indexing |
| 7 | Realtime Chat | Advanced | $700 | 120s | WebSockets, presence, fan-out |
| 8 | IoT Telemetry Ingestion | Advanced | $800 | 120s | Stream processing, time-series |
| 9 | Social Media Feed | Advanced | $900 | 120s | Fan-out, caching, ranking |
| 10 | Global API Gateway | Advanced | $1080 | 90s | Multi-region, AZ failures, CDN |

**Estimated stories:** 6-8 user stories (~30-35 pts)

---

### Epic 17: Smart Suggestions & History

**What changes:** Post-simulation, an AI-generated "Try this next" card suggests a specific optimization with pre-computed deltas (cost savings, latency impact, uptime change). Attempt history persists to Firestore so users can track progress across sessions. A personal submissions log shows past attempts with scores.

**Why it matters:** The "try this next" nudge is the highest value-per-effort feature once simulation exists. History + submissions create a retention loop — users return to beat their own scores.

**Architecture impact:**
- Shadow simulation: for each candidate change (drop replica, swap variant, add component), run the simulation engine and compute deltas
- "Try this next" card: shows the best net-positive suggestion with `{change description, uptimeDelta, latencyDelta, costDelta}`
- `attemptsStore` + Firestore `attempts` collection: `{ userId, challengeId, timestamp, stars, uptime, latency, budget, requestsTotal, requestsFailed }`
- History tab in sidebar: past attempts with status icon, stars, key metrics
- Personal submissions table: sortable by date, stars, challenge
- Brand logos on variants (optional polish): `brand: string`, `logoUrl: string` on ConfigVariant

**Key decision:**
- **Firestore for attempts** — This is the first time Archie uses Firestore for user-generated state (not just library data). Requires Firebase Auth to be meaningful. Currently auth exists but is optional. Should challenge mode require auth?

**Estimated stories:** 4-5 user stories (~18-22 pts)

---

## Execution Order

```
┌─────────────────────────────────────────────────────┐
│ PREREQUISITE — Close out Phase 2                    │
│  1. Mark Epic 11 done (all stories complete)        │
│  2. Commit bezier edge change                       │
│  3. Deploy current state to production              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ ARCHITECT SESSION                                   │
│  Resolve: port taxonomy, strict vs. warn,           │
│  schema v3 migration strategy, tick granularity,    │
│  routing algorithm, Firestore auth requirement      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 12: Typed Port System (~6-8 stories)           │
│  KEYSTONE — unlocks everything downstream           │
│  Schema v3, port rendering, topology checker        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 13: Concrete Variant Economics (~3-4 stories)  │
│  Cost/throughput/latency numbers, budget HUD        │
│  Can overlap with Epic 12 tail (independent data)   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 14: Replicas & Horizontal Scaling (~3-4 stories)│
│  Replica controls, scaling rules, LB constraint     │
│  Depends on ports (topology rules) + economics      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 15: Simulation Engine (~8-10 stories)          │
│  LARGEST EPIC — time-stepped engine, live telemetry │
│  Timeline chart, playback controls, traffic curves  │
│  Works in sandbox mode (manual trigger)             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 16: Challenge Mode (~6-8 stories)              │
│  Level catalog, star rubric, results modal          │
│  Scheduled failures, hints, required components     │
│  10 challenge levels authored                       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 17: Smart Suggestions & History (~4-5 stories) │
│  Shadow simulation, "try this next" card            │
│  Firestore attempt history, personal leaderboard    │
└─────────────────────────────────────────────────────┘
```

### Parallelization opportunities

- Epic 13 (economics) can start during Epic 12 (ports) — they touch different parts of the schema
- Challenge content authoring (10 levels) can happen in parallel with Epic 15 (simulation engine)
- Brand logos (Epic 17) can be done anytime

---

## Sizing Estimate

| Epic | Stories (est.) | Points (est.) | Calendar (solo dev) |
|------|---------------|---------------|---------------------|
| 12: Typed Ports | 6-8 | 30-40 | 2-3 weeks |
| 13: Economics | 3-4 | 12-15 | 1 week |
| 14: Replicas | 3-4 | 15-18 | 1-1.5 weeks |
| 15: Simulation | 8-10 | 40-50 | 3-4 weeks |
| 16: Challenges | 6-8 | 30-35 | 2-3 weeks |
| 17: Suggestions | 4-5 | 18-22 | 1.5-2 weeks |
| **Total** | **30-39** | **145-180** | **~11-16 weeks** |

Phase 2 was ~50 stories across Epics 5-11. Phase 3 is comparable in scope.

---

## Decision Log

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | Dual mode (sandbox + challenge) | **Decided** | Sandbox keeps all existing features, challenge adds constraints + scoring |
| 2 | Port type taxonomy | **Decided** | 7 types: http, database, cache, stream, monitor, auth, cdn. Cross-cuts the 10 categories. See ADR below. |
| 3 | Strict vs. warn on port connections | **Decided** | Hybrid — warn in sandbox, block in challenge mode. Compatibility checker stays pure; store decides enforcement. |
| 4 | Schema v3 migration for v2 YAML files | **Decided** | Graceful fallback — auto-map by port-type overlap, `legacy` edge type for ambiguous. Non-breaking. |
| 5 | Handle positioning | **Decided** | Inputs left, outputs right, evenly distributed. Fixed sort: http > database > cache > stream > monitor > auth > cdn. |
| 6 | Port capacity / connection limits | **Decided** | No limits. Simulation engine handles realism through throughput modeling. Revisit if challenge mode needs it. |
| 7 | Tick granularity for simulation | **Open** | 50-100 ticks over 60-120s |
| 8 | Traffic routing at branches | **Open** | How does traffic split at load balancers? |
| 9 | Failure cascade model | **Open** | Per-component failure modes vs. global cascade rules |
| 10 | Charting library for timeline | **Open** | Recharts vs. lightweight alternative |
| 11 | Cost data source | **Open** | AI-approximated vs. real cloud pricing |
| 12 | Auth requirement for challenge mode | **Open** | Needed for attempt persistence; optional for sandbox |
| 13 | Challenge content authoring | **Open** | AI-generated + hand-tuned, or fully manual? |

---

## ADR: Typed Port System (2026-05-27)

### Port Type Taxonomy

| Type | Color | Hex | Semantic |
|------|-------|-----|----------|
| `http` | Royal Blue | `#2563EB` | Request/response traffic (HTTP, gRPC, REST) |
| `database` | Deep Violet | `#7C3AED` | Persistent data read/write (SQL, NoSQL, graph) |
| `cache` | Ruby | `#DC2626` | Fast ephemeral data lookup (session, memoization) |
| `stream` | Deep Amber | `#D97706` | Async event/message flow (pub-sub, streaming, queue) |
| `monitor` | Emerald | `#059669` | Telemetry, metrics, logs, security events |
| `auth` | Dark Gold | `#CA8A04` | Authentication/authorization token flow |
| `cdn` | Deep Teal | `#0891B2` | Static asset / edge cache delivery |

### Compatibility Rule

`source.portType === target.portType && source.direction === 'out' && target.direction === 'in'` — O(1) lookup, no category-pair matrix.

### Component Port Mappings

| Component | Ports |
|-----------|-------|
| Node.js + Express | `http-in`, `http-out`, `database-out`, `cache-out`, `stream-out`, `monitor-out`, `auth-in` |
| Nginx | `http-in`, `http-out`, `cache-out`, `cdn-in` |
| Serverless | `http-in`, `stream-in`, `database-out`, `cache-out`, `stream-out`, `monitor-out`, `auth-in` |
| LLM Gateway | `http-in`, `http-out`, `database-out`, `cache-out`, `monitor-out`, `auth-in` |
| Payment Gateway | `http-in`, `http-out`, `database-out`, `monitor-out`, `auth-in` |
| ETL Pipeline | `stream-in`, `database-in`, `database-out`, `stream-out`, `monitor-out` |
| PostgreSQL | `database-in`, `monitor-out` |
| Redis (storage) | `database-in`, `monitor-out` |
| Vector DB | `database-in`, `monitor-out` |
| Graph DB | `database-in`, `monitor-out` |
| Data Lake | `database-in`, `cdn-out`, `monitor-out` |
| Redis Cache | `cache-in`, `monitor-out` |
| Kafka | `stream-in`, `stream-out`, `monitor-out` |
| RabbitMQ | `stream-in`, `stream-out`, `monitor-out` |
| Cloudflare CDN | `http-in`, `cdn-out`, `monitor-out` |
| WebSocket Server | `http-in`, `stream-in`, `http-out`, `monitor-out`, `auth-in` |
| Prometheus | `monitor-in` |
| SIEM | `monitor-in` |

### Schema Types

```typescript
export const PORT_TYPES = {
  http:     { label: "HTTP",     color: "#2563EB" },
  database: { label: "Database", color: "#7C3AED" },
  cache:    { label: "Cache",    color: "#DC2626" },
  stream:   { label: "Stream",   color: "#D97706" },
  monitor:  { label: "Monitor",  color: "#059669" },
  auth:     { label: "Auth",     color: "#CA8A04" },
  cdn:      { label: "CDN",      color: "#0891B2" },
} as const

export type PortType = keyof typeof PORT_TYPES

export interface PortDefinition {
  id: string           // e.g., "http-in", "database-out"
  type: PortType
  direction: "in" | "out"
}
```

### Handle Positioning

- Input ports (`in`): distributed along **left** edge, evenly spaced vertically
- Output ports (`out`): distributed along **right** edge, evenly spaced vertically
- Sort order within each side: `http > database > cache > stream > monitor > auth > cdn`
- Port dot: 8px diameter, filled with port type color, 2px border

### v2 Migration Strategy

1. Detect v2 (no `schemaVersion` field) vs v3 (has `schemaVersion: 3`)
2. v2 nodes: derive ports from component library definition
3. v2 edges: match source output port types against target input port types. Single match → assign. Multiple → use priority order. Zero → assign `legacy` type (grey dashed edge)
4. Toast: "{N} connections auto-mapped, {M} need manual reassignment"
5. `legacy` edges render distinctly and can be right-click reassigned

---

## Phase 4 (Future — not planned in detail)

Features deferred beyond Phase 3:

- **Community sharing** — post, browse, fork architectures (needs backend)
- **Community component library** — user-contributed components with voting
- **Player profile & gap analysis** — team size, skills, budget → personalized overlay
- **AI "describe your app"** → generated starting blueprint
- **A/B comparison mode** — side-by-side architecture comparison
- **Embeddable architectures** — `<archie-embed>` widget
- **Global leaderboard** — cross-user competition (privacy considerations)
- **WCAG accessibility pass**
