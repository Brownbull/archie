# Vendor-Tier Progression & the Break-Way Roadmap — analysis (D102 follow-up, 2026-06-11)

> Owner ask: "re-analyze the quests — maybe this is the opportunity to start unlocking tiers
> inside blocks (Node Express → FastAPI → …); better capability should give access to better RPS
> and unlock NEW break conditions." Engine-probed, two findings and a two-track proposal.

## Finding 1 — capability ladders are HUGE and nearly free to climb

Compute alone spans **100×** at similar money:

| Rung | Vendor/tier | maxRPS | $/mo |
|---|---|---|---|
| starter | node-express / single-process | 1,000 | $20 |
| tier-up | node-express / cluster-mode | 4,000 | $40 |
| vendor jump | **python-fastapi / uvicorn** | **7,000** | **$22** |
| high | spring-boot / standard-jvm | 20,000 | $60 |
| endgame | go-service / horizontal-pods | 100,000 | $70 |

FastAPI at +$2/mo over the starter is exactly the "super bazooka next to bow and arrow" the
original feedback flagged. Today every vendor of an unlocked TYPE is available from quest one —
the only counterweight is per-quest `restricted_vendors` (the blocking half) and budget caps.

## Finding 2 — tiers move BOUNDARIES; component CLASSES mint WAYS

Probed on first-service's lean build across all four rungs above: the feasible break-way set is
**identical** (`rps-overload, shape-steady, shape-periodic`) at every tier — only the failure
boundary relocates (≈1,055 → ≈4k → ≈7k+ → out-of-range). On a simple topology, capability is a
sliding scale, not a mechanic. NEW ways come from new MECHANICS, which arrive with component
classes, not tiers:

| Future way (registry method) | Mechanic | Arrives with |
|---|---|---|
| `pool-exhaustion` | concurrency_limit in-flight cap | llm-gateway (live), pooled DBs |
| `cache-stampede` | hit-ratio erosion under burst + write pressure | cache tier |
| `replication-staleness` | read-replica lag vs consistency targets | primary-replica DBs |
| `cold-start-collapse` | autoscale spin-up lag under spike | serverless |
| `cascade-retry` | retry amplification past a failing hop | retry/multi-hop chains |

These already exist as ENGINE mechanics (EN2/ED4/ED8/autoscale/retry) — the work is detection
(classify a failed run by dominant mechanic, like breakDetection does for dials) + registry ids +
introduction quests. This is the real answer to "new capabilities unlock new break conditions":
the condition arrives when the BLOCK CLASS does, and the player meets it tier by tier.

## Proposal — two tracks

**Track A — vendor-tier unlock ladder (economy; the Expert sink D102 needs).**
- Unlocking a block TYPE grants its DEFAULT vendor's base tier only (first-service stays Node
  Express single-process — the harness's reference builds use type defaults, so all 64 proofs are
  untouched by construction).
- Other vendors (and premium tiers within a vendor?) start locked account-wide; **1 Expert
  unlocks one vendor** (provider select shows them locked-with-price, mirroring the restriction
  styling). Grandfathering: anything a player has ever placed stays unlocked (no reset needed —
  moot right now post-wipe).
- Effects: brute-force one-shotting gates behind earned knowledge; budget/perf optimization play
  deepens (climb when the quest demands it); Expert scarcity (D102) gets its matching sink.
- Guards: a harness gate asserting every quest's reference build uses only default vendors
  (= always affordable at 0 Experts), so progression can never soft-lock a quest.

**Track B — break-way roadmap (content/engine; D102's follow-up made concrete).**
- Implement way-detection per mechanic (pool-exhaustion first — engine + a quest already live),
  one way at a time; each lands as a registry method with an introduction quest where it's the
  intended lesson (The Pool Runs Dry is ready-made for `pool-exhaustion`).
- Sequenced with the tech tree: the way becomes detectable game-wide once its mechanic exists,
  but its INTRODUCTION quest teaches it — mirroring teach-by-using for blocks.

## Risks
- A: provider-select UI needs a third state (locked-knowledge vs locked-restriction) — flagged in
  the v1 doc; the restriction styling is the template. Firestore: `unlockedVendors` map + rules.
- B: each way's detector must be causal-grade (the D101 counterfactual discipline) or the registry
  fills with coincidences. One way per slice, harness-gated like dials.
