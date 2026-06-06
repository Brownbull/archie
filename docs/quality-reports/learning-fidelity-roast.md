# Learning-Fidelity Roast — Challenges, Simulation & Scoring

> **Purpose.** A standing gap analysis to decide next fixes / redesign for Archie's *teaching* value:
> does the platform teach real, transferable system design, or reward gaming the harness?
> Produced via `/gabe-roast` from three perspectives. Saved here to revisit, not to action blindly.
>
> **Date:** 2026-06-05 · **Target:** `src/data/challenges/*.yaml`, `src/engine/simulationEngine.ts`,
> `src/lib/simulationStats.ts`, `src/engine/rubricScorer.ts`, `src/engine/topologyChecker.ts`, the
> lesson-loop UI (`src/components/challenges/*`, `src/hooks/useChallengeCoach.ts`).
>
> Maturity axis is read for a *learning platform*: **MVP** = teaches actively-wrong intuitions / breaks
> the core loop · **Enterprise** = realism gaps that bite intermediate learners · **Scale** = advanced
> concepts a serious learner expects but never meets. IDs are namespaced per perspective
> (`ED-*` educator, `EN-*` engine, `LX-*` learner).

---

## Decision summary (all three perspectives)

| ID | Persp. | Mat. | Imp. | One-liner | Effort |
|----|--------|------|------|-----------|--------|
| ED1 | Educator | MVP | CRIT | A seven-hop chain as fast as one hop | L |
| ED2 | Educator | MVP | HIGH | Hint says spread across AZs; engine nukes the whole tier | L |
| ED3 | Educator | MVP | HIGH | Bring the prop to the photo — you don't have to use it | M |
| ED4 | Educator | ENT | HIGH | Latency stays flat at 99% load, then a cliff | M |
| ED5 | Educator | ENT | HIGH | A cache that hits the same with one key or a billion | L |
| ED6 | Educator | ENT | MED | Multi-region = a checklist of three icons | M–L |
| ED7 | Educator | ENT | MED | Monthly dollars ÷ ninety seconds of traffic | S–M |
| ED8 | Educator | SCALE | MED | A distributed-systems trainer with no CAP theorem | XL |
| ED9 | Educator | SCALE | MED | Burst defense = pay for the peak forever | L |
| EN1 | Engine | MVP | CRIT | Serial hops with parallel-hop latency math | L |
| EN2 | Engine | MVP | HIGH | Capacity is one number; real systems die on concurrency | L |
| EN3 | Engine | MVP | HIGH | Tiers fail in silos; real failures cascade and amplify | L |
| EN4 | Engine | ENT | HIGH | Read replicas with zero lag and perfect freshness | M |
| EN5 | Engine | ENT | MED | A cloud bill with no data-transfer line item | M |
| EN6 | Engine | SCALE | MED | Feedback loops fall out of the accounting (known D7) | M |
| EN7 | Engine | SCALE | LOW | Observability = a 33%-off coupon on recovery | S |
| LX1 | Learner | MVP | HIGH | You must win to afford the hint that helps you win | S |
| LX2 | Learner | MVP | HIGH | It says "something's overloaded" but not which thing | M |
| LX3 | Learner | ENT | MED | Three stars — but was that lean or lucky? | S |
| LX4 | Learner | ENT | MED | The capacity gauge reads green at 99%, then red at 101% | (= ED4) |
| LX5 | Learner | ENT | MED | Blink and you miss the moment it broke | M |
| LX6 | Learner | SCALE | LOW | A gold "Resilient" sticker with no story | S |

**Cross-cutting theme — "presence over behavior."** ED2, ED3, ED6, EN4 are one disease: the rubric
rewards *having the right blocks on the canvas* rather than *the blocks doing their job under the sim*.
Every fix that ties score to behavior (traffic-on-path, fault isolation, real tradeoff) compounds.

**Cheapest learning-correctness wins (S–M, fix "right answer for the wrong reason"):** ED3, ED4/LX4,
ED7. **Highest-value rewrites (ripple into challenge re-calibration + golden snapshot):** ED1/EN1
(sum latency), ED2/EN3 (fault isolation + cascading), EN2 (concurrency). **The reference builder's own
exploits** (traffic-free aux leaves, "add cache always wins", over-provision one tier) are a free list
of rubric holes — watch them shrink as fixes land.

---

## Perspective 1 — Architecture Educator
*Does this teach real, transferable system design, or reward gaming the harness?*

### MVP

