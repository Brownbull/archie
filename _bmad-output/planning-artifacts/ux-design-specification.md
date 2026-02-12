---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-archie-2026-02-09.md'
  - 'docs/brainstorming/02-morphological-analysis.md'
  - 'docs/brainstorming/04-constraint-mapping-mvp.md'
  - 'docs/brainstorming/00-project-vision.md'
  - 'docs/brainstorming/01-cross-pollination-ideas.md'
  - 'docs/brainstorming/03-six-thinking-hats.md'
---

# UX Design Specification Archie

**Author:** Gabe
**Date:** 2026-02-09

---

## Executive Summary

### Project Vision

Archie is a Factorio-inspired visual architecture simulator — a client-side web application where developers drag-and-drop software building blocks onto a canvas, wire them together, configure variants, and instantly see directional trade-offs across 38 metrics in 7 categories. It serves as a critical-moment tool used at project inception and architecture pivot points, bridging the gap between AI-generated text architectures and human visual comprehension through a YAML-first, zero-lock-in approach.

The core workflow is an AI-Archie round-trip: AI generates architecture YAML, the developer imports it into Archie's visual canvas, iterates on component selection and configuration, then exports the finalized YAML back to their AI workflow. The tool itself uses no AI at runtime — AI builds the content and data only.

### Target Users

**Primary: Technical Solopreneurs & Builder-Optimizers**
- Developers proficient in multiple languages who build web applications solo or in small teams
- Systems thinkers who want to *see* and *feel* trade-offs through interaction, not just read about them
- Already using AI-assisted workflows but struggling with the text-only, one-option-at-a-time limitation
- The "Factorio player" personality: enjoys optimization, tinkering, understanding *why* one approach beats another

**Secondary: Tech Leads & Self-Directed Learners**
- Tech leads using Archie as a shared visual artifact for team alignment and architecture justification
- Junior developers exploring community architectures to build architectural intuition

**Explicitly excluded:** Non-technical users, enterprise architects (governance/compliance workflows), users who need hand-holding.

**Usage pattern:** Critical-moment tool. NOT a daily-use application. Low DAU is expected and healthy — faster decisions are better decisions.

### Key Design Challenges

1. **Information density vs. clarity** — 38 metrics, 7 categories, heatmap overlays, scoring dashboards, priority sliders, and component detail cards all compete for attention. Progressive disclosure is essential to avoid overwhelming users while keeping rich data discoverable.

2. **Three-panel interaction model** — Canvas (build area), Toolbox (component browser), and Inspector (detail/config) must coexist on screen. The user flow spans browsing, dragging, wiring, inspecting, and configuring — with live recalculation at every step. Spatial layout and state transitions determine whether Archie feels like a professional tool or a cluttered interface.

3. **File-based persistence model** — No backend, no database, no accounts. YAML import/export IS the save system. This must feel seamless and trustworthy, not like a manual step users will forget.

4. **Desktop-first canvas constraints** — This is a precision-interaction tool (drag-and-drop, wiring, inspection). Desktop-first, but must accommodate varying viewport sizes (laptop through external monitor).

### Design Opportunities

1. **Live recalculation as the "aha moment"** — Changing a configuration variant and watching connected metrics shift with heatmap colors updating in real-time is the hook. UX should make this moment immediate, visible, and satisfying — no modals, no confirmations, just live reaction.

2. **Trading-card component browsing** — The benefit card format (IS / GAIN / COST / TAGS) makes the toolbox feel approachable and game-like. Flipping through well-designed cards lowers the barrier to exploration and discovery.

3. **Architecture Tier System as progress feedback** — Tiers give users a concrete, shareable measure of completeness ("My architecture is Tier 2 on Archie"). This gamification element provides motivation and confidence without being gimmicky.

4. **YAML as universal bridge** — The round-trip between AI and Archie is a unique workflow. UX should make import/export feel like a natural part of the flow, not a technical chore.

## Core User Experience

### Defining Experience

**Core Loop: Build Once, Explore Many**

Archie's primary interaction pattern is not assembly — it's exploration. Users spend the majority of their time in a tight feedback loop:

1. **Select** a component on the canvas (or its configuration dropdown)
2. **Change** a configuration variant (e.g., PostgreSQL: normalized → denormalized)
3. **Watch** all connected metrics recalculate and the heatmap shift in real-time
4. **Evaluate** whether the trade-off is acceptable
5. **Repeat** — try another variant, swap a component, adjust a constraint

