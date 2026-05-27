# Coding Ducks System Design — Feature Extraction for Archie

> Source: Manual exploration of Coding Ducks reference app via Claude Code browser session (2026-05-27).
> Purpose: Feature gap analysis to inform Archie Phase 3 planning.

## Overall framing

Coding Ducks reframes architecture design as a **timed, scored, traffic-driven challenge** rather than an open-ended exploration. Where Archie says "explore tradeoffs", Coding Ducks says "pass the level." This single framing decision cascades into the entire feature set: typed ports, live simulation, budget caps, star ratings, hints, leaderboard, and AI-suggested next experiments. Almost every gap on Archie's "DOESN'T Have Yet" list is filled in this app.

---

## Feature-by-feature breakdown

### 1. Typed, colored connection ports — NEW (highest priority)

Each component node renders multiple distinct port dots on its perimeter, each in a different color encoding a connection semantic. On the App Server at least five visually distinct ports:

- **Blue** — HTTP/network ingress (used by Users→DNS→CDN→Firewall→Rate Limiter→API Gateway→Load Balancer→App Server)
- **Purple** — relational database egress (App Server→SQL Database)
- **Pink/Magenta** — cache egress (App Server→Cache/Redis)
- **Orange** — streaming/event egress (App Server→Stream Processor/Kafka)
- **Green** — appears to be a secondary worker/storage port (visible on Object Storage and App Server's bottom)

**How it works:** You drag from a colored port outward; if you release on a compatible port of another node, the edge is created and the topology checker re-evaluates instantly. Incompatible drops simply don't create an edge (silent rejection). Ports are intrinsic to the component — they exist whether or not anything is connected.

**Why it's valuable:** It makes architecture grammar visible. A user knows at a glance that "App Server needs a database, a cache, and a stream output" because those ports are physically present. It replaces Archie's compatibility "warn" mode with directed, visually-typed connection rules.

**Visual details:** Ports are ~6-8px solid dots positioned on the node border. Idle connection lines are thin grey. Active (during simulation) lines turn solid blue and animate. Each edge gets an "✕" delete handle on hover positioned at the midpoint or endpoints.

**Archie implications:**
- `ArchieEdge` needs `sourceHandleId` and `targetHandleId` (port refs), not just node refs
- `Component` schema needs a new `ports: Port[]` array — `{ id, type: 'http'|'db'|'cache'|'stream'|'worker'|'storage', direction: 'in'|'out', color, position }`
- `compatibilityChecker` becomes a port-pair lookup instead of category-pair lookup
- React Flow already supports typed handles via `Handle` component with `id` and `type` — this is mostly a data-model + UI change, not a framework swap

---

### 2. Live traffic simulation with per-node telemetry — PARTIAL → big upgrade

Archie has scenario presets and animated flow particles, but Coding Ducks runs a **real-time simulated clock** (t=0s → t=90s) where:

- Each node displays three live metrics inline on the card: **RPS, latency (ms), capacity utilization %**
- A small green-to-red **capacity bar** at the bottom of each node fills as load grows
- Edges become **solid blue with flow animation** when carrying traffic
- A right-side **STATS panel** updates every tick with global Uptime %, Avg Latency, p99 Latency, Current RPS / Target RPS, Monthly Cost vs Budget
- A **Block Status** list shows per-component live RPS with a colored dot (green=healthy, orange=idle, red=failing)
- A **bottom timeline chart** plots Successful vs Failed requests across time with a scrubbable cursor and hover tooltip

**Playback controls:** Live | Replay | 1x | 2x | 5x | 10x | End.

**Archie implications:**
- Need a **simulation engine** with a time-stepped loop (probably 50-100 ticks across 60-120 simulated seconds)
- Each component needs a `capacityModel`: max RPS, latency function under load, failure mode beyond capacity
- A new `simulationStore` to hold tick state, history, and replay buffer
- Timeline chart component (Recharts or similar)
- This is the **highest-effort, highest-impact** feature on the list

---

### 3. Traffic Pattern / demand waveform — PARTIAL

The right panel shows a permanent miniature graph titled "Traffic Pattern" with the peak labeled ("Peak: 55,000 RPS") over the level's duration ("90s"). This isn't a generic preset — it's a **specific traffic shape per level**.

**vs Archie:** Archie has scenario presets (steady, spike, etc.) but they're applied as a constant multiplier, not as a time-varying curve.

**Archie implications:**
- `Scenario` schema gains `trafficCurve: {t: number, rps: number}[]` or a parametric definition
- `demandEngine` reads the curve at each simulation tick

---

### 4. Challenges / Objectives system — NEW

A full **10-level System Design catalog** with progressive difficulty (beginner → intermediate → advanced):

- **Title + one-paragraph objective**
- **Difficulty badge** (beginner/intermediate/advanced, colored)
- **Budget cap** ("$1080/mo")
- **Duration** ("90s")
- **Required components checklist** (tick green as you place each required block)
- **Stars achieved** (1-3, displayed on the levels list)
- **Best Uptime & Best Latency** scores carried across attempts

Levels: Static Site with CDN, Simple Web Application, REST API with Caching, E-Commerce Checkout, Async Job Processing, Search Platform, Realtime Chat, IoT Telemetry Ingestion, Social Media Feed, Global API Gateway.

**Archie implications:**
- New `Challenge` schema: `{ id, title, brief, difficulty, budgetCap, duration, trafficCurve, requiredComponents, targetMetrics, scenarios }`
- New store: `challengesStore` and `attemptsStore`
- Required-components panel needs to listen to the architectureStore

---

### 5. Budget cap with live consumption — NEW

Top-right shows "Budget: $533 / $1080" with a colored progress bar. Every component shows a **cost range** ("$25–$55"). Canvas cards show **actual current cost** ("$165/mo  3× ($55 ea)").

**vs Archie:** Cost Efficiency is one of 7 metric categories but it's abstracted to a 1-10 score.

**Archie implications:**
- Each `ConfigVariant` gains a `monthlyCost: number` field
- Cost computed live as `Σ (variant.cost × replicaCount)` across all nodes
- Budget HUD component

---

### 6. Star rating + scoring rubric — NEW

Post-simulation results modal shows:
- ✅ "Level Passed!" with **1-3 gold stars** (or red ❌ "Failed")
- **Uptime %**, **Avg Latency**, **p99 Latency** (targets shown)
- **Budget Used %**
- **Requests** total
- **Topology issues** block — explicitly costs a star

**Archie implications:**
- Extend `tierEvaluator` with `evaluateAttempt(simulationResult, challenge) → {stars, breakdown}`
- Results modal is mostly UI work

---

### 7. AI-suggested next experiment — NEW (very high value-per-effort)

The pass modal shows a **"💡 Try this next"** card with a concrete suggestion:
> **Drop 1 replica from Stream Processor** — Only peaked at 18% — has headroom to shrink.
> Uptime +0.0%  Latency +1ms  Cost **$-60/mo**

It's pre-computed what would happen if you applied that change.

**vs Archie:** `recommendationEngine` and `pathwayEngine` exist but don't show simulated deltas.

**Archie implications:**
- Wrap `recommendationEngine` with a "shadow simulation" pass
- Surface only changes that are net-positive on at least one axis

---

### 8. Contextual hints panel — PARTIAL

"💡 Hints" button opens challenge-specific numbered hints. Hint #7 reveals **scripted failure events inside the simulation**.

**Archie implications:**
- Challenges need `hints: string[]` and `scheduledEvents: {t, type, target}[]`
- Simulation engine consumes the event timeline

---

### 9. Component variants with cost+throughput+latency — PARTIAL

Variants encode three concrete numbers: **cost, throughput capacity, base latency**:
- Node.js — $35 • 4k RPS • 10ms
- Go — $55 • 8k RPS • 5ms
- Java/Spring — $40 • 5k RPS • 14ms
- Python/Django — $25 • 2k RPS • 18ms

**vs Archie:** Variants encode abstract metric deltas.

**Archie implications:**
- Add concrete fields to `ConfigVariant`: `cost`, `maxRPS`, `baseLatencyMs`
- These could coexist with existing abstract metrics

---

### 10. Replicas with horizontal scaling math — NEW

Every scalable component has a `Replicas: − 3× +` control. Special rules:
- **SQL Database** replicas: "reads only" badge
- **Load Balancer**: "3 backends" badge
- **App Server** with replicas > 1 but no LB: "needs LB" warning

**Archie implications:**
- `ArchieNode` gains `replicaCount: number`
- Replica scaling rules per category
- Constraint: replicas > 1 on stateless component requires LB upstream
- Cost = `variant.cost × replicaCount`

---

### 11. Topology checker / constraint badges — PARTIAL

Live warning panel "⚠️ Topology" with messages like "App Server is placed but not connected to traffic." Small inline badges on nodes.

**vs Archie:** Constraint guardrails exist but don't check graph topology.

**Archie implications:**
- Add `topologyChecker` engine with rules: orphan node, missing required hop, replica without LB, etc.

---

### 12. History / attempts log — NEW

"History" tab shows every prior simulation attempt with status, uptime %, latency, timestamp, stars.

**Archie implications:**
- `attempts` Firestore collection keyed by user+challenge
- Requires accounts but pays off in retention

---

### 13. Recent submissions / leaderboard — NEW

System Design index page has "Recent Submissions" table.

**Archie implications:** Same backing collection as #12.

---

### 14. Sidebar component-availability hinting — NEW (subtle but smart)

Some sidebar items **dimmed/disabled** for certain challenges. After placing a component, that sidebar entry also dims.

**Archie implications:**
- `Challenge` gains `allowedCategories: string[]` (optional whitelist)
- Sidebar reads this and applies `disabled` style

---

### 15. Variants with brand logos — Cosmetic but functional

Variants display real product names with logos (Cloudflare, AWS WAF, PostgreSQL, Redis, Go, Node.js).

**Archie implications:** Add `brand: string` and `logo: string` to variants. Low effort.

---

### 16. Things Archie already does that Coding Ducks doesn't

- Rich **connection inspector** (Coding Ducks edges are dumb lines with only delete)
- **Heatmap overlay** with color-graded node health
- **Scoring dashboard** with 7 weighted categories
- **Priority sliders** for personalized scoring
- **Data context items** with fit indicators
- **Pathway guidance** for tier progression
- **Blueprint architectures** browsable as starting points
- **YAML import/export**
- **AI prompt template** for AI↔Archie workflow
- **Command palette**, **radial context menu**, **ghost nodes**, **architecture report PDF**

Archie is the **deeper analysis tool**. Coding Ducks is the **better tutorial/game**. The opportunity is to bring the game layer into Archie without losing the analytical depth.

---

## Prioritization for Archie

Ordered by value/effort ratio:

1. **Typed colored ports + port rules** (#1) — Highest leverage. Fixes Archie's biggest known gap and unlocks downstream features.
2. **Concrete cost/throughput/latency on variants** (#9) + **budget cap** (#5) — Cheap to model, enables simulation.
3. **Live time-stepped simulation** (#2) — High effort but makes the whole thing visceral.
4. **Challenges/objectives system** (#4) + **star rubric** (#6) — Once simulation exists, mostly content + scoring.
5. **AI-suggested next experiment** (#7) — Brilliant nudge, cheap once simulator exists.
6. **Replicas** (#10) and **topology checker** (#11) — Pair with port system since they share constraints.
7. **History + leaderboard** (#12, #13) — Worth the Firestore investment, but only after #1-6 land.

The **single most valuable architectural change** is the port system. Every other feature on this list becomes easier once edges carry semantic type information.