**ED1 · CRITICAL — End-to-end latency is the MAX hop, not the sum.**
`simulationStats.ts:44` defines per-tick system latency as the worst single node, so a
`traffic→dns→cdn→cache→lb→compute→db` chain is as fast as its slowest tier — adding hops is free.
- One-liner: *"A seven-hop chain as fast as one hop."* · Effort: L (re-calibrates every p99 target + golden)
- Lose: learners internalize the inverse of reality — chattiness and deep call chains are *the* latency
  killers, and here they cost nothing.
- Fix: sum `baseLatency` along the served path (cache hits short-circuit = genuinely faster); keep
  worst-hop only as the overload term.

**ED2 · HIGH — `az_outage` kills the whole category, so multi-AZ redundancy is unlearnable — and contradicts the hints.**
`simulationEngine.ts:68` takes every node of the category offline; replicas/extra nodes die together.
`async-backbone`'s hint says *"multi-AZ replicas for outage survival,"* and the topology star was
demoted (D72) so no-SPOF earns only a badge. Prose teaches redundancy; the engine gives neither
mechanism nor reward.
- One-liner: *"The hint says spread across AZs; the engine nukes the whole tier."* · Effort: L
- Lose: resilience — the headline reason architecture matters — is untexachable; learners "survive"
  outages only by over-provisioning unrelated tiers.
- Fix: model an AZ attribute; `az_outage` removes a *fraction* of a category's capacity so spreading
  survives; then restore redundancy to the topology star or a metric.

**ED3 · HIGH — `required_types` is presence-only — place the block, ignore the lesson.**
`rubricScorer.ts hasAllRequiredTypes` checks the type is on canvas, not that it carries traffic. The
reference builder exploits this (aux tiers wired as traffic-free leaves). A learner satisfies "needs a
message-queue / rate-limiter / auth" with a disconnected block.
- One-liner: *"Bring the prop to the photo — you don't have to use it."* · Effort: M
- Lose: the *why/when* of every required component goes untaught; required blocks become a scavenger hunt.
- Fix: require the type on the served path / carrying non-trivial flow (removing it must change the
  score). Bonus: model rate-limiter/auth effects so they aren't decorative.

### Enterprise