The canvas assembly (drag-and-drop, wiring) is the setup phase. The value phase is the parametric recalculation loop — "change something, see everything react." This single interaction is the product's reason to exist.

**The One Interaction That Must Be Perfect:**

Configuration variant switch → metric recalculation → heatmap update. This must be:
- **Instant** — no loading spinners, no perceptible delay
- **Visual** — metric bars animate, heatmap colors shift, numbers update in place
- **Connected** — changing one component visibly affects its neighbors, not just itself
- **Reversible** — switching back restores the previous state instantly (undo is implicit in selection)

If this loop is fast, visual, and satisfying, Archie proves its value over blog posts and AI conversations. Everything else (toolbox, import, tiers) exists to get the user into this loop and make it more informative.

### Platform Strategy

- **Platform:** Web application (React + React Flow)
- **Input mode:** Mouse and keyboard primary; desktop-first
- **Viewport:** Optimized for laptop screens (1280px+), scales up to external monitors
- **Mobile:** Not a priority — canvas drag-and-drop interactions don't translate to touch
- **Offline:** Client-side by default; no backend dependency in MVP. Works offline inherently once loaded.
- **File access:** Leverage browser File System Access API for YAML import/export where available, with fallback to standard file picker/download

### Effortless Interactions

**Zero-friction priorities (in order):**

1. **Understanding a component at a glance** — Benefit cards (IS / GAIN / COST / TAGS) must communicate what a component does, what you gain, and what it costs in under 3 seconds of scanning. This is the gateway to the entire tool — if browsing the toolbox feels like reading documentation, users won't make it to the canvas.

2. **Importing a YAML file** — Drag a file onto the canvas (or click to browse). Architecture appears instantly with all components placed, connected, and metrics visible. No configuration wizards, no mapping steps.

3. **Browsing components** — Card-flipping in the toolbox, not spreadsheet-scrolling. Category tabs, search, and tag filtering. Each component communicable without opening a detail view.

4. **Exporting current architecture** — One click to save the current canvas state as YAML. No "save as" dialogs beyond choosing a filename. The exported file is immediately usable by AI or re-importable into Archie.

### Critical Success Moments

Ranked by importance to product validation:

1. **First Recalculation** (the "aha moment") — User clicks a config dropdown, selects a different variant, watches the heatmap shift and metrics recalculate across connected components. "Oh, THAT's what changes when I switch from write-ahead logging to synchronous replication." This is the moment the user understands Archie's value.

2. **First Import** (the "it just works" moment) — User drops a YAML file onto Archie, and an entire architecture materializes on the canvas — components placed, connections drawn, metrics visible. No fiddling. "My AI-generated architecture is now visual and interactive."

3. **First Export / Round-Trip** (the "this fits my workflow" moment) — User exports their iterated architecture as YAML, pastes it back into their AI workflow, and the AI understands it perfectly. The loop is closed. "Archie isn't a separate tool — it's part of how I work."

4. **First Tier Assessment** (the "confidence" moment) — User sees "Your architecture is Tier 2" with clear indicators of what's missing for Tier 3. A concrete, shareable measure of completeness. "I know exactly where I stand and what I'd need to improve."

### Experience Principles

1. **Immediacy over accuracy** — Every interaction produces visible feedback instantly. Directional correctness matters; decimal precision does not. No loading states in the core loop.

2. **Show, don't tell** — Trade-offs are communicated through color (heatmap), position (metric bars), and motion (recalculation animation) — not through text paragraphs or tooltip essays. Text supports; visuals lead.

3. **Progressive disclosure** — 38 metrics exist but don't all appear at once. The heatmap is the first layer (glanceable). Metric bars are the second layer (scannable). Full detail cards are the third layer (on demand). Each layer is opt-in.

4. **Safe exploration** — Every change is reversible. No "are you sure?" confirmations. No destructive actions. The canvas is a sandbox — experiment freely, consequences are simulated.

5. **Toolbox, not wizard** — Archie provides building blocks and feedback, not step-by-step guidance. Users discover through interaction, not instruction. The Factorio player doesn't read the manual — they tinker.

## Desired Emotional Response

### Primary Emotional Goals

**Dominant emotion: Empowered Clarity**

