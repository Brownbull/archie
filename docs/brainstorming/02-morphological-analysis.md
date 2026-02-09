# Phase 2: Morphological Analysis — Dimensional Mapping

**Status:** COMPLETE

## Dimensions Identified

### Dimension 1: Views / Interaction Modes — DECIDED

**Baseline priority:** Representational completeness first. Must be able to model real-world architectures (WhatsApp, Telegram) with full fidelity — all components, interrelations, capabilities, pros and cons — before adding simulation.

| View | Priority | Source Ideas | Purpose |
|------|----------|-------------|---------|
| **Canvas / Build Mode** | **v1 CORE** | Core vision, #12 | Component assembly, interrelations, capabilities, pros/cons |
| **Play / Simulation Mode** | **v1 secondary** | #12, #15 | Animated data flow with load dial |
| **Instrument Panel** | **v1 secondary** | #49 | Cockpit gauges for simulation monitoring |
| Mixing Board View | Later | #14 | Channel strips with live metric meters |
| A/B Comparison View | Later | #17 | Side-by-side architecture toggle |
| Knowledge Map | Later | #33 | Learning landscape of concepts |
| Efficient Frontier Chart | Later | #25 | Cost vs. performance scatter plot |
| Timeline / History | Later | #43 | Architecture evolution over time |

### Dimension 2: Architecture Metrics — DECIDED

**Decision:** All 38 metrics are v1 CORE, organized in 7 categories.

**Performance (7):** Latency (P50/P95/P99), Throughput (req/sec), Data transfer speed, Cache hit rate impact, Cold start time, Network hops, Data replication lag

**Cost (2):** Monthly infrastructure cost, Cost per user/request

**Reliability (6):** Uptime/availability, Diversification/redundancy score, Failover time, Backup easiness, Data durability, Data consistency model

**Operational (6):** Headcount required, Operational complexity, Automation level, Observability/debuggability, Deployment complexity, Testability

**Scalability (5):** Scalability ceiling, Scaling behavior (linear/step), Horizontal scalability, Vertical scalability, Elasticity (scale-down speed)

**Strategic (5):** Vendor lock-in degree, Component compatibility, Migration difficulty, Compliance readiness (GDPR/HIPAA/SOC2), Security (attack surface, encryption, auth complexity)

**Developer (3):** Skill requirements, Time to production, Learning curve

### Dimension 3: Component System — DECIDED

**Connection rules:** WARN (allow incompatible connections but show warning)
**Pattern detection:** Tooltip only (auto-detect known patterns like CQRS, show as tooltip)
**Hierarchy:** Three-level — Components | Stacks | Blueprints (decided in Phase 1)

**Component Categories (10):**

| Category | Examples |
|----------|----------|
| Compute | API servers, serverless functions, workers, containers |
| Data Storage | PostgreSQL, MongoDB, DynamoDB, S3, Redis |
| Caching | Redis, Memcached, CDN edge cache, browser cache |
| Messaging / Queues | Kafka, RabbitMQ, SQS, Redis Pub/Sub |
| Delivery / Network | CDN, Load Balancer, API Gateway, DNS |
| Real-Time | WebSockets, SSE, Polling, Firebase Realtime |
| Auth / Security | OAuth provider, JWT middleware, WAF, Rate limiter |
| Monitoring / Observability | Log aggregator, APM, Error tracker, Uptime monitor |
| Search | Elasticsearch, Algolia, Meilisearch, pg full-text |
| DevOps / Infra | CI/CD pipeline, Container orchestrator, IaC |

**Component Anatomy (Machine Model):**

Components are "machines" that can be configured in different ways. The configuration is a dictionary of variants, each with different trade-offs that affect the component's metrics AND how it interacts with other components.

```
Component (Machine)
├── identity: name, description, category, tags
├── base_metrics: metrics constant regardless of config
├── ports: input/output connection points (typed)
├── configurations: (dictionary of variants)
│   ├── variant_a:
│   │   ├── description, pros, cons
│   │   ├── metric_modifiers (overrides/adjusts base metrics)
│   │   └── port_modifiers (may change interaction behavior)
│   ├── variant_b:
│   │   └── ...
│   └── ...
├── synergies: component pairings that amplify benefits
├── skill_requirements: what you need to know
└── maintenance_burden: person-hours
```

**Critical insight: Two-level architecture modeling**
- **Level 1: Infrastructure** — What tools/services (Firebase, PostgreSQL, Redis)
- **Level 2: Internal patterns** — How data/code is structured WITHIN those tools (flat vs nested docs, normalized vs denormalized, cache-aside vs write-through)

