<!-- Generated 2026-06-05 by the learning-fidelity-playbook workflow (27 agents). Source of truth for Phase 2-4 implementation. .kdbp/PLAN.md remains canonical for phase state. -->

# Learning-Fidelity Redesign — Implementation Playbook (Phases 2–4)

This playbook orders every remaining engine/scoring gap for human+AI execution. Each spec below has the adversarial verifier's corrections **already folded in** — the text is the corrected spec, not the raw proposal. Treat the solvability harness as the oracle of record throughout.

---

## 1. Sequencing & dependencies

### Hard ordering rules (non-negotiable)

1. **Phase 2 before Phase 3.** Phase 2 changes how `systemLatency` aggregates (per-tick MAX → path-SUM) and the per-node latency shape (queueing curve). Every Phase-3 outage re-tune number is computed against the post-Phase-2 aggregator, so Phase 3 re-calibration done before Phase 2 is thrown away.
2. **Within Phase 2: land ED1/EN1 and ED4/LX4 as ONE atomic change-set.** Their p99 effects are inseparable — ED4's per-node curve only has meaning under ED1's path-sum aggregation. EN2 (concurrency) layers on top of ED4's curve and ships in the same Phase-2 commit family. Do not merge any one of the three's math alone; CI (`npm run build` = `tsc -b`, then vitest) goes red on every challenge.
3. **EN6 before EN3.** The fixed-point cyclic-flow solver is the foundation EN3's retry-amplification machinery reuses. EN6 has **no upstream gap dependency** (the spec's self-declared `dependencies:[EN3]` is inverted — EN6 unblocks EN3, not the reverse). Pull EN6 forward into Phase 3 (or land it as the first Phase-4 item before touching EN3). EN3 must not be scheduled until EN6 lands and exposes a reusable per-node relaxation entry point + a per-pass reset contract.
4. **restore-redundancy only after ED2.** Redundancy scoring is mechanically meaningful only once `az_outage` removes a *fraction* of a category (ED2). ED2 itself has **no upstream gap dependency** (its self-declared `dependencies:[EN3,EN7]` is inverted — ED2 is the precondition for EN3/EN7/redundancy). Implement ED2 first within Phase 3, then layer EN7 severity on the surviving fraction, then restore redundancy scoring.
5. **ED3 lands alongside the Phase-3 builder rework.** ED3's on-path required-types gate shares the reference builder's exact on-path classifier; ship the builder's on-path wiring fix and the scorer gate in the same commit (the D69 "challenge + builder support together" pattern).
6. **Phase-4 ordering:** EN6 first (unblocks EN3 retroactively and is a pure correctness fix). ED5/ED9/EN5 are independent sub-slices. ED6/EN4/ED8 (multi-region/consistency) is XL and soft-depends on ED1/EN1 (path-sum), ED9, EN5.

### Standard re-calibration loop (the exit gate for EVERY engine change)

This is the **D75 loop** — the single mechanical exit applied identically to every gap below:

1. Land the engine/stats/schema math (gated so defaults compose to identity where claimed).
2. Run `tests/integration/challenges/solvability.test.ts` (all 57 must stay 3★) and `tests/integration/challenges/capstone-completion.test.ts` (capstones 3★). The harness IS the oracle — its per-challenge failure messages (`uptime=x/target p99=x/target stars=n`) drive the re-tune.
3. For every challenge whose harness-measured metric crossed its authored target, set the YAML target from the **harness's measured value** (× a documented headroom factor where the gap specifies one). Do an **exhaustive sweep across all 57** when the gap raises every measured value (ED1, ED4) — not a conditional subset.
4. Regenerate the golden snapshot **only if a target VALUE changed** (`npx vitest -u`). **Key fact:** `rubricScorer.golden.test.ts` snapshots only `{id, stars, passedMetrics, hasRequiredBlocks, underBudget, cleanTopology}` — booleans/star-counts, NOT latency/cost numbers. `meetingStats()` synthesizes stats that exactly meet whatever target is authored, so editing a numeric target produces a **zero golden diff**. The golden is a tripwire for *star/boolean drift*, run it **without `-u` first** — an unexpected diff means something flipped and is a bug. The real audit trail of moved targets is the `git diff` of `src/data/challenges/*.yaml` + the harness pass/fail.
5. Regenerate capstone E2E fixtures via `toArchitectureFixture(buildClearingSolution(c))` for any challenge whose winning candidate flipped (lean vs max/redundant); re-run the `desktop-unlocked` capstone replay.
6. Verify with `npm run build` (project memory: root tsconfig project refs skip `src/` under `--noEmit`; `tsc -b` is what CI runs).

---

## 2. Phase 2 — Core engine fidelity (latency, utilization, concurrency)

> Land ED1/EN1 + ED4/LX4 as a single atomic commit, then EN2 in the same commit family. All three force a full 57-target re-tune.

### Gap 2.1 — ED1/EN1: End-to-end latency = SUM along the served path

**Spec summary (corrected).** Today `systemLatency()` (`simulationStats.ts:45`) returns `max(n.latencyMs)`, so a 7-hop chain scores as fast as its slowest tier — adding hops/chattiness is free. Change end-to-end latency to the **SUM of per-node latencies along the actual served request path + a fixed inter-node RTT per traversed edge**, with cache/CDN hits short-circuiting the path, keeping worst-hop only as a secondary overload term. Because `computeSimStats` has no graph edges, the path-sum is computed inside `simulateTick` (the only place with edges + topo order + inflow) and carried on `TickState`.

**Cache short-circuit semantics (corrected — resolves the unweighted-max contradiction).** Compute P as a **traffic-weighted aggregate over completion points**, NOT an unweighted max. A cache/CDN node with `hitRatio∈(0,1)` is BOTH a terminal (for the absorbed `served×hitRatio` hit fraction, completing at that node) AND an interior forwarding node (for the `served×(1−hitRatio)` miss fraction). Per-tick served-path latency `P = Σ over completion points of (trafficFraction_i × accLatency_i)` (or a percentile over the served-request population). This makes a 90%-hit cache genuinely lower P (the dominant 90% completes at the short traffic→cache path), delivering the actual lesson. The earlier "unweighted max" formulation was a defect: it always returned the full miss chain and caching never lowered P.

**Per-node latency is the REAL engine value (corrected — worked example was wrong).** A node's own term on the path is its full `latencyMs` from `simulationEngine.ts:232-259`: `latencyUnderLoad(base, cap) × latMult + protocolOverheadMs + queueDepth×0.01 + missLatencyPenaltyMs×(1−hitRatio) + coldStartLatencyMs×coldStartRatio`. The miss penalty is part of a CDN/cache node's **own** term **on the terminal hit path too** (e.g. `cloudflare-cdn`: base 20 + 80×(1−0.90)=8 ⇒ 28ms, not 10ms). Build the worked acceptance numbers from a **named fixture** so unit tests assert exact reproducible values; do not use illustrative bare-base-latency arithmetic.

**Completion points = legitimate request-completion sinks only (corrected).** A node terminates a user request iff its category is in {data-storage, compute (leaf), caching (hit fraction)} OR it is a sink with served-carrying in-edges. **Exclude monitoring/observability and async messaging/real-time fan-out sinks** from P — they are side-channels and would otherwise let a monitoring tier set the latency the author never intended to gate. The reference builder wires `compute→db` AND `compute→observability`; only the db branch is a completion point.