The shift from "I think this is right" to "I *know* what I'm trading off." The quiet confidence of a Factorio player who sees their factory is optimized — not excitement, but deep understanding. Users should feel like they have X-ray vision into their architecture.

**Supporting emotion: Guided Discovery**

"Whenever I put my attention somewhere, I get exactly what I need — no more, no less." The tool reveals layers as you engage, like a well-designed game. You see the board first, understand the pieces, and as you interact, deeper options and details surface naturally. Nothing is hidden, but nothing is shouted either.

### Emotional Journey Mapping

| Stage | Target Feeling | Design Implication | Avoid |
|-------|---------------|-------------------|-------|
| **First discovery** | Curiosity + recognition — "this is what I've been missing" | Clean canvas, clear toolbox, one obvious entry point | Skepticism — "another diagramming tool" |
| **First import** | Surprise + delight — "my whole architecture just appeared" | Instant YAML → canvas rendering, no wizard steps | Frustration — parsing errors, manual mapping |
| **Core loop (recalculation)** | Mastery + control — "I see exactly what happens" | Instant visual feedback, heatmap shifts, metric animation | Overwhelm — too many numbers competing for attention |
| **Exploring trade-offs** | Playful curiosity — "what if I try THIS?" | Safe sandbox, instant undo, no confirmations | Analysis paralysis — unclear which option is "better" |
| **Inspecting a component** | Focused attention — "now show me everything about this one thing" | Dedicated detail view or panel that takes focus, not a cluttered overlay on top of everything else | Cognitive overload — all 38 metrics visible at once |
| **Tier assessment** | Progress awareness — "I can see my gear and where I stand" | Visible tier indicator on architecture, clear criteria for next tier | Judgment — "your architecture is bad" |
| **Export / round-trip** | Satisfaction — "this fits how I work" | One-click export, clean YAML output | Friction — multi-step save process |
| **Returning later** | Familiarity — "I know where I left off" | Re-import preserves full state | Lost context — "what was I doing?" |

### Micro-Emotions

**Critical micro-emotion pairs (prioritized):**

1. **Confidence over confusion** — Most critical. The tool exists to replace uncertainty. Every visual element should reinforce "you understand this."
2. **Curiosity over overwhelm** — The interface should invite exploration, not demand comprehension. See the board first, then zoom in.
3. **Excitement over anxiety** — Changing a config should feel like experimenting in a sandbox, not like pushing to production.
4. **Accomplishment over frustration** — Tier progression should feel like leveling up gear, not failing a test.
5. **Trust over skepticism** — Directional data must feel credible. Approximate is fine; arbitrary is not.

**Emotions to actively prevent:**

- **Overwhelm** — The #1 risk. 38 metrics, 7 categories, heatmaps, scoring dashboards, priority sliders. If all are visible simultaneously, the tool fails emotionally before it fails functionally. Progressive disclosure is the primary defense.
- **Judgment** — Tiers describe where you are, not how good you are. "Tier 1" means "foundation covered" not "barely passing."
- **Tedium** — If browsing components feels like reading documentation, the emotional contract is broken.

### Design Implications

**Progressive disclosure as emotional architecture:**

The interface should work like a game — not showing everything at once, but revealing depth as the user engages:

- **Layer 0 (Canvas overview):** Components as colored blocks with names. Heatmap overlay gives instant read on health. No numbers, no details — just shapes and colors.
- **Layer 1 (Hover/glance):** Tooltip with component name, category, current config variant, and 2-3 key metrics. Enough to decide "do I want to look closer?"
- **Layer 2 (Click/select):** Dedicated inspector panel or focused view. Full metric breakdown, configuration variant dropdown, pros/cons, connection details. The interface *shifts* to give this component attention — not a modal on top of clutter.
- **Layer 3 (Deep dive):** Full detail card with all 38 metrics, comparison to other components, synergy information. On demand only.

**Tier system as gear tracking:**

- Tiers are visible on the architecture (like an equipment score in a game)
- Progression is clear: "You're at Tier 2. Tier 3 needs: redundancy, monitoring, failover."
- Each piece of the architecture contributes to the tier — users can see which components help and which create gaps
- Reaching a new tier is a visible moment — not a pop-up achievement, but a clear state change in the tier indicator (color shift, number change, criteria checked off)

### Emotional Design Principles

1. **Attention = Detail** — Wherever the user focuses, more information appears. Wherever they don't focus, information recedes. The interface breathes with the user's attention.

