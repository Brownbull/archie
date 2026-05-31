# Claude-in-Chrome prompt — Archie ↔ reference app, single-player gap analysis

> Paste the block below into **Claude in Chrome**. Fill the two `{{REFERENCE_APP_*}}`
> placeholders first. **Sign in to Archie in your browser before running** (it gates the
> canvas behind Google auth — Claude inherits your session).
>
> Good reference targets for the taxonomy/abstraction focus: **IcePanel** (icepanel.io,
> C4 leveled model), **Structurizr** (structurizr.com, C4 abstraction levels), **Cloudcraft**
> (cloudcraft.co, provider components + cost). For canvas-UX baselines: Eraser.io, Excalidraw,
> Multiplayer.app (ignore its multiplayer parts).

---

You are a senior product + UX analyst running a competitive **gap analysis** between two web
apps, focused **only on single-user (single-player) usage**. Navigate both apps in the browser,
exercise the equivalent flows, capture evidence, and produce a prioritized gap report.

## The two apps

**A) Archie (mine)** — https://archie-2a560.web.app
An architecture-design / visualization tool. You drag components from a left **toolbox** onto a
**canvas**, wire them together by typed ports, and the diagram shows live **metrics**, a
bottleneck **heatmap**, **cost**, and a directional **scoring dashboard**. It also has: a
time-stepped traffic **Simulation** with playback, a **Challenge mode** (build to a brief, run the
sim, earn 0–3 stars), a post-run **"Try this next"** optimization suggestion, and a **History** tab
of past attempts. It requires sign-in — make sure you're already signed in (Google) so the canvas
loads instead of the login page.

**B) Reference** — https://www.codingducks.xyz/system-design/global-api
Interactive architecture with load simulation with callenges

## Scope — read carefully

- Evaluate **single-user / single-player product + UX only**.
- **Exclude** (out of scope, do not analyze): real-time collaboration / multiplayer, community /
  sharing / marketplace, sign-up / billing / the SaaS pricing, teams, anything needing >1 user or a
  backend account system. The goal is to make Archie a better **solo** tool.

## What to do

1. **Explore Archie (signed in).** Cover the full single-user surface:
   - Place several components from each toolbox tab (**Components / Stacks / Blueprints**).
   - Open a component's detail panel and its **config-variant** dropdown — note how a component is
     selected and configured.
   - Wire a few connections; move/multi-select/delete nodes; try zoom + minimap + keyboard.
   - Read the metrics / heatmap / cost / scoring; run a **Simulation**; try a **Challenge** and view
     the **"Try this next"** card + **History** tab.
   - Screenshot each key screen.
2. **Explore the Reference app.** Exercise the equivalent journeys as closely as it allows.
   Screenshot equivalents.
3. **Compare** across the dimensions below. Every gap needs **evidence** (what you saw + a
   screenshot reference).

## Focus area #1 — component model & taxonomy (a gap I already see; validate, then go deeper)

Archie's component palette is **provider-specific**: the toolbox lists branded components like
"Cloudflare CDN", "PostgreSQL", "Redis", "nginx", "Kafka" — each is its own component, with config
"variants" (size tiers) nested inside. I believe this is the **wrong abstraction level**. The model
I want:

- top-level components are **fundamental types** (e.g. CDN, Relational Database, Cache, Message
  Queue, Object Storage, Load Balancer, Compute/Service, Search, …),
- the user picks the **provider / implementation inside** the type (CDN → Cloudflare / Fastly /
  Akamai; Relational DB → Postgres / MySQL / Aurora),
- each provider carries its own **price + capability profile**.

Investigate and compare:
- How does the Reference app model its component/shape palette — fundamental types, provider-branded
  shapes, or both? How does it express the **type ↔ provider ↔ tier** hierarchy?
- How do its toolbox organization, search, categorization, and add-to-canvas flow compare to
  Archie's? What's clearly better or worse?
- Recommend a concrete **fundamental-type taxonomy** for Archie plus an **add/select UX** for
  choosing a provider + tier inside a type. Note migration implications: Archie ships ~18
  provider components across 10 categories today (compute, data-storage, caching, messaging,
  delivery-network, real-time, auth-security, monitoring, search, devops), each with config
  variants — what maps cleanly, what needs re-grouping, what breaks.

## Comparison dimensions (single-user)

1. **Component model & taxonomy** — the focus above: abstraction level, categorization, provider /
   variant handling, discoverability / search.
2. **Canvas & editing UX** — placing, connecting, moving, multi-select, keyboard shortcuts,
   undo/redo, zoom/minimap, snapping.
3. **Visualization & insight** — metrics, heatmaps, cost, scoring: what does the diagram actually
   *tell* the user, and how clearly?
4. **Authoring speed** — templates / blueprints, smart placement, auto-layout, quick-swap.
5. **Learning & guidance** — onboarding, tooltips, recommendations, the simulation + challenge +
   scoring loop.
6. **Import / export & persistence (single-user)** — file formats, lossless round-trip, local save.
7. **Polish & accessibility** — empty states, error handling, responsiveness, keyboard / screen
   reader.

## Output — return in this exact shape

1. **Executive summary** — 3–5 bullets: where Archie leads, where it lags, and the single
   highest-impact change to make.
2. **Gap table** — one row per gap:
   `# | Dimension | Archie today | Reference approach | The gap | Why it matters (solo user) | Recommendation | Effort (S/M/L) | Value (H/M/L) | Evidence`
3. **Component-taxonomy deep-dive** (focus area) — the recommended fundamental-type list, the
   type → provider → tier model, the add/select UX (with an ASCII sketch), and the migration notes.
4. **Top 3 quick wins** and **Top 3 strategic bets** (single-user only).

## Guardrails

- Be **specific and evidence-based**: cite the exact page / control / screenshot. Never claim a
  feature you didn't actually verify in the UI.
- **Analyze, don't enumerate.** Every gap needs a "why it matters for a solo user" and a concrete,
  buildable recommendation.
- If a Reference feature is multiplayer / community / backend-only, name it once and **skip it**.
- If you can't reach part of Archie (e.g. blocked at sign-in), say so explicitly instead of guessing.
- Prioritize ruthlessly — a short, sharp report beats an exhaustive one.
