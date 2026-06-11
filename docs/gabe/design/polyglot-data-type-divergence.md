# Polyglot Data-Type Traffic Divergence — exploration (P5-S7, D95)

> Source: feedback20260609.md line 112 + PLAN Phase 5 scope ("exploration"). Owner fork
> (2026-06-10): exploration doc only — no engine change this phase.

## The idea

Requests aren't homogeneous: a checkout writes RELATIONAL rows, a feed read hits a NOSQL store, an
upload streams a BLOB. The polyglot-persistence lesson ("route each shape to the store built for
it") is currently taught through required/forbidden types and briefs — the SIM itself doesn't
distinguish data shapes. The exploration: should it?

## How it would work (mechanical sketch)

1. **Traffic sources** gain a `data_mix` ({relational, nosql, blob} fractions, default 100%
   relational-ish "generic"). The existing workload/cacheable blend pattern (ED5) is the template —
   rps-weighted across sources into a global mix.
2. **Ports already encode the routing**: `database` ports on relational stores, `cache`, object
   storage's distinct port. A `data-routing` derating mirrors the cache-hit derating: a store
   serving a shape it isn't built for (blobs in PostgreSQL) takes a latency + capacity penalty;
   a missing store for a present shape sends that fraction to the least-bad fallback at a price.
3. **Scoring** stays rubric-shaped: no new stars — the penalty surfaces through uptime/latency,
   exactly like write-pressure does today.

## Why deferred

- **Blast radius**: the derating enters `buildSimGraph`/engine — the golden byte-identity and the
  62/62 solvability harness both sit on that path. Every data-bearing quest would need
  recalibration (the Phase-3 S2 lesson: calibration is a full slice of its own).
- **Teaching overlap**: polyglot-persistence already teaches the lesson via required_types +
  forbidden_types (and its S2-fixed hint ladder). The sim-mechanical version is richer but not
  *new curriculum* — it deepens an existing quest rather than unlocking new ones.
- **Better sequenced after live per-edge flow** (see link-viz v2): data-shape routing is most
  legible when the player can SEE the shapes flowing — colored dots per data type on the links.

## Revisit trigger

When a content phase next touches the data track (new tier-4+ data quests), bundle: `data_mix`
schema + routing derating + per-shape dot colors + recalibration of the ~8 data-track quests.