2. **Polished like a game, serious like a tool** — Visual quality and interaction smoothness of a game. Information depth and credibility of a professional tool. No cartoon mascots, but also no spreadsheet aesthetics.

3. **Progress, not judgment** — Every assessment tells you where you are and what's next, never what's wrong. Tiers are milestones, not grades.

4. **Confidence through clarity** — Emotional confidence comes from visual clarity. If the user can *see* the trade-off, they *feel* confident in the decision. The visual IS the confidence mechanism.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Factorio — The Emotional Blueprint**

Factorio is the primary inspiration for Archie's feel — not its mechanics, but its emotional contract with the player: "build something, understand it completely, optimize it visually."

| UX Pattern | What It Does | Archie Application |
|-----------|-------------|-------------------|
| **Alt-mode overlay** | Toggle info overlay on/off — shows item flow rates, belt contents | Heatmap toggle — one keypress shows/hides the metric overlay on canvas |
| **Tooltip on hover** | Hover any entity → instant detail panel with production stats, ingredients, output | Layer 1 hover: component name, config variant, 2-3 key metrics |
| **Zoom levels reveal detail** | Zoomed out = shapes and colors. Zoomed in = labels, item counts, belt contents | Canvas zoom: far = heatmap blobs, close = metric bars and labels |
| **Blueprint system** | Save/load pre-built factory sections as reusable blueprints | Stack and Blueprint YAML — pre-wired architecture sections |
| **No tutorial walls** | Drop you in. Tooltips exist. You learn by building and failing safely | Toolbox + sandbox. No onboarding wizard. Learn by dragging and connecting |
| **Production stats panel** | Side panel showing throughput, consumption, production over time | Multi-track scoring dashboard — 7 metric categories as parallel bars |

**VS Code — The Layout Language**

VS Code provides the structural reference for a developer-facing, panel-based tool — proven patterns for managing complex information alongside a primary workspace.

| UX Pattern | What It Does | Archie Application |
|-----------|-------------|-------------------|
| **Sidebar + Editor + Panel** | Three-zone layout: explorer (left), main area (center), terminal/output (bottom) | Toolbox (left) + Canvas (center) + Inspector/Dashboard (right or bottom) |
| **Activity bar icons** | Vertical icon strip switches sidebar context (files, search, git, extensions) | Tab icons switching toolbox context: Components / Stacks / Blueprints |
| **Command palette (Cmd+K)** | Quick action search — keyboard-first power users | Quick search for components, actions, configs — keyboard accessible |
| **Collapsible panels** | Panels can be collapsed, resized, moved, hidden | Toolbox and inspector panels collapsible to maximize canvas space |
| **Breadcrumbs / context bar** | Shows where you are in the file tree | Architecture tier indicator + current blueprint name in top bar |
| **Minimap** | Side minimap of the full document for navigation | Canvas minimap for large architectures (React Flow has this built in) |

**Lucidchart — The Canvas Mechanics**

Lucidchart provides the reference for drag-and-drop canvas interactions — the physical mechanics of placing, connecting, and inspecting elements on a 2D workspace.

| UX Pattern | What It Does | Archie Application |
|-----------|-------------|-------------------|
| **Drag from shape library** | Side panel of shapes, drag onto canvas to place | Drag from toolbox (component cards) onto canvas |
| **Snap-to-grid / alignment guides** | Visual guides for clean positioning | Grid snapping for component placement — clean layouts |
| **Connection handles on hover** | Hover a shape → connection points appear at edges | Hover a component → input/output ports appear for wiring |
| **Shape properties panel** | Click a shape → right panel shows properties, styling | Click a component → inspector shows metrics, config variants, pros/cons |
| **Template gallery** | Start from pre-built templates, modify | Blueprint library — start from WhatsApp/Telegram example, modify |
| **Export options** | Multiple export formats (PNG, PDF, SVG) | YAML export (primary), possibly PNG screenshot for sharing |

### Anti-Patterns to Avoid

