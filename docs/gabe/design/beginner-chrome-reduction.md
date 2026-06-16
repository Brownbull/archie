# S1b — Beginner mode: reduce chrome, not just palette (research + verdict)

> Source: Kane QA handoff (2026-06-15), finding S1b ("Make Beginner mode reduce workspace chrome,
> not just palette — currently trims which components are offered but leaves 3 overlapping panels +
> overlay toolbar + minimap identical at every level"). Maturity: enterprise. Status: **research —
> decision below before any implementation.**

## The claim

Kane observed that Beginner mode (`experienceLevel: "beginner"`) reduces *what components are
offered* but leaves the *workspace chrome* — minimap, canvas controls, overlay-mode selector, the
overlapping toolbox/inspector/dashboard panels — identical to Expert mode. For a true novice, the
density that overwhelms is the chrome, not only the palette.

## What `experienceLevel` already gates (verified)

The disclosure tier (`useDisclosureTier`, D82/D84) is a single shared value driving progressive
disclosure across the app:

| Surface | Gated by experienceLevel today? |
|---------|----------------------------------|
| Block palette / toolbox component list | ✅ yes (ComponentTab, StacksTab) |
| On-node config picker (config-tier) | ✅ yes (hidden at beginner quests) |
| Inspector component detail depth | ✅ yes (ComponentDetail) |
| Dashboard overlay detail | ✅ yes (DashboardOverlay) |
| Tier badges, blueprint hints | ✅ yes |
| **Canvas minimap** (`<MiniMap>`, CanvasView.tsx:378) | ❌ no |
| **Canvas controls** (`<Controls>`, CanvasView.tsx:379) | ❌ no |
| **Overlay-mode selector** (`overlay-selector`) | ❌ no |
| **Panel layout** (toolbox + inspector + dashboard simultaneously) | ❌ no |

So Kane is correct on the facts: the *canvas chrome* row above is identical at every level.

## Options

### Option A — Gate the canvas chrome on beginner level (the literal ask)
Hide `<MiniMap>`, collapse `<Controls>` to essentials, and hide the overlay-mode selector when
`experienceLevel === "beginner"`. Low effort (CSS/conditional render in CanvasView + the overlay
toolbar). Risk: the minimap/controls are also genuine navigation aids — hiding them can strand a
beginner who zoomed out and can't get back. The overlay selector is arguably an *intermediate*
feature, safe to hide.

### Option B — Collapse panels, keep chrome
Default the inspector + dashboard to collapsed at beginner level (they already support collapse),
leaving the canvas + toolbox as the focus. Lower risk than hiding navigation; addresses the
"3 overlapping panels" half of the complaint without touching navigation aids.

### Option C — Do nothing (rely on Quest Mode routing)
Phase 2 (S1a) now routes novices into **Quest Mode**, where the palette is already quest-restricted
and the experience is scenario-guided. Quest Mode is the real density control; a beginner who took
the "New to architecture?" fork is not in the free-mode sandbox with all panels open. The S1b
complaint was filed against the *old* default (novices dropped into Free Mode), which S1a removes.

## Verdict: **partial build — Option B + the overlay-selector half of A. Skip hiding minimap/controls.**

Rationale:
- **S1a already absorbs most of S1b.** With novices routed to Quest Mode, the "expert sandbox with
  everything open" is no longer the novice default. That downgrades S1b from "keystone" to "polish."
- **Hiding navigation aids (minimap/controls) is a net negative** — it trades density for
  disorientation. A beginner who can't recenter is worse off than one who sees a minimap.
- **Collapsing the inspector/dashboard by default at beginner level (Option B)** is safe, reversible,
  and reuses existing collapse state — it directly answers "3 overlapping panels" without new risk.
- **Hiding the overlay-mode selector at beginner level** is safe — overlays (cost/perf/tier
  recolor) are an intermediate analysis feature, not a first-build need.

### Scoped follow-up (not this round)
A thin slice — `experienceLevel === "beginner"` → default inspector + dashboard collapsed + hide the
overlay-mode selector — is worth a small story. It is **deferred** here rather than built, because:
1. It should land *after* S1a is live and we can observe whether routed-novice friction persists.
2. It needs a quick visual pass to confirm the collapsed defaults don't hide the live scores a
   beginner needs to see their build graded.

Tracked as a PENDING item with the trigger: "novice testing after S1a still reports free-mode
density." No code changes in this phase.
