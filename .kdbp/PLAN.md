# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Simulation Realism — make component types matter in the simulation engine. Today all components are generic pipes with different maxRPS/latency numbers; a cache, database, and queue behave identically. This epic adds type-specific simulation behaviors (cache hit ratio, write/read split, CDN bifurcation, serverless cold start, queue backpressure, monitoring feedback) so challenges can test whether the player understands *why* they chose a specific component, not just *that* they placed one.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-06-02
- **Last Updated:** 2026-06-02
- **Design artifact:** docs/architecture/simulation-enhancements.html (classified proposals)
- **Source:** Thorough recon of simulationEngine.ts, all 91 component variants, scaling rules, and interaction rules. Current engine uses ONLY effectiveMaxRps + baseLatencyMs — no type-specific behavior.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Cache hit ratio (E1) | Add `cache_hit_ratio` to cache variants (Redis, Memcached). Split incoming traffic: hits served at cache latency (0.5ms), misses forwarded downstream. Cache actually reduces DB load instead of being an independent pipe. | ent | med | ✅ | ⬜ | ⬜ | ⬜ |
| 2 | Write/read path split (E2) | Add `write_ratio` to data-storage variants. Writes bottleneck at primary (SQL) or distribute across shards (NoSQL). Makes SQL vs NoSQL fundamentally different under write-heavy load. | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | CDN edge bifurcation (E3) | Reuse cache_hit_ratio on CDN variants. Hits served from edge (10ms), misses add origin penalty (80ms). CDN is no longer just a high-capacity LB. | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Serverless cold start (E4) | Add `cold_start_latency_ms` + `cold_start_ratio` to Lambda on-demand variants. Cold starts spike p99 under burst traffic. Provisioned concurrency eliminates them. | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Queue backpressure (E5) | Message queues absorb burst into a buffer instead of shedding. Queue fills → latency grows → overflow sheds. Differentiates Kafka (durable, high buffer) vs RabbitMQ (fast drain). | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Interaction rules affect capacity (E6) | Category-pair rules (caching→DB) currently adjust metric scores only. Extend to also adjust effective capacity — cache reduces DB incoming traffic, monitoring helps failure recovery. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Protocol overhead (E7) | Different connection protocols add different latency overhead. HTTP > gRPC > TCP > Memcached protocol. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Monitoring feedback (E8) | If monitoring is connected to a failing node, recovery is faster. Without monitoring, failure duration ×1.5. Makes monitoring non-decorative. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec ⬜/🔄/✅. Review/Commit/Push auto-ticked. -->

## Current Phase

Phase 1: Cache hit ratio (E1)

## Phase Details

### Phase 1 — Cache hit ratio (E1)
```yaml
phase: 1
types: [engine, simulation, data]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D47
```
- **Tier:** ent — the cache hit ratio changes the simulation engine's core traffic propagation logic; it's a load-bearing change that affects every challenge with a cache node. Deterministic round-trip tests required.
- **Key files:** `src/engine/simulationEngine.ts`, `src/engine/simulationTypes.ts`, `src/data/components/redis.yaml`, `src/data/components/memcached.yaml`
- **Formula:** `hit_traffic = incoming × cache_hit_ratio` (served at cache latency); `miss_traffic = incoming × (1 - ratio)` (forwarded downstream)
- **Tests:** Unit tests for the bifurcation logic; integration test showing cache reduces downstream DB RPS by the hit ratio

### Phase 2 — Write/read path split (E2)
```yaml
phase: 2
types: [engine, simulation, data]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D48
```
- **Tier:** ent — differentiates SQL and NoSQL at the simulation level. Write bottleneck on primary is a fundamental architectural concept.
- **Key files:** `src/engine/simulationEngine.ts`, `src/engine/simulationTypes.ts`, `src/data/components/postgresql.yaml`, `src/data/components/mongodb.yaml`, `src/lib/constants.ts` (scaling rules)
- **Formula:** `write_rps = incoming × write_ratio` → capped at primary maxRPS (no replica help for SQL); `read_rps = incoming × (1 - write_ratio)` → scales with replicas
- **NoSQL sharded:** write_rps also scales with shards (writes distribute)