| Anti-Pattern | Where It Appears | Why Avoid for Archie |
|-------------|-----------------|---------------------|
| **Modal-heavy workflows** | Many SaaS tools — "create new project" wizard, settings modals stacked on modals | Kills the sandbox feel. Every action should be on-canvas or in-panel, never modal-blocked |
| **Everything visible at once** | Complex dashboards (Grafana without configuration) | 38 metrics + 7 categories = instant overwhelm. Progressive disclosure is non-negotiable |
| **Tiny text tables for data** | Enterprise architecture tools (ArchiMate viewers) | Archie's data must be visual (bars, colors, heatmaps), not tabular |
| **Locked edit modes** | "Click edit to modify, click save when done" | Archie is always editable. No view/edit mode split. The canvas IS the editor |
| **Generic empty states** | "Click here to get started" with no context | Empty canvas should suggest: import YAML, try an example, or drag a component |

### Design Inspiration Strategy

**Adopt directly:**
- VS Code's three-zone layout (sidebar + main + panel) — proven for developer tools
- Factorio's hover-for-detail progressive disclosure — matches emotional design principles
- Lucidchart's drag-from-library canvas mechanic — industry standard for visual builders
- React Flow minimap — essential for large architectures

**Adapt for Archie:**
- Factorio's alt-mode → Archie's heatmap toggle (one keypress to show/hide metric overlay)
- VS Code's activity bar → Archie's three-tab toolbox (Components / Stacks / Blueprints)
- Lucidchart's properties panel → Archie's inspector with live metric recalculation (not static properties)

**Avoid:**
- Lucidchart's modal-heavy template picker — Archie should show examples inline, not in a wizard
- VS Code's steep learning curve for panel management — Archie's panels should have sensible defaults, not require user configuration
- Any "view mode vs edit mode" pattern — Archie is always interactive

## Design System Foundation

### Design System Choice

**Tailwind CSS + shadcn/ui** — utility-first styling with copy-paste accessible components.

This combination provides the speed of a component library with the control of a custom design system. shadcn/ui components are copied into the project (not installed as a dependency), giving full ownership. Radix UI primitives under the hood provide accessibility for free. Tailwind handles all styling through utility classes.

### Rationale for Selection

| Factor | Decision Driver |
|--------|----------------|
| **Solo developer** | shadcn/ui provides pre-built components without building from scratch — dropdowns, tooltips, popovers, tabs, command palette all ready to use |
| **"Polished like a game, serious like a tool"** | Tailwind enables custom aesthetic without fighting a framework's opinionated look (no Material/Google feel) |
| **React Flow compatibility** | Tailwind + React Flow is a well-tested combination in the ecosystem — no style conflicts |
| **Full control** | shadcn/ui components are owned source code, not locked dependencies — can be modified freely as Archie's needs evolve |
| **Accessibility** | Radix UI primitives (keyboard navigation, screen readers, focus management) are baked into every shadcn/ui component |
| **MVP speed** | No need to build buttons, dropdowns, tabs, tooltips, or modals from scratch — focus development time on the canvas and recalculation engine |

### Implementation Approach

**Core stack:**
- **Tailwind CSS** — utility-first styling for all layout, spacing, color, typography
- **shadcn/ui** — pre-built components for the application shell (toolbox, inspector, toolbar, dialogs)
- **React Flow** — canvas library (has its own styling, integrates alongside Tailwind)
- **CSS variables** — design tokens (colors, spacing, radii) defined as CSS custom properties for theming

**Component ownership model:**
- shadcn/ui components are copied into `src/components/ui/` — owned by the project
- Custom canvas components (React Flow nodes, edges, overlays) are built from scratch in `src/components/canvas/`
- Application-specific components (toolbox, inspector, dashboard) compose shadcn/ui primitives

**Key shadcn/ui components needed for MVP:**
- `Tabs` — Three-Tab Toolbox (Components / Stacks / Blueprints)
- `Select` / `DropdownMenu` — Configuration variant selector
- `Tooltip` — Layer 1 hover detail
- `Sheet` / `Drawer` — Inspector panel (collapsible)
- `Command` — Quick search / command palette
- `Card` — Component benefit cards in toolbox
- `Badge` — Tags, categories, tier indicators
- `Button` — Actions (import, export, heatmap toggle)
- `ScrollArea` — Scrollable toolbox and inspector content

### Customization Strategy

**Visual identity — "Polished like a game, serious like a tool":**

