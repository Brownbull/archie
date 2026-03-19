# 05 — Pathway Guidance UI Options

**Date:** 2026-03-18
**Context:** Epic 7.5 — Weighted Pathway Guidance ("Show the roads, not just the dot")
**Purpose:** Evaluate where pathway guidance surfaces in the existing UI before making an architecture decision.

---

## Background

The tier system (`tierEvaluator.ts`) already computes `nextTierGaps: TierGap[]` — what's missing for the next tier. The `TierBadge` popover displays these gaps as text bullets. But the current display is passive: it says "Improve Performance score to 6+" without saying which component to add or swap, how the user's weight profile changes the priority of each gap, or whether a suggestion would violate active constraints.

Pathway guidance turns passive gap descriptions into actionable, personalized suggestions:
- **Which components to add** (from library) to close each gap
- **Ranked by weight profile** (scalability-focused users see scalability-closing components first)
- **Filtered by constraints** (don't suggest what violates red lines)
- **Scored for data context fit** (suggestions that match the user's data patterns rank higher)

This is a ranked list of suggestions with explanations — not a single tooltip. The UI surface must accommodate 3-8 suggestion cards, each with component name, reason, weighted score, constraint safety, and fit indicator.

---

## Evaluation Criteria

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| Discoverability | High | User must find it without documentation |
| Space for ranked list | High | 3-8 suggestion cards with metadata |
| Pattern consistency | Medium | Follows existing Epic 5/6 UI patterns |
| Progressive disclosure | Medium | V1 value: surface → detail → learning path |
| Implementation effort | Low | Solo dev budget — prefer extending, not inventing |

---

## Option A: Tier Badge Extension

**Where:** Extend the existing `TierBadge` popover in `DashboardPanel`. Currently shows `nextTierGaps` as text bullets. Add a "Suggested next steps" section below the gap list.

**How it works:**
1. User clicks tier badge → popover opens (existing behavior)
2. Below "Next tier requirements," a new section: "Suggested components"
3. Each suggestion: component name, which gap it closes, weighted score

**Pros:**
- Zero new UI surfaces — extends what already exists
- Highest discoverability — users already click the tier badge to see gaps
- Natural progressive disclosure: gap → suggestion → why

**Cons:**
- The popover is 288px wide (`w-72`) — cramped for suggestion cards with metadata
- Popover is positioned `bottom-full` (above the badge) — grows upward, may clip viewport
- No scroll area — long suggestion lists push the popover off-screen
- Mixing gap display + suggestions in one popover overloads the component

**Verdict:** Good for 1-2 simple text suggestions. Breaks down with 3-8 rich cards.

---

## Option B: Dashboard Overlay Collapsible Section

**Where:** Add a third collapsible section to `DashboardOverlay` (the existing `Dialog` component). Currently has: (1) Priority Weights, (2) Constraint Guardrails. Add (3) Pathway Guidance.

**How it works:**
1. User opens Dashboard Overlay → sees three collapsible sections
2. "Pathway Guidance" section shows tier gap summary + ranked suggestion list
3. Each suggestion card: component name, gap closed, weighted score, constraint badge, fit indicator
4. Clicking a suggestion could navigate to that component in the toolbox or show library detail

**Pros:**
- Consistent pattern with Epics 5 and 6 — collapsible sections in `DashboardOverlay`
- `sm:max-w-4xl` dialog gives plenty of space for rich suggestion cards
- Already has scroll (`max-h-[90vh] overflow-y-auto`) — handles long lists naturally
- Can show full context: gap + suggestion + reasoning side by side
- Reuses existing `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from shadcn
- Badge indicator on the trigger (like constraint violations badge) signals when suggestions exist

**Cons:**
- Not ambient — requires user to open the overlay to see suggestions
- Users must discover that the Dashboard Overlay has a third section
- One more click away from the canvas compared to tier badge popover

**Verdict:** Strong option. Follows established patterns, sufficient space, reuses infrastructure.

---

## Option C: Canvas Ambient Panel

**Where:** A collapsible panel anchored to the canvas area (e.g., top-right corner, always visible when gaps exist). Similar to a notification tray.

**How it works:**
1. When `nextTierGaps.length > 0`, a floating panel appears on the canvas
2. Collapsed state: small indicator "3 suggestions for next tier"
3. Expanded state: full suggestion list overlaying the canvas

**Pros:**
- Highest ambient visibility — users see it without clicking anything
- V4-aligned: "shows the roads" proactively

**Cons:**
- Canvas is the primary interaction surface — overlays compete with React Flow
- Z-index management with existing CanvasLegend, node tooltips, connection labels
- On mobile/small screens, canvas ambient panels eat critical space
- No precedent in the existing UI — introduces a new pattern
- The canvas already has flow particle animations, heatmap overlay, legend — adding more risks visual noise
- Drag-and-drop interactions near the panel edge would be difficult

**Verdict:** High visibility but high risk. Introduces complexity without precedent.

---

## Option D: Inspector Panel — Architecture Tab (When Nothing Selected)

**Where:** The inspector panel currently returns `null` when no node/edge is selected (`InspectorPanel.tsx:73`). Replace that null state with an "Architecture Overview" tab showing tier status + pathway suggestions.

**How it works:**
1. When nothing is selected, inspector shows architecture-level info
2. Top section: current tier, progress bar, gap summary
3. Bottom section: suggested components ranked by weight/constraint/fit
4. Clicking a suggestion could pre-filter the toolbox or highlight the relevant category

**Pros:**
- Uses existing panel infrastructure (resizable, responsive, already in layout)
- Inspector is idle 80%+ of the time (only active during node/edge selection)
- Progressive disclosure: tier overview → gap detail → suggestion cards
- Doesn't compete with canvas interactions

**Cons:**
- Discoverability problem: users must deselect everything to see it
- Users may not realize the inspector has useful content when idle
- Breaks the mental model: inspector = "details about selected thing"
- Would need a visual indicator (badge on inspector header?) when suggestions exist

**Verdict:** Clever use of dead space but discoverability is the dealbreaker.

---

## Comparison Matrix

| Criterion | A: Tier Badge | B: Dashboard Overlay | C: Canvas Panel | D: Inspector Idle |
|-----------|:---:|:---:|:---:|:---:|
| Discoverability | High | Medium | Very High | Low |
| Space for cards | Low | High | Medium | High |
| Pattern consistency | Medium | High | Low | Low |
| Progressive disclosure | Medium | High | Medium | High |
| Implementation effort | Low | Low | High | Medium |
| Canvas interference | None | None | High | None |

---

## Recommendation for ADR Consideration

**Option B (Dashboard Overlay collapsible section) is the strongest candidate.** It follows the established Epic 5/6 pattern (one collapsible section per personalization feature), has ample space for rich suggestion cards, and reuses existing infrastructure. The "not ambient" downside is mitigated by a badge indicator on the collapsible trigger — matching the constraint violations pattern.

**Option A (Tier Badge extension) should be considered as a complement**, not a replacement. The tier badge could show a brief "3 suggestions available" link that opens the Dashboard Overlay directly to the Pathway Guidance section. This combines Option A's discoverability with Option B's space.

**Options C and D should be set aside** — C introduces too much canvas complexity for a solo project, and D has a fundamental discoverability problem.