**ED4 · HIGH — Latency-under-load is flat below 100%, then linear — no queueing curve.**
`simulationEngine.ts:60` `latencyUnderLoad`: `overload = max(0, capacityPercent − 1)`. A tier at 95%
shows base latency. Reality: latency → ∞ as utilization → 100%.
- One-liner: *"Latency stays flat at 99% load, then a cliff."* · Effort: M
- Lose: the headroom/utilization lesson (why you don't run at 90%) is absent.
- Fix: latency ∝ `1/(1−ρ)`-style so headroom visibly buys tail latency.

**ED5 · HIGH — Cache hit-ratio is a fixed per-variant constant.**
Independent of cache size, working set, traffic mix, or writes. "Stack CDN+cache → ~99% absorption" is
a constant, so the winning move is always "add cache."
- One-liner: *"A cache that hits the same with one key or a billion."* · Effort: L
- Lose: the central cache lesson (hit ratio depends on what/how-much you cache vs the access pattern;
  writes erode it) never lands.
- Fix: derive effective hit-ratio from variant ceiling × challenge cacheable-fraction × (1 − write
  pressure); let `kind: search/periodic` lower it.

**ED6 · MEDIUM — Multi-region is graded as block presence, not modeled.**
`rubricScorer.ts originRequirementOk` = "has CDN+DNS+DB." No cross-region latency, replication lag, or
failover.
- One-liner: *"Multi-region = a checklist of three icons."* · Effort: M–L
- Lose: the real tradeoffs (latency vs consistency, lag, regional failover) reduced to a presence check.
- Fix: coarse cross-region latency add + a consistency/lag signal when multi-region is required.

**ED7 · MEDIUM — `cost_per_request`'s denominator is sim-run requests, not a real time unit.**
`rubricScorer.ts`: `monthlyCost / (totalServed × secondsPerTick)` mixes a monthly cost with ~90s of
traffic. The new `unit-economics`/`lean-at-scale` targets are sim-calibrated numbers a learner can't
map to anything real.
- One-liner: *"Monthly dollars ÷ ninety seconds of traffic."* · Effort: S–M
- Lose: the one place we explicitly claim to teach "unit economics" teaches a meaningless unit.
- Fix: $/million-requests at the challenge's peak rps (`monthlyCost / (peakRps × secs_per_month) × 1e6`).

### Scale

**ED8 · MEDIUM — No consistency / CAP / replication-lag dimension anywhere.**
Scoring is uptime+latency+cost+topology; a learner 3★s everything without confronting the hardest
distributed-systems tradeoff.
- One-liner: *"A distributed-systems trainer with no CAP theorem."* · Effort: XL
- Fix: a consistency metric or challenge family where sharding/multi-region forces a consistency choice
  the score reflects.

**ED9 · MEDIUM — Replicas are static — no autoscaling, so the burst lesson is "over-provision for peak".**
`thundering-herd` has bursty traffic but the only defense is fixed replicas sized to peak — the inverse
of the elasticity lesson.
- One-liner: *"Burst defense = pay for the peak forever."* · Effort: L
- Fix: an autoscaling option (replicas track load, cost integrates over the curve) so handling a burst
  *cheaply* is the win.

---

## Perspective 2 — Simulation / Domain Expert
*Pure engine fidelity: would an SRE / distributed-systems engineer trust the physics?*
*(References educator gaps where they share a root cause — not re-discovered.)*

### MVP

**EN1 · CRITICAL — Serial-path latency uses parallel-path math (= ED1) + no inter-node RTT.**
Beyond ED1's max-hop issue: there is no network/round-trip latency *between* nodes at all. A request
crossing six services pays zero transit cost.
- One-liner: *"Serial hops with parallel-hop latency math."* · Effort: L · See ED1.

**EN2 · HIGH — No concurrency / queueing model — capacity is a single rps ceiling.**
Real nodes bottleneck on concurrent connections / threads / pool limits (Little's Law:
concurrency = throughput × latency). The sim has only `maxRPS` + the flat-then-linear overload term
(ED4); no connection caps, no queue depth (except the message-queue drainRate), no latency↔concurrency
coupling.
- One-liner: *"Capacity is one number; real systems die on concurrency."* · Effort: L
- Lose: connection-pool exhaustion / head-of-line blocking — among the most common real outages — can't
  occur, so capacity planning is taught as pure arithmetic.
- Fix: add a concurrency limit per variant; couple latency to queue depth (utilization) so saturation
  manifests as both latency *and* connection rejection.

**EN3 · HIGH — Failure is instantaneous, isolated, retry-free — no cascade.**
When a tier sheds, there are no timeouts, no client retries (retry amplification), no backpressure
upstream, no thundering-herd-on-recovery. `totalFailed = Σ node.failed` (independent). The
`thundering-herd` challenge can't model the retry storm that *causes* real thundering herds.
- One-liner: *"Tiers fail in silos; real failures cascade and amplify."* · Effort: L · Related: ED2.
- Lose: cascading failure, retry storms, circuit-breakers, and load-shedding-as-defense — the entire
  resilience-engineering surface — are absent.
- Fix: propagate shed as upstream timeouts with a retry multiplier; let monitoring/circuit-breaker
  blocks damp it (gives observability a real job — see EN7).

### Enterprise

**EN4 · HIGH — Read-replicas scale reads with zero lag and perfect freshness.**
The write/read split (`simulationEngine.ts:194-209`) scales reads on replicas instantly and
consistently. Real replicas lag → stale reads → the consistency tradeoff.
- One-liner: *"Read replicas with zero lag and perfect freshness."* · Effort: M · See ED8.
- Fix: attach a replication-lag/staleness signal to read-replica scaling that a consistency metric
  (ED8) can read.

**EN5 · MEDIUM — Cost is capacity-only (`monthlyCost × replicas`) — no usage-based billing.**
No requests, egress / cross-region data-transfer, storage, or reserved-vs-on-demand. A cost challenge
can't teach egress-dominated bills (the real surprise on most invoices).
- One-liner: *"A cloud bill with no data-transfer line item."* · Effort: M · Related: ED7.
- Fix: add a per-request + per-GB-transfer cost term (cross-region transfer especially) on top of the
  capacity cost.

*(Cache realism — fixed hit-ratio, no eviction/warmup/invalidation — is EN's view of **ED5**; same fix.)*

### Scale

**EN6 · MEDIUM — Cycle / feedback-loop accounting is approximate (known D7).**
The engine flags it itself (`simulationEngine.ts:170-172`): cycle members are processed once without
forwarding, so feedback/retry/bidirectional topologies mis-account served vs sink traffic.
- One-liner: *"Feedback loops fall out of the accounting."* · Effort: M · Tracked as PENDING D7.
- Fix: a fixed-point / multi-pass flow solve for cyclic graphs (needed anyway if EN3 adds retries).

**EN7 · LOW — Observability's effect is a magic 33%-faster-recovery constant.**
`monitoring` doesn't model detect→respond→MTTR; it's a flat fudge factor (E8). A domain expert sees a
hand-wave.
- One-liner: *"Observability = a 33%-off coupon on recovery."* · Effort: S
- Fix: tie observability to EN3's cascade damping (faster detection → earlier circuit-break → smaller
  blast radius) so it earns its keep mechanically.

*(Deterministic, jitter-free traffic means "tail latency" is an artifact of the curve's shape, not
statistical variance — the engine face of ED1's percentile note.)*

---

## Perspective 3 — First-Time Learner
*UX of the lesson loop: do I understand why I failed and what to do next?*
*(The loop is real — `useChallengeCoach` does tackle→watch→iterate→mastered, there's live per-node
telemetry and a "try this next." These are gaps **within** it.)*

### MVP

**LX1 · HIGH — The hint economy is backwards for beginners.**
`HintPanel.tsx`: each hint costs 1 *spendable* star (earned − already spent on hints). A stuck
first-timer has earned ~0 stars → can't unlock the hint that would teach them. The learners who most
need help can least afford it; you must succeed to buy the help that lets you succeed.
- One-liner: *"You must win to afford the hint that helps you win."* · Effort: S
- Lose: the onboarding cliff — a beginner stuck on an early challenge has no affordable way out but
  trial-and-error, the highest-churn moment.
- Fix: first hint per challenge free (or free until the player has earned N stars); keep the economy for
  the deeper reference-solution hints.

**LX2 · HIGH — Failure feedback names the symptom, not the culprit node.**
`useChallengeCoach` iterate mode distinguishes latency/uptime/budget/topology and gives category advice
("requests are being dropped — scale up replicas") but never points at *which* tier overloaded — even
though `SimulationStatsSidePanel` has each node's `capacityPercent`/`overloaded`. The learner must
replay, watch, and correlate.
- One-liner: *"It says 'something's overloaded' but not which thing."* · Effort: M
- Lose: the diagnostic skill (find the bottleneck) is short-circuited into guess-and-check.
- Fix: surface the top overloaded node in the iterate coach + results modal ("compute hit 180% — shed
  14%"); link it to the node on the canvas.

### Enterprise

**LX3 · MEDIUM — No "par" — the learner can't tell a lean 3★ from a wasteful one.**
Single-player, no comparison to an efficient reference or peers. "Mastered" mode says "experiment for
less money" but gives no target.
- One-liner: *"Three stars — but was that lean or lucky?"* · Effort: S
- Fix: after 3★, show the reference solution's cost / node count as a "par" (the harness already
  computes it).

**LX4 · MEDIUM — Flat-then-cliff latency makes the live capacity gauge lie (UX face of ED4).**
A node at 99% capacity shows healthy telemetry, then falls off a cliff at 101%, so the learner can't
build the "watch utilization, leave headroom" instinct — the gauge reads green until saturation.
- One-liner: *"The capacity gauge reads green at 99%, then red at 101%."* · Effort: see ED4.
- Fix: the queueing curve (ED4) turns the gauge into a teaching instrument.

**LX5 · MEDIUM — The 50-tick sim at 10× can flash past the failure.**
"Watch" mode invites observation but the run is seconds; a transient overload window (e.g. a 25s
latency spike in a 120s run) is easy to miss.
- One-liner: *"Blink and you miss the moment it broke."* · Effort: M
- Fix: auto-pause or highlight the worst tick; a post-run timeline scrubber pointing at the failure
  window.

### Scale

**LX6 · LOW — The "Resilient" badge is unexplained jargon for a newcomer.**
The non-star Resilient badge (D72) appears with no in-context SPOF explanation; a beginner learns
nothing about why redundancy matters — compounded by ED2 (redundancy is mechanically moot anyway).
- One-liner: *"A gold 'Resilient' sticker with no story."* · Effort: S
- Fix: a tooltip/explainer on the badge; and (per ED2) make redundancy mean something mechanically so
  the badge points at a real lesson.

---

## Suggested sequencing (if this becomes a "learning-fidelity" epic)

1. **Quick correctness wins (S–M):** ED3 (types-on-path) · ED7 (cost unit) · LX1 (free first hint) ·
   LX2 (name the bottleneck) · LX3 (show par). High learning-value, low ripple.
2. **Core engine fidelity (L, ripples into challenge re-calibration + golden):** ED1/EN1 (sum latency)
   · ED4/LX4 (queueing curve) · EN2 (concurrency).
3. **Resilience as a real subject (L):** ED2 (AZ fault isolation) + EN3 (cascade/retries) + EN7
   (observability earns its keep) — these three reinforce each other; do them together.
4. **Depth (L–XL):** ED5/EN-cache (dynamic hit-ratio) · ED9 (autoscaling) · ED6/EN4/ED8
   (multi-region + replication lag + a consistency dimension) · EN5 (usage-based cost) · EN6 (cyclic
   flow solve, also unblocks EN3 retries).

Re-roast after each phase to confirm the reference builder's exploits shrink (the canary for whether a
fix closed a real hole).