- **Color palette:** Dark-mode primary (developer tool convention), with semantic colors for heatmap (red/yellow/green), metric categories, and component categories. Defined as CSS variables for easy iteration.
- **Typography:** System font stack (Inter or similar) — clean, readable, developer-friendly. No decorative fonts.
- **Spacing and density:** Compact but breathable — more information-dense than a consumer app, less dense than a spreadsheet. Toolbox cards need visual breathing room.
- **Border radius:** Subtle rounding (4-6px) — professional, not bubbly. Consistent across all components.
- **Shadows and depth:** Minimal — flat design with subtle elevation for panels and overlays. Canvas should feel like the primary surface, panels feel like tools floating above.
- **Animation:** Purposeful micro-animations for metric recalculation (bar fills, color transitions) and heatmap updates. No decorative animation. CSS transitions via Tailwind's `transition-*` utilities.

**Theming approach:**
- CSS custom properties for all design tokens (colors, spacing, radii, shadows)
- Tailwind config extends default theme with Archie-specific tokens
- Dark mode as default and primary (developer convention), light mode as optional future addition
- Component category colors (Compute = blue, Data Storage = green, Caching = orange, etc.) defined as semantic tokens

## Defining Experience

### The One-Liner

> **"Change a config, see your whole architecture react."**

This is what a user says to a friend. It captures the core value in seven words: interactivity, reactivity, and holistic visibility.

### User Mental Model

**How users solve this today:**

1. Open AI chat → describe architecture → ask "what happens if I switch from X to Y?"
2. AI responds with 3-4 paragraphs of text explaining trade-offs
3. Developer mentally assembles the picture, tries to hold all factors in working memory
4. Asks another question → another 3-4 paragraphs → repeat for each option
5. Eventually commits to a decision based on incomplete mental model

**What Archie changes:**

The text-based, sequential, one-option-at-a-time exploration becomes visual, simultaneous, and interactive. The mental model shift is from "reading about trade-offs" to "seeing and playing with trade-offs."

**The familiar metaphor:** A mixing board. Each component is a channel strip. Turning a knob (changing a config) makes the meters react across all channels. You don't read about what happens — you *watch* it happen.

### Success Criteria

The core interaction succeeds when:

1. **Sub-second feedback** — Config change → visual response in under 200ms. No perceptible delay between action and reaction.
2. **Visible propagation** — The user can *see* the change ripple outward from the source component through its connections. Sequential, Factorio-like — not instant.
3. **Glanceable outcome** — Heatmap colors tell the story before any numbers are read. Green = good, yellow = watch out, red = bottleneck.
4. **Reversibility without undo** — Switching back to the previous config variant restores the previous state. The dropdown IS the undo button.
5. **Peripheral awareness** — While focused on one component's inspector, the user sees the dashboard and heatmap shift in their peripheral vision. They don't need to look away to know something changed.

### Novel UX Patterns

**Pattern classification:**

| Pattern | Type | Reference |
|---------|------|-----------|
| Drag-and-drop from library to canvas | Established | Lucidchart, Figma |
| Click to inspect / properties panel | Established | VS Code, Figma |
| Dropdown to switch configuration | Established | Standard form control |
| **Live metric recalculation across connected components** | **Novel for architecture tools** | Factorio-inspired; no architecture tool does this |
| **Sequential ripple propagation through component graph** | **Novel** | Factorio belt/pipe flow visualization adapted to architecture metrics |
| **Heatmap overlay on interactive component graph** | **Novel combination** | Heatmaps exist (Grafana), component graphs exist (draw.io), but combined on an interactive canvas is new |
| **Tier assessment from component graph analysis** | **Novel** | No equivalent in existing tools |

**Teaching strategy:** The novel patterns don't need explicit teaching because they build on established interactions. The user already knows "click dropdown, see result." The novel part — that the result propagates visually through connected components — is self-evident when it happens. The ripple IS the tutorial.

### Experience Mechanics

**1. Initiation — Three entry points to the core loop:**

| Entry Point | Flow | When Used |
|-------------|------|-----------|
| **Import YAML** | Drop file → architecture appears → click any component → loop begins | AI round-trip workflow (primary use case) |
| **Drag from toolbox** | Drag component → place on canvas → connect → metrics calculate → loop begins | Manual building / exploration |
| **Open example** | Select WhatsApp/Telegram blueprint → full architecture loads → explore by clicking | First-time users, learning |

**2. Interaction — The core loop in detail:**