**Overload relationship (corrected — specify now, don't defer).** Gate the metric on **P alone** for ED1, but keep `worstHopLatencyMs` (W) on TickState. Add an explicit regression guard: a single-tier-overloaded build that fails the latency gate **today** must still fail on the new metric (not just the 7-hop>1-hop invariant). Since the re-tune loop only RAISES targets, this guard prevents a currently-overload-failing build silently passing.

**Serialized-frame fork (corrected — eliminate the silent divergence).** Making `pathLatencyMs` optional with a max-hop fallback creates a correctness fork: saved/rehydrated frames would score on the OLD metric while live runs use path-sum. Either always recompute path latency when stats are computed from frames that lack it, OR version `TickState` so the fallback is hit ONLY by truly pre-change test fixtures, never by user-facing saved runs. Add a test that a serialized-then-rehydrated frame scores identically to its live run.

**RTT accounting (corrected — pin entry/multi-entry rules).** `INTER_NODE_RTT_MS = 2`, charged once per traversed edge on the served path; entries charge 0 to themselves but the first real hop (traffic→dns) does charge RTT. For multi-entry/weighted-seed graphs, the seeded inflow edge charges RTT per a worked multi-entry example + unit test, so implementer and test author agree on the off-by-one-RTT accounting.

**Exact files/functions.**
- `src/lib/constants.ts`: add `INTER_NODE_RTT_MS = 2`, `OVERLOAD_LATENCY_BLEND = 0.5` (reserved for ED4 blend, ship P alone here). Keep `LATENCY_LOAD_K` (removed in ED4).
- `src/lib/simulationTypes.ts`: add `pathLatencyMs?: number`, `worstHopLatencyMs?: number` to `TickState` (optional for legacy fixtures; `simulateTick` always populates).
- `src/engine/simulationEngine.ts` `simulateTick`: after the Kahn `order` pass, single forward pass over `order` computing `accLatency(v) = nodeLatency(v) + INTER_NODE_RTT_MS + max_{u∈servedParents(v)} accLatency(u)`; served-carrying edge predicate is the **identical** one at lines 268-271 (`served_u×(1−(hitRatio_u||0))>0`); P = traffic-weighted aggregate over completion points; W = `max(telemetry.latencyMs)`. Cyclic nodes processed without forwarding contribute as terminals only.
- `src/lib/simulationStats.ts`: `systemLatency(tick) = tick.pathLatencyMs ?? max(...latencyMs)`; aggregation lines 60-75 unchanged (now percentile the path-sum series). No `computeSimStats` signature change — all 56 callers untouched.

**Re-calibration step.** Exhaustive: re-tune **all 57** `p99_latency_ms` AND **all ~40 authored** `p95_latency_ms` targets (PLAN Phase-2 exit says all 57). Path-sum + per-edge RTT raises EVERY measured latency above max-hop. The lean builder's FRONT_SPINE order (`referenceSolution.ts:60`) determines reference path length, so its measured p99/p95 defines each new floor. Golden: zero diff expected (run without `-u`).

**Test plan.** Unit: linear 3-node chain asserts `pathLatencyMs === 5+RTT+10+RTT+20`, `worstHopLatencyMs===20`; entry-only node = nodeLatency, no RTT; cache short-circuit (toggle hitRatio 0 vs 0.9, assert 0.9 case lower P — the traffic-weighted lesson); fan-in asserts `max(A,B)` not `A+B`; fan-out asserts max branch. Stats: `it("sums latency along the served path")`. Integration: solvability + capstone AFTER re-tune (the gate). Regression: 7-hop > 1-hop at identical base; single-tier-overload still fails; cyclic graph stays finite; serialized==live.

**Effort:** L. **Risk:** Harness goes RED on every challenge until p99 re-tuned — expected signal, not regression; land math + all-57 re-tune + golden check in one atomic commit.

### Gap 2.2 — ED4/LX4: Queueing curve for `latencyUnderLoad`

**Spec summary (corrected).** Replace flat-then-linear `latencyUnderLoad` with an M/M/1-style curve so per-node latency rises smoothly as utilization ρ→1, making headroom a real, teachable quantity. Ship in the SAME commit as ED1.

**Curve constants reconciled (corrected — the doc inconsistency).** `LATENCY_QUEUE_RHO_CAP = 0.99`, `LATENCY_QUEUE_FLOOR_RHO = 0.5`. The curve **renormalizes** ρ through `u = (ρc−FLOOR)/(1−FLOOR)`, so at ρ=0.99 the multiplier is `1/(1−0.98) = 50×`, **NOT 100×**. Document the cap's doc-comment as 50× to match the algorithm and tests. (The "100×" figure only applies to a non-renormalized `1/(1−ρ)`, which would break C0 continuity at the floor — do not use it.)

**Algorithm.** `ρ = capacityPercent`; if `ρ ≤ FLOOR` return `base` (preserves the "base at 50%" contract); else `ρc = min(ρ, 0.99)`, `u = (ρc−FLOOR)/(1−FLOOR)`, return `base/(1−u)`. Table: ρ=0.50→1×, 0.75→2×, 0.90→5×, 0.95→10×, 0.99+→50×. Additive penalties + `×latMult` still stack on top, unchanged.

**Exact files/functions.**
- `src/lib/constants.ts`: replace `LATENCY_LOAD_K` (grep-confirmed sole consumer is `simulationEngine.ts`) with `LATENCY_QUEUE_RHO_CAP=0.99`, `LATENCY_QUEUE_FLOOR_RHO=0.5`.
- `src/engine/simulationEngine.ts:60-63`: rewrite `latencyUnderLoad`; update import on line 1.
- `tests/unit/engine/simulationEngine.test.ts`: keep 50%-load=10ms; replace 200%-load assertion (now clamps to 0.99 → 50× → 500ms, was 30); add ρ=0.75→20ms, 0.9→50ms, 0.95→100ms as the curve-shape regression guard.

**Re-calibration step (corrected — measurement-driven, no per-challenge predictions).** All numeric predictions ("compute/DB at ρ≈0.91 → ~5.5×") are **pre-ED1 and NOT load-bearing** — they were derived against the old max-aggregation that ED1 removes. After ED1+ED4 land, regenerate ALL targets from the harness: target = harness-measured p99/p95 × 1.15 rounded up to 10ms. Provision-by-ceil means many capped tiers realize ρ well below 0.91, so several targets won't move and the ripple is NOT uniform.

**Tight-latency challenge guard (corrected — teaching-intent protection).** For low-latency-by-design challenges — `37-cold-start-spike` (p99=100, p95=65), `46-the-long-tail` (p95=90, p99=200), `22-realtime-live` (p99=150), `07-search-at-scale` (p99=180) — if `measured×1.15` would raise the target by **>50%**, STOP: reduce the challenge's load/budget or accept a smaller headroom factor instead of auto-raising. Auto-raising guts the lesson (cold-start-spike's whole point is the 100ms ceiling). List these four as **manual-review-required**.

