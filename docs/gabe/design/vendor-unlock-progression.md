# Vendor Unlock Progression — research doc (Plan-2 Phase 5, D100)

> Source: feedback20260609.md lines 89/101-104 — "Instead of blocking, we should be able to unlock
> them. For some challenges we won't have certain tools due to stack/compatibility; for others, we
> just don't know about them yet." Research only — NO implementation in this phase.

## The two block-axes, and which exists today

| Axis | Fiction | Exists? |
|---|---|---|
| **Restriction** ("team doesn't run that vendor") | Stack/compatibility constraint, per-quest | ✅ `restricted_vendors` (P5-S4/D95): shown-but-locked in the provider select, chokepointed at addNode + swap |
| **Progression** ("you don't know that vendor yet") | Knowledge gate, account-level | ❌ — every vendor of an unlocked TYPE is available everywhere |

## Sketch: vendor knowledge as a second unlock ladder

1. **Default-vendor-first**: unlocking a TYPE (existing block grants) unlocks only its DEFAULT
   provider. Other vendors start locked account-wide.
2. **Unlock currency**: Expert currency (the break-it economy) is the natural spender — today it
   only buys the required-blocks filter. `1 Expert = unlock one vendor` gives the economy a second,
   durable sink (D94's review trigger asked for exactly this depth).
3. **Or unlock-by-use**: a quest whose brownfield seed or restriction forces vendor X teaches it →
   completing that quest unlocks X account-wide (mirrors teach-by-using for blocks).
4. **Storage**: `unlockedVendors: string[]` on userProgress (additive, schema-tolerant reader rules
   apply — D9/D28 lessons), seeded with all defaults + everything the player has ever placed
   (grandfathering, no reset).

## Why NOT now

- **Economy balance is unplaytested**: expert earn-rates (≤4/quest breaks + resilience extras)
  haven't been through an owner playtest; adding a sink before pricing the faucet risks a dead
  economy. D94's review trigger gates this.
- **Reference-solver coupling**: the solvability harness builds with default providers — vendor
  gating that ever blocks a DEFAULT would break 64 proofs. Rule 1 (defaults always unlocked)
  protects this, but needs a harness gate of its own.
- **UI surface**: the provider select needs a third state (locked-knowledge vs locked-restriction
  vs available) — collides with P5-S4's restriction styling; needs a design pass.

## Revisit trigger

After the first owner playtest prices the Expert economy (D94 trigger) — bundle with that tuning
pass. If expert currency feels over-earned/under-spent, vendor unlocks are the sink; if
under-earned, prefer unlock-by-use (mechanism 3) which costs nothing.