Level 2 choices (configuration variants) affect both the component's own metrics AND its interactions with other components. All defined in YAML, all community-extensible.

### Dimension 4: Architecture File Format — DECIDED

| Aspect | Decision |
|--------|----------|
| **Format** | YAML |
| **Scope** | All three (Component definitions, Stack definitions, Full blueprint definitions) |
| **Schema** | Versioned schema evolution |
| **Includes** | Metadata + metrics + visual layout |
| **Portability** | Self-contained (all data in file) |

**Design principles:**
- Human-readable, git-versionable
- Creatable by developers outside the tool (text editor friendly)
- Easily shareable as files
- Loadable by the tool
- Separates WHAT (architecture) from HOW (rendering/animation)

### Dimension 5: User Progression — DECIDED

| Aspect | Priority | Source Ideas |
|--------|----------|-------------|
| **Tutorial / Onboarding (graduated complexity)** | **v1** | #44 |
| **Safe Sandbox** | **v1 (core principle)** | #32 |
| **Skill Gap Radar** | **v1** | #6 |
| Mastery-Based Unlocks | Later | #31 |
| Growth Quest Log | Later | #7 |
| Knowledge Map | Later | #33 |
| Blind Spot Detection | Later | #8 |
| Challenge / Puzzle Mode | Later | #47 |

### Dimension 6: Community / Sharing — DECIDED

| Aspect | Priority | Source Ideas |
|--------|----------|-------------|
| **Blueprint Library** | **v1** | #19 |
| **Import/Export YAML** | **v1** | #13 |
| **Component Benefit Cards** | **v1** | #51 |
| **Challenge-Based Browsing** | **v1** | #52 |
| Forking with Diff View | Later | #40 |
| Community Marketplace | Later | #21 |
| Component Registry with Ratings | Later | #41 |
| Architecture Comments | Later | #42 |
| Version History | Later | #43 |

### Dimension 7: Simulation Capabilities — DECIDED

| Aspect | Priority | Source Ideas |
|--------|----------|-------------|
| **Parametric Recalculation** | **v1 (core to canvas)** | #34 |
| **Bottleneck Heatmap** | **v1** | #1, #36 |
| **Constraint Guardrails** | **v1** | #35 |
| **Multi-Track Scoring Dashboard** | **v1** | #46 |
| Traffic Load Dial | v1 secondary | #15 |
| Solo/Mute Components | Later | #16 |
| Failure Simulation | Later | #39 |
| Time-Based Simulation | Later | #18 |
| Scenario Training Library | Later | #50 |
| Critical Path Highlighting | Later | #38 |
| Animated Flow | Later | #10 |

### Dimension 8: Personalization — DECIDED

| Aspect | Priority | Source Ideas |
|--------|----------|-------------|
| **Player Profile** | **v1** | #5 |
| **Gap Analysis Layer** | **v1** | #9 |
| **Priority Sliders** | **v1** | #24 |
| **Budget Constraint Mode** | **v1** | #55 |
| Matchup Analysis | Later | #56 |
| "What Can I Build?" Mode | Later | #28 |
| Substitution Suggestions | Later | #29 |
| "Avoid Tolls" Mode | Later | #62 |
| Time-to-Production ETA | Later | #61 |
| Multiple Routes | Later | #60 |

---

## v1 Feature Summary (Across All Dimensions)

**Core:**
- Canvas / Build Mode with component assembly
- Three-Tab Toolbox: Components | Stacks | Blueprints
- Machine model with configuration variants (two-level architecture)
- 38 architecture metrics across 7 categories
- YAML file format (self-contained, versioned schema)
- Parametric recalculation (change one thing → everything updates)
- Bottleneck heatmap + constraint guardrails + multi-track scoring
- WARN mode for incompatible connections
- Pattern detection via tooltip

**Personalization:**
- Player profile (team size, skills, budget)
- Gap analysis layer (architecture requirements vs. player capabilities)
- Priority sliders (weight what matters to you)
- Budget constraint mode (live counter)

**Community:**
- Blueprint library (pre-built architectures)
- Import/Export YAML
- Component benefit cards
- Challenge-based browsing (by problem, not tech)

**Progression:**
- Tutorial / graduated onboarding
- Safe sandbox (can't break anything)
- Skill gap radar

**Secondary (v1 but lower priority):**
- Play / Simulation Mode with traffic load dial
- Instrument Panel for monitoring