**Golden snapshot (corrected — it's a no-op).** Re-tuning targets produces a byte-identical snapshot (`meetingStats` always meets whatever target is authored). Run the golden test to confirm PASS; do NOT expect or require a `-u` regeneration. The audit trail is the YAML git diff + harness.

**EN2 orthogonality contract.** The `1/(1−u)` multiplier models service-time inflation; EN2's additive `queueDepth×0.01` term models buffered (not-yet-served) latency and applies only to nodes with `queueBufferSize>0` in the `failureMode=queue` branch. Verify shed-mode nodes (the common case) never carry queueDepth so the additive term is 0 for them — document this to prevent double-counting saturation latency.

**Test plan.** Unit: the curve-shape assertions above + continuity at the floor + finite (no Inf/NaN) at ρ=1.0 and ρ=10. Integration: solvability stays green (all 57 @ 3★) after re-tune — the gate. Targeted Phase-2 spec: live capacity gauge / p99 telemetry climbs monotonically as a tier crosses ρ=0.5→0.9.

**Effort:** L. **Risk:** Curve raises measured p99 for capacity-bound tiers; if a target isn't raised in lockstep solvability goes red — mitigated by the atomic ED1+ED4+re-tune commit.

### Gap 2.3 — EN2: Concurrency/queue model (Little's Law)

**Spec summary (corrected).** Add a per-variant concurrency limit so saturation has TWO axes: a node rejects connections when in-flight slots exceed its limit, AND latency couples to queue depth via Little's Law. Teaches connection-pool exhaustion. Ships WITH ED4's curve (the concurrency gate reads the curve's W).

**The "byte-identical" guard is split (corrected — critical fix).** Because ED4's curve ships unconditionally, latency is **NOT** byte-identical when `concurrencyLimit` is undefined — only the concurrency *gate* is a no-op. **Rewrite test guard (c)** to assert byte-identical `served`/`failed` ONLY (drop the latency half — the curve always rewrites latency). The undefined-no-op guard protects STEP-2 (concurrency), never STEP-1 (curve).

**Three existing assertions MUST be updated (corrected — missed required edits).** Under ED4's curve: `simulationEngine.test.ts:97` (10ms@ρ=0.5 — stays, base at floor), `:100-101` (was 30ms@ρ=2 → now ~1970ms or the renormalized 500ms — recompute), `:257` (was 40ms@ρ=0.5×4latMult → recompute under the curve). Enumerate and update all three as required edits.

**Which W feeds the gate (corrected — pin it).** Use `W_queue` = the bare queueing-curve value, computed BEFORE protocol/miss/cold-start/queue-depth additive terms and BEFORE `latMult`. `L = served × (W_queue/1000)`. This deliberately excludes `latMult` so a future Phase-3 `latency_spike` chaos event does not silently collapse throughput via X_cap. Queue-depth feedback into concurrency is an explicit Phase-3+ follow-up, not part of EN2.

**`LATENCY_LOAD_K` value pinned (corrected — "gentle below 0.5" was false).** The earlier `1 + K×ρ²/(1−ρ)` form with K=2 gives 2× base at ρ=0.5, not "≈base". Since EN2 uses ED4's renormalized `base/(1−u)` curve (flat below FLOOR=0.5), this is resolved by adopting ED4's curve directly — do not reintroduce a separate K-based form. Reconcile/remove the stale `constants.ts:136-138` comment that references "at 2x capacity" (ρ is now clamped at 0.99).

**Algorithm.** Per node per tick: STEP-1 compute `W_queue` via ED4 curve, add additive terms + latMult for the *reported* latency. STEP-2 if `C = replica-scaled concurrencyLimit > 0`: `L = served×(W_queue/1000)`; if `L>C` then `X_cap = C×1000/W_queue`, `served = min(served, X_cap)`, `rejected = provisional−served`, `failed += rejected`. STEP-3 `failedRps=incoming−served`, `rejectedRps=` the STEP-2 slice, `overloaded = (capped && incoming>effMaxRps) || rejected>0`. Bound `X_cap` (MAX_CONCURRENCY cap + RHO_CAP + EPS floor) to avoid Infinity.

**Effort re-scoped to XL (corrected).** There are ~114 component YAMLs (~250-300 variants) needing `concurrency_limit` authored. Order the authoring as a hard gate: (1) land curve+gate behind undefined-no-op (gate only) + curve p99 re-tune; (2) author `concurrency_limit` on the **minimal reachable set first** — audit `COMPONENT_TYPES.defaultProviderId` to find variants the lean builder actually picks — then the full 114-file pass; (3) make `pickCheapestVariant`/`leanResize` concurrency-aware **including the cdn/cache early-return branch** (after picking the highest-hit-ratio cheapest variant, verify its replica-scaled concurrency carries `load×(estimatedW/1000)`; if not, fall through to general fits/cost selection); (4) re-tune + regenerate. Assert 57/57 at each step.

**Sizing-time W estimate (corrected — resolve circularity).** The lean builder's `fits` predicate needs an estimated W per variant, but W depends on post-resize ρ (circular). Use a conservative upper-bound: evaluate the curve at a fixed target ρ (e.g. 0.8) so the builder never under-sizes concurrency. Add the variant's `concurrencyLimit` to the `Variant` type and the `fits`/`replicasFor` predicates.

**Exact files/functions.** `componentSchema.ts` (`concurrencyLimit` on both variant schemas + `MAX_CONCURRENCY=1_000_000`); `simulationTypes.ts` (`SimNode.concurrencyLimit?`, `NodeTelemetry.rejectedRps`); `architectureStoreHelpers.ts` (`NodeCostInfo.concurrencyLimit`, scale by replicas in `getNodeCost`, thread onto SimNode in `buildSimGraph`); `simulationEngine.ts` (gate in `process`); `constants.ts` (`RHO_CAP=0.99`, `QUEUEING_LATENCY_EPS=0.01`); `referenceSolution.ts` (concurrency-aware `pickCheapestVariant`/`leanResize`).

**Test plan.** Unit: high-C+normal-W ⇒ unchanged served; ρ<1 but L>C ⇒ served clamps, rejectedRps>0, overloaded=true (the pool-exhaustion case); undefined/0 C ⇒ byte-identical served/failed (NOT latency); Little's identity L≤C post-gate; degraded write-primary DB + queue node compose correctly. Integration: solvability 57/57 after authoring + re-tune.

**Effort:** XL. **Risk:** Adding `concurrency_limit` to the engine before YAMLs author values lets `leanResize` pick low-concurrency variants the gate sheds — mitigated by the strict (1)→(4) order with 57/57 asserted at each step.

---

## 3. Phase 3 — Resilience as a real subject

> Order within phase: ED2 first → EN7 layered on the surviving fraction → restore-redundancy → ED3 alongside the builder rework. EN6 must already be landed (see §4).

### Gap 3.1 — ED2: Fractional AZ outage (the precondition)

**Spec summary (corrected).** Today `az_outage` kills 100% of a category (every node force-offline), so multi-AZ spreading buys nothing. Give each SimNode an `azCount` and remove a **fraction (1/azCount)** of the targeted category per node, so a node spread across N AZs survives at (N−1)/N capacity. **Dependency: none** (ED2's self-declared `[EN3,EN7]` is inverted — ED2 enables them). Implement first in Phase 3.

**TypeScript + runtime safety (corrected).** Make `capacityFactors` **OPTIONAL** on `TickOverrides` (`capacityFactors?: Map<string,number>`) so the two existing test literals (`simulationEngine.test.ts:244, :255`) keep compiling. In `simulateTick` use **double optional-chaining**: `const capFactor = overrides?.capacityFactors?.get(id) ?? 1`. Verify with `npm run build` (tsc -b).

**azCount source scoped (corrected — read-only tiers can't spread).** `azCountForReplicas(replicaCount) = min(MAX_AZ_COUNT=3, max(1, replicaCount))`. **Document explicitly** that read-only-scaling tiers (data-storage/search, `replicaType:'read-only'`) have `replicaCount` pinned to 1 by the lean builder and split (not multiplied) by the redundant builder, so they stay azCount=1 → survFrac 0 → all-or-nothing. **Drop the "sharded DB at azCount 2 serves half" test-plan claim** — neither reference builder can produce it. ED2 makes spreading meaningful only for full-scaling sync-path tiers (compute). Alternatively, if data-tier spreading is required, derive azCount from the count of PARALLEL same-category nodes (what `buildRedundantSolution` produces) instead of per-node `replicaCount`.

**Uncapped-node path (corrected).** When `effCap` derives from `effectiveMaxRps=0` (uncapped) AND a `capacityFactor<1` is present, preserve today's offline behavior (served 0, capacityPercent 1 when incoming>0) rather than letting it pass through the uncapped `else` branch as fully alive. Add a test for an uncapped target-category node.

**async-backbone caveat (corrected).** ED2 does NOT close async-backbone's hint/engine contradiction — its messaging tier carries ~0 traffic in the reference build, so a fractional outage sheds ~nothing and uptime barely moves. Annotate async-backbone's recalibration as "no uptime movement expected" and flag the residual gap for EN3/redundancy work.

**Exact files/functions.** `simulationTypes.ts` (`SimNode.azCount?`, `TickOverrides.capacityFactors?`); `constants.ts` (`MAX_AZ_COUNT=3`, `azCountForReplicas`); `architectureStoreHelpers.ts` `buildSimGraph` (spread azCount when >1); `simulationEngine.ts` `computeOverrides:98-99` (write surviving fraction `(azCount-1)/azCount` into `capacityFactors`, `effCap=effectiveMaxRps×capFactor` used in all capacity branches) + **update the `computeOverrides` JSDoc at :68-69** to describe the fractional model.

**Re-calibration step.** Cover **all 7** az_outage challenges (corrected count): `08-zone-failure, 10-chaos-day, 19-edge-resilience, 23-async-backbone, 29-fortress, 33-production-ai, 52-heat-death`. Outages get MORE survivable when spread, so raise uptime targets toward the new harness-measured floor where the lean (single-node) candidate now fails the tightened bar but the redundant candidate survives — but note this only works for **compute-outage** challenges; data-storage/delivery-network outages can't be tightened via spreading. Golden: synthetic `meetingStats`, immune to engine change — moves only on YAML target edits.

**Test plan.** Unit: `azCountForReplicas` (1→1, 2→2, 3→3, 20→3, 0/neg→1); `computeOverrides` writes `capacityFactors` not `offlineNodeIds`, azCount-3→0.667, azCount-1→0; stacking multiplies; capped compute node effCap=1000×0.667 serves 667 (was 0); uncapped target-category node stays offline. Integration: single-AZ build FAILS tightened uptime while redundant PASSES.

**Effort:** L. **Risk:** Raises achievable uptime so existing targets stay clearable — break risk is the opposite (loss of difficulty); re-tune one challenge at a time, require a redundant candidate ≥3★ before committing.

### Gap 3.2 — EN7: Observability earns its keep (severity model)

**Spec summary (corrected).** Replace the magic `MONITORING_RECOVERY_FACTOR=0.67` with a detect→circuit-break→blast-radius model: monitored coverage sets a detection delay + residual blast fraction. Land AFTER ED2; EN7 severity multiplies ON ED2's surviving fraction (no double-discount) — and the algorithm text must describe az_outage as ED2's fractional model, not the old binary "every node of category".

**az_outage relief is mostly compute-only (corrected — scope honestly).** Monitored az_outage damping fires only for categories whose nodes have a monitoring neighbor in the build. The reference builder links observability ONLY to `primaryCompute` (`referenceSolution.ts:254-255`), so in harness builds only **compute-outage windows** of monitored challenges (chaos-day, fortress, production-ai, zone-failure) get damped. data-storage/caching/delivery-network outages (heat-death) get zero relief. To extend relief, either link observability to data/cache tiers in the builder OR redefine `monitored(category)` so observability-present grades the whole architecture. State the chosen scope; do not claim "all 6 az_outage challenges gain relief."

**Partial-severity composition (corrected — preserve E2/E5 branches).** Do NOT replace the `process()` if/else cascade with a single `served` formula. Compute base served via the EXISTING branch logic (writeRatio split / queue backpressure / plain capped) on full incoming, then apply shed: `served_final = base_served × (1−severity)`, `failed = incoming − served_final`. This preserves write-primary bottleneck and queue semantics for degraded nodes. Add a unit test for a degraded write-primary DB and a degraded queue node.

**Golden regen is a no-op (corrected).** Re-tuning numeric targets does NOT change the snapshot (`meetingStats` meets whatever target is authored). Re-run the golden to confirm PASS; no `.snap` regen needed unless a target FIELD is added (avoid that in the YAML re-tune).

**"Strict generalization" reframed (corrected — it's only a downtime-integral match).** The old code shortened the window (node fully recovers at 0.67×durationS); the new model keeps the node at `residual` severity until full durationS (never fully recovers early). Setting detectDelay=0/residual=0.67 gives a DIFFERENT per-tick uptime profile. State the equivalence as a downtime-**integral** match only; the regression test asserts the integral, not byte-identical `offlineNodeIds` per tick.

**Constants re-baselined (corrected).** To keep monitored finite-window downtime ≈ today's 20s over a 30s window with the 5s-full + residual model: `residual ≈ (20.1−5)/25 ≈ 0.60`, not 0.5. If 0.5 is chosen deliberately (more rewarding), acknowledge monitored challenges get easier and rely on the harness to raise targets. Drive the final residual from the all-57-3★ re-tune loop. `OBS_DETECT_DELAY_S=5`.

**EN3 dependency resolved (corrected).** EN7 as specified is standalone; either remove EN3 from its declared dependencies, OR add an explicit hook feeding EN3's circuit-breaker signal into `detectDelay`/`severity`. Pick one — as written the EN3 dep is unused.

**Exact files/functions.** `simulationEngine.ts` `computeOverrides` (generalize `monitoredNodes` to per-category coverage; delete `MONITORING_RECOVERY_FACTOR`; add `effectiveOutageWindow(event,timeS,coverage)` → `{active, severity}`; emit severity-1 to `offlineNodeIds`, partial to new `outageSeverity` map) + `simulateTick.process()` (severity branch); `simulationTypes.ts` (`TickOverrides.outageSeverity?`); `constants.ts` (`OBS_DETECT_DELAY_S`, `OBS_RESIDUAL_BLAST`); `40-observe-to-recover.yaml` (re-tune + reframe prose from "33% faster/20s" to detection-delay framing) — but see restore-redundancy/observe-to-recover structural note below.

**Effort:** M. **Risk:** A too-aggressive residual could trivialize or over-harden outage challenges; both constants are the single tunable surface — drive from the harness, start conservative (5s/0.60).

### Gap 3.3 — restore-redundancy: no-SPOF redundancy back into scoring

**Spec summary (corrected).** Reverse the D72 redundancy demotion now that ED2 makes spreading meaningful. **Strongly prefer the separate-metric route** (a `resilienceEarned` boolean + optional 0–1 resilience score, ZERO star-math change) over the gated-3rd-star-modifier route. The modifier route re-opens the exact budget-vs-redundancy tension D72 escaped for tight-budget challenges and requires per-challenge budget re-tuning that conflicts with their pedagogy. The separate-metric route delivers the roast's ask ("restore redundancy to the topology star OR a metric") with no harness-break risk.

**Predicate scoped to az_outage only (corrected).** `challengeExercisesOutage = scheduledEvents.some(e => e.type==='az_outage')` — **drop `component_failure`**. ED2 only fractionalizes the az_outage branch; component_failure is single-node and ED2 doesn't make redundancy meaningful for it. This also removes the two pure-`component_failure`, tight-budget, wrong-target cases (observe-to-recover, rag-retrieval) from the blast radius.

**component_failure target bug (corrected — must know before relying on it).** In `40-observe-to-recover.yaml` and `32-rag-retrieval.yaml` the `component_failure` target is a CATEGORY string (`compute`/`data-storage`) but `computeOverrides:97` treats it as a node id (`offlineNodeIds.add('compute')`) — which matches NO node (`n-compute`). The failure is a mechanical no-op against the reference build. Do not gate scoring on surviving an outage that sheds nothing.

**Complete az_outage set (corrected).** If keeping any modifier path, enumerate ALL 7 az_outage challenges (08, 10, 19, 23, 29, 33, 52) with per-challenge budget-fit verification (node count ≤50, perCopyReplicas ≤20, redundant-build cost ≤budgetCap) — not the 5 the spec copied from PLAN.

**Count fix (corrected).** There are **57 challenges**, not "41 built-ins". The golden invariant holds: every challengeExercisesOutage row passes `advisoryTopologyCount=0` (default), so `(challengeExercisesOutage ? redundant : true)` → `redundant=true` → topologyStar unchanged → snapshot green. State this as the proof.

**advisory===0 not assumed (corrected).** Do NOT assume `buildRedundantSolution(c,2)` drops advisory to 0. Tarjan articulation-point detection on a bipartite multi-tier graph with a single traffic source / single DB-without-LB may still flag missing-hop or replicas-without-lb. Measure `countTopologyIssues(evaluateTopology(...))` per az_outage challenge (especially multi-region heat-death) as a focused test.

**Exact files/functions.** `rubricScorer.ts` (`redundant = advisoryTopologyCount===0`; `resilienceEarned = basePass && redundant && challengeExercisesOutage`; the default `stars` sum stays byte-identical); `challengeTypes.ts` (`StarBreakdown.resilienceEarned`, keep narrow `legacy()` tuple); `topologyChecker.ts` (reuse advisory, or add `countResilienceIssues` for SPOF-only); `ChallengeResultsModal.tsx` (resilience badge copy); `referenceSolution.ts` (prefer redundant build for az_outage challenges if modifier route).

**Re-calibration step.** Run the harness with the redundant candidate forced for each of the 7 az_outage challenges; record stars/cost/node count/maxReplica; pre-compute required budgetCap bumps from the lean+redundant measured cost (fortress budget 3000 is the canary). Block behind ED2 landing + a green solvability run.

**Effort:** M. **Risk:** Unconditional re-fold breaks the golden + tight-budget 3rd stars (the D72 regression); separate-metric route avoids it entirely.

### Gap 3.4 — ED3: required_types must be ON the served path

**Spec summary (corrected).** Today `hasAllRequiredTypes` checks only presence (a disconnected block satisfies it). Change the gate to require each non-async required type to be **directed-reachable from a traffic-source** through the frozen `topologyGraph`, with async tiers (messaging + real-time categories) exempt. The hard constraint (D76): scorer's on-path exemption and builder's off-path wiring read ONE shared classifier `isOnPathExempt(typeId)`. Land alongside the builder rework. **No engine re-calibration ripple** (structural gate).

**The `security` harness-break (corrected — the critical missed gap).** The `security` required type (category `monitoring`, NON-exempt) appears in `28-siem-audit, 29-fortress, 38-defense-in-depth`. The builder gives `security` NO on-path wiring — the orphan-eliminator wires it as `security→sink` (zero directed incoming = off-path). Under ED3 it reads as not-reachable → `hasAllRequiredTypes` false → **0 stars** for 28/29/38. **Fix:** the builder's on-path pass must be **category-agnostic** — for EVERY placed required type `t` with `!isOnPathExempt(t)` and zero directed incoming, link it INTO the spine via `link(primaryCompute, id(t))` (primaryCompute is always reachable; mirrors the observability wiring at :255). Do NOT restrict the pass to only 'compute' and 'edge' types as the original spec said.

**Entry-node citation corrected.** The entry rule mirrors `simulateTick`'s **inflow seeding** (`simulationEngine.ts:132-151` — restrict to in-degree-0 traffic nodes when any exist, else even-split all in-degree-0), **NOT** `findEntryNodes` (which returns all in-degree-0 unconditionally). Assert parity against the traffic-carrying set.

**Census corrected.** 9 challenges carry an exempt required type (06, 12, 13, 20, 21, 22, 23, 31, 39); message-queue in 06/12/13/20/23/31/39, event-stream in 20/21/23, realtime in 22/23. The 3 non-exempt-`security` challenges (28, 29, 38) are the real harness-break candidates needing the builder on-path pass.

**challengePar corrected.** `challengePar.test.ts` calls `buildClearingSolution` (not `buildLeanSolution`), which routes through `evaluateAttempt` WITH the frozen topologyGraph — so it IS subject to the new gate. Add `npx vitest run tests/integration/challenges/challengePar.test.ts` to the test plan; confirm `challengePar.generated.json` doesn't need a commit-changing regen.

**Exact files/functions.** `componentTypes.ts` (`ASYNC_OFFPATH_CATEGORIES = {messaging, real-time}`, `isOnPathExempt(typeId)`); `rubricScorer.ts` (`requiredTypesOnPath(graph, requiredTypes)` — directed BFS from traffic entries; rewrite `hasAllRequiredTypes:75-76` with `topologyGraph ? requiredTypesOnPath(...) : canvasTypeIds presence` fallback for the golden's no-graph path); `referenceSolution.ts` (category-agnostic on-path pass for non-exempt required types + guard comment on worker/stream-processor staying on-path).

**Test plan.** Unit: orphan non-exempt type → FALSE; wired → TRUE; exempt leaf → TRUE; worker leaf-unreachable → FALSE; worker on-chain → TRUE; `topologyGraph` undefined → presence fallback (golden-compat); `isOnPathExempt` truth table. Regression: for EVERY built-in with a non-exempt required type (incl. security 28/29/38), `buildClearingSolution`'s frozen graph has that type directed-reachable from a traffic entry. Integration: solvability 57/57; golden no diff.

**Effort:** M. **Risk:** Scorer/builder on-path definitions diverging → harness red on messaging/security challenges; single shared `isOnPathExempt` + the category-agnostic builder pass mitigate it.

---

## 4. Phase 4 — New dimensions

> EN6 FIRST (unblocks EN3 retroactively, pure correctness). ED5/ED9/EN5 independent. ED6/EN4/ED8 last (XL).

### Gap 4.1 — EN6: Fixed-point cyclic-flow solve (do first; closes PENDING D7)

**Spec summary (corrected).** Replace the "process cyclic nodes once without forwarding" hack with a damped fixed-point inflow solve so cycle members forward their served-minus-absorbed traffic. **Dependency: none** (declared `[EN3]` is inverted — EN6 unblocks EN3). Closes D7's `totalServedRps` overcount on DAG-feeds-cycle topologies.

**Do NOT change the `totalServedRps` formula (corrected — the single biggest hazard).** The proposed `min(targetRps, Σ(served−forwarded))` is NOT byte-identical on DAGs with queue-buffering nodes: buffered traffic is served-but-not-forwarded AND not terminal (it sits in `node.queueDepth`). Counterexample from existing `interactionCapacity.test.ts` (cache+queue+worker): `Σ(served−forwarded)=4000` but the build absorbs the full 5000. **Recommendation: KEEP `totalServedRps = max(0, targetRps − totalFailedRps)` (`:280`) verbatim.** Once the fixed-point makes cycle members forward correctly, `totalFailedRps` is correct on cycles, so the existing formula is also correct — the formula change is unnecessary for the D7 fix and is what risks the queue tests.

**Per-iteration purity (corrected).** `process()` mutates `node.queueDepth` in place (`:220`). Each fixed-point pass must reset `node.queueDepth` (and the inflow map) to the tick's seed state at pass start, so re-running N times equals the converged single computation. Rebuild inflow each pass from `entrySeed + accumulated retried/forwarded deltas` into a FRESH map — never add forward `perOut` onto the prior pass's already-accumulated inflow (geometric compounding). Add a divergence guard on forward inflow, not just the retried delta.

**Convergence claim softened (corrected).** `served_i` is non-expansive (Lipschitz ≤1), so damped iteration `x ← x + d×(F(x)−x)` with d<1 cannot diverge, is exact in one pass on DAGs, and is bounded by `MAX_FLOW_PASSES` on cycles (the hard cap prevents any hang). Drop the "provably converges / guaranteed contraction" framing — a genuine 1-Lipschitz cycle can have spectral radius 1.

**Per-out-EDGE forwarding (corrected).** Preserve division by out-EDGE count (including duplicate edges), NOT distinct out-degree — `simulationEngine.test.ts:135` (duplicate-edge, b receives 100) depends on it.

**Exact files/functions.** `simulationEngine.ts` `simulateTick` (delete Kahn order/cyclic split + D7 self-flag; split `process` into pure `served(node,incoming,overrides)` and `forwardOut(id,served)`; add `solveInflow(graph,entrySeed)` damped loop; run ONE telemetry+side-effect pass post-convergence); `constants.ts` (`MAX_FLOW_PASSES=12`, `FLOW_EPSILON=1e-3`, `FLOW_DAMPING=0.7`).

**Re-calibration step.** ZERO target movement — there are zero cyclic topologies in the 57 challenges or the DAG reference builder, so all 57 stay 3★ byte-identically and golden is untouched. Pure additive correctness fix.

**Test plan.** Keep all DAG conservation tests green byte-identically. **Add `interactionCapacity.test.ts` + `queueBackpressure.test.ts` to the explicit byte-identity regression set** (the original spec omitted them — they're the ones that break under a formula change). Cycle test: a↔b asserts `totalServed+totalFailed ≈ targetRps` and b.incomingRps>0. DAG-feeds-cycle: no overcount. Divergence guard: self-loop terminates within MAX_FLOW_PASSES. **Multi-tick queueDepth invariant:** run full `runSimulation` (50 ticks) asserting the side-effect body ran once-per-tick (a per-iteration-mutation bug corrupts depth cumulatively and a single-tick determinism test would NOT catch it).

**Effort:** L. **Risk:** LOW if `totalServedRps` formula is left unchanged; the queueDepth-once invariant is the sharpest hazard — covered by the multi-tick test.

### Gap 4.2 — EN3: Cascading failure (retry amplification) — needs EN6 first

**Spec summary (corrected).** When a downstream tier sheds, shed RPS propagates UPSTREAM as timeouts re-offered with a retry multiplier (thundering-herd), inflating upstream incoming. A monitoring/rate-limiter neighbor damps the multiplier. Built on EN6's fixed-point solver.

**Trigger gated to outages (corrected — resolve the contradiction).** Gate cascade **strictly to ticks where `overrides` is defined AND an offline/degraded node exists** (overrides are only built when `scheduledEvents.length>0`, `simulationEngine.ts:302`). Rewrite the algorithm trigger from blanket "failedRps>0" to "for each OFFLINE node T, and each node downstream of an offline node whose failedRps>0". This preserves the byte-identical guarantee for the 48 non-outage challenges. (Alternatively, if always-on: DROP the byte-identical claim and re-tune every high-traffic challenge whose lean/max build sheds at peak — pick one and make it self-consistent.)

**40-observe-to-recover needs redesign BEFORE EN3 (corrected — structurally unclearable).** 30s `component_failure` on compute over 90s, uptime target 80%, budget 200, palette lacks cdn/cache. Deleting `MONITORING_RECOVERY_FACTOR` makes max uptime = 60/90 = 66.7% (no fronting tier can serve through the outage; the lean builder can't add cdn/cache). The D75 auto-retune CANNOT fix this. Redesign before landing: add cdn+cache to `available_blocks`, OR change the lesson to a multi-compute+rate-limiter topology where breaker damping on a surviving path crosses 80%, OR lower the target below 66.7% and rewrite the brief. Also: its `component_failure` target is the category string `compute` — fix target resolution.

**Idempotent passes + inflow reset (corrected).** Same as EN6 — reset `node.queueDepth` and inflow to seed each pass; accumulate retries into a SEPARATE `retriedInflow` map added to a freshly-seeded inflow. Stop condition guards forward-inflow divergence, not just the retried delta.

**totalServedRps conservation (corrected).** A retry of an already-failed request is NOT a new lost request. Replace `max(0, targetRps − totalFailedRps)` accounting so retried-induced `failedRps` cannot exceed the ORIGINAL offered load — define uptime in terms of original demand served vs lost, counting retried timeouts as part of the SAME failed request. Otherwise uptime double-penalizes.

**No 'circuit-breaker' type exists (corrected).** `componentTypes.ts` has `rate-limiter` and `auth` under auth-security but NO `circuit-breaker`. Match breakerNodeIds on `monitoring` category + `rate-limiter` type only (drop circuit-breaker), OR add a real circuit-breaker component type (componentTypes + provider YAML + schema) if it's meant to be placeable.

**leanResize cascade-awareness (corrected).** `leanResize` runs the sim ONCE on the non-shedding pass-1 graph; after resizing down, the lean graph's tighter capacity produces more retries it never re-measures. Either re-run the sim on the lean graph and iterate the resize until peak load stabilizes (small pass cap), OR document the max-capacity fallback as the real outage-survivor and verify each of the 9 outage challenges clears 3★ via the MAX candidate within budget + MAX_REPLICAS first.

**Exact files/functions.** `simulationEngine.ts` (`simulateTick` retry-augmented fixed-point on EN6's worklist; `computeRetryInflow` helper; extend `computeOverrides` with `breakerNodeIds`); `simulationTypes.ts` (`TickOverrides.breakerNodeIds`, `NodeTelemetry.retriedRps?`); `constants.ts` (`RETRY_MULTIPLIER=2`, `RETRY_DAMPED_MULTIPLIER=1.1`, `RETRY_MAX_PASSES=6`, `RETRY_CONVERGENCE_EPS=1`); `simulationStats.ts` (`peakRetriedRps?`); `referenceSolution.ts` (breaker neighbor for scheduledEvents challenges).

**Re-calibration step.** Add explicit per-challenge expected post-EN3 uptime/p99/p95 to the spec by RUNNING the harness for all 9 outage challenges (08, 10, 19, 23, 29, 32, 33, 40, 52) — not "lower the YAMLs until 3★". heat-death (budget 120000, uptime 60) is the canary: prove the capped reference clears under budget with cascade active.

**Test plan.** Unit: linear traffic→A→B, B offline ⇒ A's inflow grows, A sheds (cascade up); +monitoring ⇒ damped 1.1× and A survives; fan-in apportions failure proportionally; healthy DAG ⇒ retriedRps=0 byte-identical; EN7-removal ⇒ outage window = authored durationS. Integration: solvability 57/57 after re-tune; results modal names the retry-overloaded upstream (LX2 path).

**Effort:** L (engine) but gated on EN6 + 40-observe-to-recover redesign. **Risk:** HIGH on the outage subset; the 40-observe-to-recover structural break and the conservation identity are the must-fix items.

### Gap 4.3 — ED5: Dynamic cache hit-ratio (DEFERRED until builder is workload-aware)

**Status (corrected):** the verifier found this **infeasible as specified** — the "defaults compose to identity" guarantee is FALSE for the harness. Do NOT ship as written.

**Why it breaks (corrected).** The reference builder NEVER sets `data.trafficWorkload` on RefNodes, so `buildSimGraph` (`architectureStoreHelpers.ts:494`) computes `writePressure=0.5` for EVERY challenge with a traffic source (all 57). The formula `effective = ceiling × frac × (1−writePressure) × erosion` then HALVES every cache/CDN effective hit ratio in ALL 57 builds, doubling forwarded miss traffic across the board. Separately, `cacheErosion` (derived from `trafficKind`) can NEVER reach the harness because RefNodes carry no `trafficKind` — so search/periodic erosion is structurally invisible to the 57-challenge harness and the E2E fixtures.

**Required corrections before this is feasible.**
1. Decouple harness from writePressure derating: either gate the `(1−writePressure)` factor to fire only when writePressure came from an EXPLICIT write/read source (buildSimGraph must distinguish "no workload data" from "mixed"), OR propagate each challenge `trafficSource.workload` onto the traffic-source RefNode in `referenceSolution.ts`.
2. Wire `trafficKind` onto the RefNode + `buildSimGraph` node-data type, or state explicitly that `cacheErosion` only affects the live canvas path and teaches nothing through the scored harness.
3. Add `clamp01` (or reuse `clamp(x,0,1)`) — no `clamp01` exists in src/.
4. Specify the `:245` miss-latency guard rewrite: keep `cacheHitRatio !== undefined && < 1` testing the CEILING for the fast-path, compute `h = effective`, apply `missLatencyPenaltyMs×(1−h)` only when `h<1`; regression-assert a ceiling-1.0 cache with no graph fields still pays zero penalty (`cdnBifurcation.test.ts:57-61`).
5. Re-scope risk to HIGH/broad: derating hits every cache/CDN front tier in every build (writePressure≈0.5 everywhere), so expect MOST of the 57 to need re-tuning, and verify ED7 cost-star impact (raised downstream sizing → higher totalCost → costPerRequest gate) on every challenge, not just latency.

**Three bisectable steps (corrected).** (1) plumbing with derating DISABLED (factor forced to 1) proving zero shift; (2) enable derating only on the live canvas path, harness stays on ceilings (via the workload-source distinction), confirm 57 green; (3) opt challenges in individually via authored `cacheable_fraction`, re-green per challenge.

**Files.** `challengeSchema.ts` (`cacheable_fraction`), `challengeTypes.ts`, `simulationTypes.ts` (`SimGraph.cacheableFraction?`, `cacheErosion?`), `architectureStoreHelpers.ts` (`cacheErosionForKind`, workload-source distinction), `simulationEngine.ts` (`effectiveCacheHitRatio`).

**Effort:** L (engine) + the workload-plumbing fix. **Risk:** HIGH — do not implement until steps (1)→(3) and the writePressure-source distinction land.

### Gap 4.4 — ED9: Autoscaling (replicas track load; cost integrates over the curve)

**Spec summary (corrected).** Opt-in `autoscale` variant flag: a node's active replicas track per-tick load (capped at provisioned ceiling), and flat `monthlyCost` is replaced by cost INTEGRATED over the curve. Bursty challenges reward elasticity. Default-off so the 57 + golden stay byte-identical. **Soft sequencing dep on ED5** (shared files only — no data dependency).

**Integrated-cost function pinned (corrected — resolve the telemetry contradiction).** `computeIntegratedArchitectureCost(nodes, ticks)`: `if (!nodes.some(isAutoscale)) return computeTotalArchitectureCost(nodes)` (exact static short-circuit — bit-for-bit equality on the legacy fleet). ELSE per-node: non-autoscale → flat `getNodeCost().monthlyCost`; autoscale → `mean over ticks of (telemetry.activeReplicas × perReplicaMonthlyCost)`. Do NOT define it as "mean of totalTickCostMonthly" UNLESS you also spread `perReplicaMonthlyCost`/`replicaCount` onto EVERY SimNode (not just autoscale ones) — otherwise non-autoscale `tickCostMonthly` is uncomputable. Pick one and make schema/spread consistent.

**Discount ratios reframed as measurement-driven (corrected).** Drop the "≈0.55× periodic / ≈0.37× search" claims as load-bearing — they're continuous-load averages, but `activeReplicas = clamp(ceil(incoming/m), 1, R)` rounds UP every tick and floors at 1, so the discrete integrated cost is systematically HIGHER (R=2 periodic is far above 0.55×). Compute the expected integrated cost for the planned R from the harness; tune the new challenge's `cost_per_request` from harness output.

**Ramp contamination (corrected).** The sim curve ramps 0→peak; averaging `tickCostMonthly` over ALL ticks (incl. near-zero leading ticks where activeReplicas floors at 1) drags integrated cost below steady-state while the denominator uses `peakCurveRps`. Either average only over ticks at/above a load threshold, or use a steady `traffic_curve` for elasticity challenges, so the discount is the elasticity discount, not a ramp artifact.

**Cost denominator alignment (corrected).** `scoreBuild` (`referenceSolution.ts:412`) and `scoreAttempt` (`challengeStore.ts:77`) compute `costPerRequest` with `peakCurveRps(c.trafficCurve)` (legacy curve) while the sim runs `challengeCurve(c)` (from trafficSources). For new bursty autoscale challenges these peaks differ. Either author `c.trafficCurve` so its peak == `challengeCurve(c)` peak, or change BOTH scorers to `peakCurveRps(challengeCurve(c))` consistently (separately tested — touches live scorer + harness identically; risk if they diverge).

**Latency narrative corrected.** Drop "ρ stays near 1 so latency rises if under-provisioned." Today's `latencyUnderLoad` only rises when `capacityPercent>1`; a correctly-ceilinged autoscale node at ρ≈1 has unchanged latency. The "autoscaling has a max" lesson manifests only as shedding when `R < ceil(peak/m)` — identical to a static node. (Defer the latency-teaching aspect to ED4 if needed.)

**SimNode field hygiene (corrected).** For autoscale nodes derive `tickEffectiveMaxRps = activeReplicas × perReplicaMaxRps` WITHOUT reading `effectiveMaxRps` (watch `Math.floor` in getNodeCost vs `ceil` here); assert when incoming forces `activeReplicas==R` the served/failed equals the static node within 0.

**Files.** `componentSchema.ts` (`autoscale?`), `architectureStoreHelpers.ts` (`NodeCostInfo` fields, `computeIntegratedArchitectureCost`), `simulationTypes.ts`, `simulationEngine.ts` (per-tick activeReplicas gated behind `node.autoscale===true`), `simulationStats.ts` (`integratedMonthlyCost?`), `referenceSolution.ts` (integrated cost in scoreBuild + autoscale tie-break for bursty), `useChallengeAutoScore.ts`.

**Re-calibration step.** Default-off → zero shift on 57 + golden. Recalibration is opt-in: tag 1-2 compute variants `autoscale:true`, author 1-3 new elasticity challenges with cost targets tuned so a peak-provisioned fixed fleet FAILS but autoscaled PASSES (driven by harness measurement, not the 0.55×/0.37× assumption).

**Effort:** L. **Risk:** MEDIUM — the integrated-cost short-circuit guards legacy equality; the cost-denominator mismatch is the live-scorer hazard.

### Gap 4.5 — EN5: Usage-based cost (per-request + per-GB cross-region egress)

**Spec summary (corrected).** Opt-in usage layer on top of capacity cost: per-million-requests fee + per-GB cross-region egress, computed from served volume, folded into `totalCost`. Default-off so 57 + golden stay byte-identical.

**Traffic-source casing bug (corrected — critical).** `TrafficSourceYamlSchema` is `.object({...}).strict()` with NO per-source `.transform`; the top-level transform passes sources through verbatim. Adding snake_case `egress_gb_per_request`/`cross_region_share` while the algorithm reads camelCase `egressGbPerRequest`/`crossRegionShare` makes egress ALWAYS 0 (silent `undefined`). **Fix:** add a `.transform` to `TrafficSourceYamlSchema` mapping snake→camel; add a round-trip test asserting `parsed.trafficSources[0].egressGbPerRequest` is defined.

**Constant import fix (corrected).** `MAX_MONTHLY_COST` is exported from `src/schemas/componentSchema.ts`, NOT `@/lib/constants`. Import it from componentSchema or add it to constants — the schema edit won't compile otherwise.

**scoreAttempt signature position pinned (corrected).** Append `ticks?: TickState[]` as the FINAL (7th) positional param, AFTER `bottleneck`, defaulting to `[]`. Update `useChallengeAutoScore.ts:81` to pass `ticks` 7th. Add a regression test that existing 3-arg and 6-arg positional callers stay byte-identical (usageCost 0).

**Resolve the two-model mismatch (corrected — the pedagogy hazard).** `computeUsageCostForAttempt` bills egress on system-wide `totalServedRps` (cache-INSENSITIVE — adding a cache doesn't reduce completed requests), but the lean-builder marginal `usageCostFor(load)` uses post-cache `incomingRps×(1−hitRatio)` (cache-SENSITIVE). The "add cache to cut egress" lesson is NOT produced by the scoring formula. **Fix:** EITHER (a) compute attempt-level egress on a cache-aware per-node quantity (rps EMITTED by the front/edge tier returning the response) so caching genuinely lowers billed egress; OR (b) drop the cache-cuts-egress pedagogy and bill a flat per-request + fixed cross-region tax on `totalServedRps` that caching can't dodge (then the lean comparator must bill on `totalServedRps` too). Scorer and lean comparator MUST use the same quantity.

**Blend divide-by-zero guard (corrected).** When `Σ rps_s ≤ 0`, return usageCost 0. Unit-test the all-zero-rps and single-degenerate-source cases.

**Golden role corrected.** The golden proves `evaluateAttempt` byte-identity (call-site folding), NOT the usage path — it calls `evaluateAttempt` directly with `totalCost=c.budgetCap`, never through scoreAttempt/scoreBuild. The real tripwires for the usage/lean changes are `solvability.test.ts` (57 @ 3★) and `challengePar.test.ts` (par freshness — will fail needing `UPDATE_PAR=1` if the comparator gating isn't byte-identical for the 57; make it an intentional tripwire).

**Files.** `challengeBudget.ts` (`computeUsageCost`, `monthlyServedRequests`), `challengeTypes.ts`, `challengeSchema.ts` (the `.transform` fix + `usage_rates`), `architectureStoreHelpers.ts` (`computeUsageCostForAttempt`), `challengeStore.ts` (`scoreAttempt` 7th param + `effectiveCost`), `useChallengeAutoScore.ts`, `referenceSolution.ts` (usage-aware `scoreBuild`/`leanResize`/`pickCheapestVariant` with `usageRates !== undefined` early-return so the 57 stay byte-identical).

**Re-calibration step.** Built-ins: zero shift (no `usage_rates`). New egress-dominated challenges authored with usage rates + per-source egress; the usage-aware lean builder picks the cheapest TOTAL build; author tunes budget/cost_per_request above the harness-reported `effectiveCost`.

**Effort:** L. **Risk:** MEDIUM — the casing bug and the scorer-vs-lean model mismatch are the must-fix items; `challengePar.test.ts` is the drift tripwire.

### Gap 4.6 — ED6/EN4/ED8: Multi-region latency + replication lag + consistency/CAP dimension (the XL one)

**Spec summary (corrected).** Three coupled layers: (a) cross-region traffic pays a coarse RTT penalty; (b) read-replica scaling gets a quantified staleness signal rising with write-pressure + fan-out; (c) a NEW optional `consistency` scoring gate + `consistency_target` knob + a small consistency-vs-availability challenge family. Additive/defaulted so the 57 + golden stay byte-identical. **Soft deps:** ED1/EN1 (path-sum), ED9, EN5.

**Threading target corrected (the parity-break).** `useChallengeAutoScore` does NOT call `buildSimGraph` — it reads finished `ticks`. The app's challenge sim graph is built in `src/components/challenges/ChallengeStartButton.tsx` `onStart()` (`buildSimGraph(nodes,edges)` → `startSim`). Pass `{crossRegionRttMs, multiRegion}` THERE (derived from `challenge`), AND in `referenceSolution.ts` BOTH `leanResize:316` and `scoreBuild:394`. Add an assertion that app-path and harness-path produce identical stats for a multi-region challenge (proves no oracle drift).

**RTT exclusion by CATEGORY (corrected — SimNode has no typeId).** The engine processes by `SimNode.category`; there is no typeId on SimNode and cdn/dns/load-balancer/api-gateway are ALL `delivery-network`. Express the rule by category: pay `crossRegionRttMs` on hops whose category ∈ {compute, data-storage, search, messaging, real-time} (equivalently: NOT in {traffic, delivery-network, caching}). Drop the unimplementable `{cdn,dns,cache}` type-id wording.

**No auto-default RTT (corrected — protects the 7 existing multi-region challenges).** Do NOT auto-apply any RTT to a challenge that doesn't explicitly author `cross_region_rtt_ms`. `buildSimGraph` sets `graph.crossRegionRttMs` ONLY from the authored value (undefined when absent); the engine gate (`crossRegionRttMs !== undefined && multiRegion`) keeps all **7** existing multi-region challenges (follow-the-sun, planet-scale, production-ai, heat-death, the-singularity, maxwells-demon, thundering-herd — NOT 11) byte-identical. Remove the "DEFAULT used when a multi-region source is present" clause. New consistency-family challenges author RTT explicitly.

**Staleness fanout bounded (corrected — can explode to ~2200ms).** `readFanout = readServed/baseMaxRps ≈ replicaCount` (up to 20), and `(1+writeRatio×REPLICA_LAG_WRITE_K)=2.2×` at write_ratio 0.3 → base 50ms × 2.2 × 20 ≈ 2200ms for a normal scaled read-replica build, making any tight target unbeatable. Either clamp the fanout contribution (log, or a capped multiplier) or base fanout on read-SHARE of the split, not raw replica-scaled capacity. Provide the EXACT worked example showing the reference build's `maxStalenessMs ≤ consistencyTargetMs` at the chosen replica count BEFORE authoring the YAMLs.

**Staleness branch entry condition (corrected).** The staleness block lives in the write/read-split branch which only runs when `node.writeRatio !== undefined && > 0 && capped`. State explicitly that consistency-family DB variants MUST author `write_ratio>0`, and name the specific low/zero-`replicationLagMs` primary-read variant the builder picks (don't leave "prefer low-lag" to inference — `replicationLagMs` is a new field nothing authors yet, and `writeDistribution` is per-provider, not per-variant-choosable).

**Count + golden corrected.** Replace every "41 built-ins" with "all 57". `meetingStats` patch sets `maxStalenessMs = consistencyTargetMs ?? 0` (default 0 for the 57 that omit it). Run the golden WITHOUT `-u` first as the gate — an unexpected diff must FAIL (the spec's "run with --update to confirm" was backwards). `consistencyOk` is outside the `legacy()` whitelist so the snapshot stays byte-identical.

**Files.** `simulationTypes.ts` (`SimNode.region?/replicationLagMs?`, `SimGraph.crossRegionRttMs?/multiRegion?`, `NodeTelemetry.stalenessMs?`), `simulationEngine.ts` (category-based RTT term + bounded staleness in write/read split), `simulationStats.ts` (`maxStalenessMs?`), `challengeSchema.ts` (`consistency_target_ms`, `cross_region_rtt_ms` — no auto-default), `challengeTypes.ts` (`consistencyTargetMs?`, `crossRegionRttMs?`, `StarBreakdown.consistencyOk`, `MeasuredAttempt.maxStalenessMs?`), `rubricScorer.ts` (5th passedMetrics sub-gate, conservative-fail when target set + stat missing), `architectureStoreHelpers.ts` (`buildSimGraph` opts), `constants.ts` (`DEFAULT_REPLICATION_LAG_MS=50`, `REPLICA_LAG_WRITE_K=4` — no DEFAULT_CROSS_REGION_RTT applied automatically), `ChallengeStartButton.tsx` (thread opts), `referenceSolution.ts` (consistency-aware builder, opts in both call sites), `ChallengeResultsModal.tsx`, `challengeStore.ts`, new `58-strong-or-stale.yaml`/`59-quorum-call.yaml`, bump solvability count 57→59.

**Re-calibration step.** Only the new family + any existing challenge that opts into `cross_region_rtt_ms` shift. Ship builder support + new family YAMLs in the SAME commit (D69 pattern). Re-confirm the 7 existing multi-region challenges' p99 targets hold on the still-MAX-hop model if ED1 hasn't landed (sequence note).

**Effort:** XL. **Risk:** HIGH — threading target, staleness explosion, and the no-auto-default RTT are the must-fix items.

---

## 5. Highest-risk changes & recommended first gap

### Highest harnessRisk callout (`harnessRisk: high`)

These will turn `solvability.test.ts` RED across many challenges the moment their math lands. Each MUST ship as a single atomic commit (math + all-57 re-tune + golden check) so CI never sees the math alone:

- **ED1/EN1 (Phase 2)** — path-sum raises EVERY measured p99/p95; exhaustive 57-target re-tune. The cache-short-circuit must be traffic-weighted (not unweighted max) or the lesson is wrong.
- **EN2 (Phase 2)** — XL data tax (~114 YAMLs need `concurrency_limit`); must author before the gate or `leanResize` picks variants the gate sheds. Three existing engine assertions must be rewritten.
- **EN3 (Phase 3)** — cascade drops the 9 outage challenges below targets; `40-observe-to-recover` is structurally unclearable and needs redesign BEFORE landing; the conservation identity must not double-penalize retries.
- **ED3 (Phase 3)** — the `security` required type (28/29/38) silently drops to 0 stars unless the builder's on-path pass is made category-agnostic.
- **restore-redundancy (Phase 3)** — the modifier route re-opens the D72 budget trap; use the separate-metric route.
- **ED5 (Phase 4)** — INFEASIBLE as specified (writePressure≈0.5 derates ALL 57); do not implement until the workload-source distinction + 3-step bisectable rollout land.
- **ED6/EN4/ED8 (Phase 4)** — staleness can explode to ~2200ms; auto-default RTT would break the 7 existing multi-region challenges.

`harnessRisk: medium`: ED4/LX4, EN5 (casing bug + scorer/lean model mismatch are the gotchas), ED9. `harnessRisk: low`: ED2, EN6.

### Recommended first gap

**Implement EN6 first** — even though it's listed under Phase 4, it is the lowest-risk, highest-leverage move:

- It is a **pure additive correctness fix** (closes PENDING D7) with **zero target movement** — no challenge re-tune, no golden regen.
- It **unblocks EN3** (the highest-risk Phase-3 gap), which cannot be implemented correctly on the current single-pass cyclic hack.
- Its risk is `low` **provided** the `totalServedRps` formula is left unchanged (keep `max(0, targetRps − totalFailedRps)`) and the queueDepth-once invariant is verified with a multi-tick test.

After EN6 lands green, proceed with the **Phase 2 atomic set (ED1/EN1 + ED4/LX4, then EN2)** as the first real fidelity work, since Phase 2 must precede Phase 3 and gates all downstream re-tuning.