```
User clicks component on canvas
  → Component highlights (selected state)
  → Inspector panel activates (right side)
  → Shows: current config variant, metric breakdown, pros/cons
  → Config dropdown is prominent and immediately accessible

User selects different config variant from dropdown
  → THIS component's metrics recalculate instantly (bars animate)
  → Sequential ripple begins:
    → Direct connections recalculate next (visible wave, ~100ms delay per hop)
    → Their connections recalculate next
    → Ripple propagates outward until all affected components update
  → Heatmap colors shift on affected components as the wave passes
  → Multi-track scoring dashboard updates after ripple completes
  → Tier indicator updates if threshold crossed

User evaluates the result
  → Heatmap gives instant glanceable read (better or worse?)
  → Inspector shows precise metric values for selected component
  → Dashboard shows overall architecture health across 7 categories
  → Connection lines may change color if compatibility shifted

User decides: keep, try another variant, or switch back
  → Dropdown stays accessible for quick switching
  → Each switch triggers the same ripple
  → No save/apply button — changes are live
  → Switching back triggers reverse ripple (equally satisfying)
```

**3. Feedback — How the user knows it's working:**

- **Sequential ripple** through connected components (the primary "it's alive" signal)
- **Heatmap color shifts** as the wave passes each component
- **Metric bar animations** (smooth fill/empty transitions)
- **Number updates** in inspector panel (precise values on demand)
- **Dashboard bar changes** (peripheral vision — overall health)
- **Connection line color** shifts if compatibility changes (green → yellow WARN)
- **Tier indicator** updates if the change crosses a threshold

**4. Completion — Signals of "done":**

There's no explicit completion — this is a sandbox. But confidence signals:

- **Tier indicator** reaches target tier
- **Heatmap is mostly green** — no red hotspots remaining
- **No WARN indicators** on connections
- User has explored enough variants to understand the trade-off space
- **Export YAML** is the action that signals "I'm satisfied" — the natural exit from the loop

## Visual Design Foundation

### Color System

**Dark Mode Primary (Default)**

Archie uses a dark-mode-first design, consistent with developer tooling conventions and the "polished like a game" aesthetic. Colors are defined as CSS custom properties for easy iteration and future theming.

**Core Tokens:**

| Token | Value | Usage |
|-------|-------|-------|
| Canvas Background | `#0f1117` | Main canvas area — deepest surface |
| Panel Background | `#1a1d27` | Toolbox, inspector, dashboard panels |
| Surface | `#242736` | Cards, elevated elements, dropdowns |
| Border | `#2e3348` | Panel dividers, card borders, subtle separators |
| Text Primary | `#e2e4eb` | Headings, labels, active text |
| Text Secondary | `#8b8fa3` | Descriptions, hints, inactive text |
| Accent (Indigo) | `#6366f1` | Primary actions, selection states, brand identity |
| Accent Hover | `#818cf8` | Interactive state for accent elements |

**Heatmap Semantic Colors:**

| Color | Value | Meaning |
|-------|-------|---------|
| Green | `#22c55e` | Healthy — metric performing well |
| Yellow | `#eab308` | Warning — metric needs attention |
| Red | `#ef4444` | Bottleneck — metric is a concern |

**Component Category Colors (10 categories):**

| Category | Color | Value |
|----------|-------|-------|
| Compute | Blue | `#3b82f6` |
| Data Storage | Green | `#22c55e` |
| Caching | Orange | `#f97316` |
| Messaging | Purple | `#a855f7` |
| Delivery/Network | Cyan | `#06b6d4` |
| Real-Time | Pink | `#ec4899` |
| Auth/Security | Red | `#ef4444` |
| Monitoring | Yellow | `#eab308` |
| Search | Teal | `#14b8a6` |
| DevOps | Violet | `#8b5cf6` |

**Color separation principle:** Category colors identify *what something is* (component type). Heatmap colors identify *how it's performing* (health status). These two color systems never overlap — category color appears as accents (left stripes, icon fills, badges), while heatmap colors appear as border glows and connection line colors when the heatmap overlay is active.

### Typography System

**Font Stack:** Inter (primary), system-ui, -apple-system, sans-serif

Inter was chosen for its excellent readability at small sizes, wide weight range, and widespread use in developer tools. It reads clearly at the compact sizes needed for a data-dense interface.

**Type Scale:**

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Component Name (node) | 12px | 600 | Canvas nodes, toolbox cards |
| Section Label | 10px | 600 | Inspector section headers, card labels (IS/GAIN/COST) |
| Body Text | 13px | 400 | Descriptions, prose content |
| Inspector Title | 16px | 700 | Selected component name in inspector |
| Metric Value | 11px | 600 | Numbers in metric bars and tooltips |
| Dashboard Label | 9px | 400 | Category names below dashboard bars |
| Badge Text | 11px | 600 | Tier indicator, category badges |

