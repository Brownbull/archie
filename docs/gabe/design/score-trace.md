# Score Trace & CTA Consolidation — design (Plan-2 Phase 4, D99)

> Source: feedback20260609.md lines 1–4 ("if I click them nothing happens… I don't know the trace
> for each one of the points there"). Status: designed 2026-06-11, implemented same phase.

## What already existed (inventory finding #1)

The Fluidity plan (D80/P1-T4) made the scores clickable before this phase: the aggregate score and
the weakest-category bar open the breakdown overlay, deep-linked to the category with its info
popup. The popup explains WHAT the category means (description, why-it-matters, score
interpretation). The complaint's first half ("nothing happens") was already fixed; the second half
("I don't know the trace") was not — the popup never says WHICH components produce the number.

## The trace (this phase's substantive delivery)

`CategoryInfoPopup` gains a **Contributors** section, computed read-only from the recalculation
output (`computedMetrics` — per-node metric values, each tagged with its category):

- Per contributing node: its CATEGORY sub-score = mean of its metrics in this category, worst
  first (the question is always "what's dragging this down").
- Each row names the node, its sub-score, and its lowest metric in the category
  ("API Gateway · 3.2 — dragged by p99-latency (2)").
- A final "What moves it" line names the single lowest metric across all contributors — the
  highest-leverage fix.
- Top 4 rows + overflow count. Zero engine change: presentation over existing recalculation data.

## Complexity visibility (inventory finding #2)

"Operational Simplicity" (operational-complexity) is ALREADY one of the seven score categories —
it renders in the overlay whenever components author ops metrics, and surfaces in the footer when
it is the weakest. Feedback line 93's ask is satisfied at category level; no new stat-bar work.
The trace makes it explainable like every other category.

## CTA inventory (inventory finding #3)

| Surface | Mode | Status after Plans 1–2 + P3 |
|---|---|---|
| Coach (top-left) | quest | De-escalated (D98): diagnostics only outside beginner |
| HUD checklist | quest | The requirements overview — single owner of "what the brief needs" |
| TierBadge "N suggestions" | free only | A LINK to the overlay pathway section, not a duplicate panel |
| Toolbox pathway inline | free only | maxItems=2, hidden in quests/search (P86) |
| Overlay pathway section | both | The full list — the link target |
| Weakest-category bar | both | One bar (D80), deep-links to its trace |
| Results SuggestionCard | post-run | One suggestion, post-run only |

**Conclusion:** the duplication the feedback experienced (pre-Fluidity, pre-D98) has been
consolidated by prior phases; each remaining surface has a distinct job and mode. No further
kills/merges — this doc is the record of WHY the current set is the set.