### Phase 3 — CDN edge bifurcation (E3)
```yaml
phase: 3
types: [engine, simulation]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D49
```
- **Tier:** mvp — reuses the cache_hit_ratio logic from Phase 1. Adds `miss_latency_penalty_ms` to CDN variants.
- **Key files:** `src/engine/simulationEngine.ts`, `src/data/components/cloudflare-cdn.yaml`, `src/data/components/cloudfront.yaml`, `src/data/components/fastly-cdn.yaml`

### Phase 4 — Serverless cold start (E4)
```yaml
phase: 4
types: [engine, simulation]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D50
```
- **Tier:** mvp — simple latency addition on a subset of requests. ~15 lines.
- **Key files:** `src/engine/simulationEngine.ts`, `src/data/components/aws-lambda.yaml`, `src/data/components/serverless.yaml`

### Phase 5 — Queue backpressure (E5)
```yaml
phase: 5
types: [engine, simulation, data]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D51
```
- **Tier:** ent — adds a buffer/queue-depth model to the simulation engine. Significant refactor of the per-tick loop.

### Phase 6 — Interaction rules affect capacity (E6)
```yaml
phase: 6
types: [engine, simulation, integration]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Integration]
suppressed_dims_count: 0
decisions_entry: D52
```
- **Tier:** ent — bridges the metric system and the traffic simulation; category-pair rules change effective capacity.

### Phase 7 — Protocol overhead (E7)
```yaml
phase: 7
types: [engine, simulation]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D53
```
- **Tier:** mvp — read connection protocol from edge nodes, apply multiplier to latency.

### Phase 8 — Monitoring feedback (E8)
```yaml
phase: 8
types: [engine, simulation]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D54
```
- **Tier:** mvp — monitoring presence shortens failure recovery duration.

## Dependencies

- P1 (cache hit ratio) is standalone — changes the engine's traffic forwarding at cache nodes.
- P2 (write/read split) is standalone — changes how data-storage nodes process traffic.
- P3 (CDN bifurcation) depends on P1 — reuses the same cache_hit_ratio + miss_penalty logic.
- P4 (serverless cold start) is standalone.
- P5 (queue backpressure) is standalone but significant.
- P6 (interaction rules) depends on P1 + P2 being in place (the rules reference cache and DB behavior).
- P7 (protocol overhead) is standalone.
- P8 (monitoring feedback) is standalone.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cache hit ratio changes the traffic propagation DAG — downstream nodes receive less traffic | high | Unit tests: with/without cache, verify DB incoming RPS matches expected ratio. Round-trip deterministic tests. |
| Write/read split adds complexity to the per-node capacity model | high | Additive field on SimNode (default 0 = no split). Existing behavior unchanged when write_ratio absent. |
| CDN miss penalty could make CDNs look worse than LBs in the simulation | medium | Tune miss_latency_penalty_ms so CDN with 85% hits still outperforms no-CDN on p99. |
| Challenge rebalancing — existing challenges may need retuning after engine changes | medium | Run all 33 challenges through the E2E suite before/after; compare star outcomes. Flag any that flip from pass to fail. |
| Queue backpressure model adds per-tick state (queue depth) | medium | New SimNode field with default empty queue. Existing nodes unaffected. |

## Notes

- Phases 1-4 are the "ship now" tier (~135 lines total). Phases 5-8 are backlog.
- Each phase should be independently shippable and testable.
- The E2E challenge validation suite (tests/e2e/challenge-validation.spec.ts) should be run before/after each phase to catch challenge regressions.
- Reference: docs/architecture/simulation-enhancements.html for the full analysis.

## Review Artifacts

- Design artifact: docs/architecture/simulation-enhancements.html (classified proposals)
- Engine reference: docs/architecture/simulation-engine.html (how the engine works today)