**Line Heights:** 1.4 for body, 1.2 for compact labels, 1.6 for prose descriptions.

**Letter Spacing:** 0.5px for uppercase labels (section titles, dashboard categories). Default for everything else.

### Spacing & Layout Foundation

**Base Unit:** 4px

All spacing is derived from multiples of 4px. This creates a consistent visual rhythm across the entire interface.

**Spacing Scale:**

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps (mini metric bars, inline elements) |
| sm | 8px | Card padding, list item gaps |
| md | 12px | Panel padding, section gaps |
| lg | 16px | Major section dividers, dashboard padding |
| xl | 24px | Large content gaps (rare) |

**Layout Dimensions:**

| Element | Size | Notes |
|---------|------|-------|
| Top Bar | 44px height | Fixed, always visible |
| Toolbox | 260px width | Collapsible left panel |
| Inspector | 300px width | Collapsible right panel |
| Dashboard | 100px height | Fixed bottom bar |
| Canvas | Flexible | Fills remaining space |
| Node Width | 140px | Standard canvas node |
| Border Radius | 6px | Default for cards and panels |

**Grid:** No explicit column grid. The three-zone layout (toolbox + canvas + inspector) is the structural grid. Canvas uses pixel positioning with optional snap-to-grid (planned for implementation). Panels are fixed-width with collapse animations.

**Density Philosophy:** Compact but breathable. More dense than a consumer app (every pixel earns its place), less dense than a spreadsheet (visual hierarchy and whitespace guide the eye). The toolbox cards and inspector panels use consistent padding to avoid the "cramped IDE" feel.

### Iconography

**Icons as primary communication:** Icons are the first-read visual language in Archie. Every component category, action, and metric category has an associated icon. Users should be able to identify a component's type from its icon alone, before reading any text.

**Category Icons (SVG, inline):**

| Category | Icon | Metaphor |
|----------|------|----------|
| Compute | CPU chip | Processing power |
| Data Storage | Database cylinder | Persistent storage |
| Caching | Lightning bolt | Speed/instant access |
| Messaging | Chat bubble | Communication between services |
| Delivery/Network | Globe | Traffic routing, external connections |
| Real-Time | Signal waves | Live data, streaming |
| Auth/Security | Shield | Protection, access control |
| Monitoring | Chart/pulse | Observability, health tracking |
| Search | Magnifying glass | Discovery, querying |
| DevOps | Gear/cog | Infrastructure, automation |

**Icon usage rules:**
- Icons appear in: canvas nodes (prominent), toolbox cards (header), inspector panel (category label), dashboard bars (category identifier), tab labels, action buttons
- Icons always pair with their category color for reinforcement
- Icons are 16px in compact contexts, 20px in prominent contexts (node headers)
- Line-style icons (not filled) to maintain the technical, clean aesthetic

### Accessibility Considerations

**Contrast Ratios:**
- Text Primary (`#e2e4eb`) on Panel Background (`#1a1d27`): ~12:1 (exceeds WCAG AAA)
- Text Secondary (`#8b8fa3`) on Panel Background (`#1a1d27`): ~4.6:1 (meets WCAG AA)
- Heatmap Green on Canvas Background: ~5.2:1 (meets WCAG AA)
- Heatmap Red on Canvas Background: ~3.8:1 (supplemented by position and shape, not color alone)

**Color Independence:**
- Heatmap status is never communicated by color alone — metric values (numbers) and bar positions provide redundant information
- Component categories use icons AND color for identification — either alone is sufficient
- Connection health uses line style (solid/dashed) in addition to color

**Keyboard Navigation:**
- All interactive elements (nodes, dropdowns, buttons, tabs) are focusable via Tab
- Arrow keys navigate between canvas nodes when canvas is focused
- Escape deselects the current node
- Keyboard shortcut for heatmap toggle (H key)

**Screen Reader Support:**
- Canvas nodes have ARIA labels: "Component: [name], Category: [category], Config: [variant], Health: [status]"
- Metric bars have ARIA valuenow/valuemin/valuemax
- Dashboard bars announce category and score
- Heatmap toggle announces current state
