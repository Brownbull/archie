---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: COMPLETE
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-09.md'
  - 'docs/brainstorming/00-project-vision.md'
  - 'docs/brainstorming/01-cross-pollination-ideas.md'
  - 'docs/brainstorming/02-morphological-analysis.md'
  - 'docs/brainstorming/03-six-thinking-hats.md'
  - 'docs/brainstorming/04-constraint-mapping-mvp.md'
date: 2026-02-09
author: Gabe
---

# Product Brief: Archie

## Executive Summary

Archie is a Factorio-inspired visual architecture simulator where developers snap together software building blocks — databases, caches, queues, CDNs, load balancers — and instantly see directional trade-offs in speed, cost, reliability, scalability, and complexity. It transforms architecture decisions from scattered text conversations and blog post research into an interactive, visual experience where trade-offs are as clear as they are in a factory simulation game.

As AI-assisted development accelerates, developers co-create increasingly complex architectures through text-based AI conversations — but the human cognitive ceiling for processing architectural complexity through text alone is real. Archie fills the widening visualization gap: YAML definitions serve as the shared language that AI reads perfectly, while the interactive visual canvas is how humans actually process and understand complex systems. The result is a tool where defining an architecture reveals static trade-offs, experimenting with component swaps reveals directional impact, and pressing play reveals emergent behavior — three dimensions of architectural understanding that no existing tool provides.

Archie is not a precision simulator. It is a directional reference tool — pointing developers toward better or worse, not calculating exact milliseconds. It targets solopreneurs, small teams, and junior developers: the fastest-growing developer segment and the most underserved by existing architecture tooling.

---

## Core Vision

### Problem Statement

Software architecture decisions are made blind. Developers choose between databases, caching strategies, messaging systems, and deployment patterns based on fragmented sources — AI chat conversations, blog posts, vendor documentation, and personal experience. Each source provides partial, text-based information that requires the developer to mentally assemble and hold the complete picture in working memory.

In a tool like Factorio, every gear and belt clearly communicates its cost, throughput, and failure modes. Trade-offs are visible, immediate, and interactive. In software architecture, equivalent trade-off information exists but is invisible — scattered across documentation, buried in experience, and impossible to see holistically without years of practice.

### Problem Impact

- **Time drain:** Evaluating architecture options requires lengthy, context-heavy AI conversations or extensive documentation research. Each option must be explored step-by-step, with no way to see the full picture simultaneously.
- **Confidence gap:** Developers commit to architectures without knowing if they've covered critical dimensions — security, scalability, operational complexity, cost. The fear of missing a "gotcha" is constant.
- **Experience barrier:** Senior architects carry mental models built over years. Junior developers and solopreneurs lack this intuition and have no tool to accelerate building it.
- **AI context burden:** As AI-assisted development grows, explaining architecture decisions to AI requires massive context. Getting the right answer depends on providing the right framing — a fragile and exhausting process.

### Why Existing Solutions Fall Short

| Solution | What It Does | What It Misses |
|----------|-------------|----------------|
| **Diagramming tools** (draw.io, Lucidchart) | Static box-and-arrow diagrams | No metrics, no trade-offs, no simulation — just shapes |
| **Cloud architecture centers** (AWS, GCP) | Vendor-specific reference architectures | Lock-in bias, no interactivity, no personalization |
| **Blog posts / decision matrices** | Prose-based comparisons | Static, opinionated, quickly outdated, no visual exploration |
| **AI chat conversations** | Excellent explanations and reasoning | Text-only, no visual aid, requires enormous context, step-by-step only |

No existing tool provides interactive, visual, simulatable architecture exploration with directional trade-off feedback. The gap is not information — it's **interface**.

### Proposed Solution

Archie provides a visual canvas where developers drag-and-drop architecture components, connect them, configure variants, and see trade-offs update in real-time across 38 metrics in 7 categories. Components are "machines" with configuration variants (e.g., PostgreSQL with normalized vs. denormalized schema) that affect both the component's own metrics and its interactions with connected components.

Three dimensions of architectural understanding:
1. **Define** — Place components and see static trade-offs (cost, complexity, skill requirements)
2. **Explore** — Swap components, change configurations, watch all connected metrics recalculate
3. **Simulate** — Press play and see directional behavior under load (bottlenecks, data flow, failure points)

Everything is backed by YAML — human-readable, git-versionable, AI-parseable, community-shareable. No vendor lock-in, no database required.

### Key Differentiators

1. **Interactive trade-off visualization** — Not static diagrams. Change one thing, everything recalculates. No other tool does this for software architecture.
2. **Configuration variants (two-level modeling)** — Goes inside the component. PostgreSQL with write-ahead logging vs. synchronous replication are different machines with different trade-offs. No competitor models this depth.
3. **Directional, not precise** — Intentionally qualitative (low/medium/high). This makes data generation feasible via AI and community, avoiding the impossible task of exact performance simulation.
4. **YAML-first, zero lock-in** — Architectures live in your repo as YAML files. Create them in a text editor, load them in Archie, share them as files.
5. **Bridge between AI and human cognition** — YAML is the lingua franca AI reads perfectly; the visual canvas is how humans actually understand complex systems. Archie translates between both.
6. **Personalization layer** — Architecture metrics are static/objective. Player profile is a separate gap analysis: "this architecture needs Redis expertise you don't have yet."

---

## Target Users

### Primary Users

#### Persona 1: "The Technical Solopreneur" — Gabe

**Profile:** A developer proficient in multiple languages (Python, JavaScript, Java, Go, Rust, and more) who builds web applications solo. Uses AI-assisted workflows extensively — agentic tools for brainstorming, architecture design, and development. Comfortable with code, frameworks, and tools, but struggles with **how to best combine tools at the architecture level** to maximize performance and minimize trade-offs.

**Context:** Already using AI to co-develop architectures, but AI output is text-only. Has to mentally assemble complex systems, worry about missed "gotchas," and invest significant time in context-heavy conversations to evaluate one option at a time. Knows how to code anything — the gap is seeing how pieces fit together and what the trade-offs actually look like.

**Pain Points:**
- Evaluating architecture trade-offs requires long, context-heavy AI conversations that explore options one at a time
- No visual way to see how components interact, where bottlenecks emerge, or what gets worse when something gets better
- Must rely on personal experience to catch architectural blind spots — and hopes the AI catches the rest
- Data structure decisions (flat vs. tree vs. normalized) within components are invisible until implemented

**Success Moment:** Imports an AI-generated architecture into Archie, swaps the caching strategy, watches latency and cost metrics shift, tries a different data structure representation, sees the trade-offs clearly, and exports the finalized YAML back to their AI workflow — confident they've covered their bases.

**Archie Usage Pattern:** Critical-moment tool. Used at project inception, at architecture pivot points, and when new requirements challenge existing decisions. Not daily — but indispensable when needed.

#### Persona 2: "The Builder-Optimizer"

**Profile:** A technical developer (not necessarily solopreneur) who thinks in systems. Plays Factorio, optimizes workflows, enjoys understanding *why* one approach beats another. Could be mid-level, could be senior — what defines them is the mindset: they want to see the machine work, not just be told it works.

**Context:** Finds existing architecture resources (blog posts, AI conversations, cloud reference architectures) informative but frustrating — all text, all fragmented, no interactivity. Wants to tinker, experiment, and discover trade-offs through interaction rather than reading.

**Pain Points:**
- Reads about architecture patterns but can't *feel* the trade-offs until building
- Knows there are better approaches but lacks a sandbox to explore them safely
- Team discussions about architecture are abstract without a shared visual

**Success Moment:** Drags a message queue between two services, sees throughput improve but operational complexity spike, toggles a configuration variant, finds the sweet spot — and understands *why* it's the sweet spot.

### Secondary Users

#### Tech Leads (Small Teams, 2-5 developers)

Use Archie to **communicate, justify, and iterate** on architecture decisions with their team. "Here's why we're using this stack — look at the trade-offs." Shared visual artifact for alignment. Same systems-thinker personality as primary users, but with a communication need on top.

#### Self-Directed Learners

Junior developers or career-changers who know how to code and are learning architecture. **No dedicated hand-holding** — Archie provides a basic platform tutorial ("here's how it works"), and from there, if you have the systems-thinking mindset, you figure it out. Explore community architectures, swap components, see what happens. Future features (community ratings, starred architectures) serve this group, but they are not a Day 1 design priority.

### Explicitly NOT Building For

- **Non-technical users** — Archie requires understanding of coding concepts, tools, and frameworks
- **Enterprise architects with large teams and budgets** — May find value later, but not the target. Their tooling needs (governance, compliance workflows, team permissions) are a different product
- **People who need hand-holding** — The Factorio player doesn't need to be told why optimization matters. Neither does the Archie user.

### User Journey

**The AI-Archie Round-Trip:**

1. **Trigger:** Developer has a new project (or hits an architecture decision point on an existing one)
2. **AI Architecture Draft:** Developer brainstorms architecture with their AI agent/workflow
3. **Bridge to Archie:** Archie provides a prompt template / format guide so the AI can output architecture in Archie-compatible YAML. Alternatively, Archie shows general architecture paths (database, frontend, backend, monitoring, deployment) and the developer fills in components manually
4. **Import & Visualize:** Developer loads the YAML into Archie's canvas. Components appear connected, metrics visible
5. **Explore & Iterate:** Swap components, change configuration variants (e.g., try normalized vs. denormalized data structure), see trade-offs update across all 38 metrics. Play simulation to see directional behavior under load
6. **Confidence:** Developer sees they've covered security, scalability, cost, operational complexity. Bottlenecks are visible. Trade-offs are explicit and acceptable
7. **Export & Continue:** Export finalized YAML, feed it back into AI agent workflow, proceed with development
8. **Return:** Come back when requirements change, a decision doesn't hold up, or curiosity drives exploration of alternatives

---

## Success Metrics

### User Success Metrics

| Metric | Signal | How We Measure |
|--------|--------|----------------|
| **Architecture confidence** | Developer achieves a target tier on Archie's core principle checklist | Tier completion rate — % of architectures reaching Tier 1+ |
| **Trade-off clarity** | Developer can see and compare trade-offs visually instead of mentally assembling from text | Architecture completed with 3+ components connected and metrics reviewed |
| **Round-trip completion** | Developer completes the AI → Archie → AI workflow | YAML import → iteration → YAML export events |
| **Community contribution** | Other developers create new components, stacks, or blueprints | New community-created content items on the platform |
| **Architecture reuse** | Developers save, share, and fork each other's architectures | Architectures posted/saved on the platform; forks created |

### Architecture Tier System (Confidence Framework)

Archie defines core architectural principles organized into progressive tiers:

- **Tier 1 (Foundation):** Basic coverage — data persistence, compute, delivery. Architecture functions but may have gaps in reliability, security, or scalability.
- **Tier 2 (Production-Ready):** Covers reliability, monitoring, security basics, and operational concerns. Architecture is deployable with confidence.
- **Tier 3 (Resilient):** Advanced patterns — redundancy, failover, caching strategies, load management. Architecture handles growth and failure gracefully.

Developers see which tier their architecture achieves, giving a concrete, shareable measure of completeness. "My architecture is Tier 2 on Archie" becomes a meaningful signal of confidence.

### Business Objectives

| Timeframe | Objective | Success Signal |
|-----------|-----------|----------------|
| **3 months** | Dogfood — Gabe uses Archie on his own projects and iterates less on architecture decisions | Personal usage; reduced back-and-forth on architecture in AI workflows |
| **6 months** | Community traction — other developers find Archie, use it, and contribute content | 10+ community-created components or architectures on the platform |
| **12 months** | Living knowledge base — Archie contains more current, interactive architectural knowledge than any single book or blog | Component library covers all 10 categories with community contributions; architectures reflect current tools and patterns |

### Business Model

**Phase 1 (Current):** Open and free. Priority is utility, community adoption, and content generation. The platform's value grows with community contributions — a network effect.

**Future considerations:**
- GitHub integration: track how many repositories use or reference a given architecture ("142 repos started from this blueprint")
- Premium features (if warranted): advanced simulation, private architectures, team collaboration
- Business model decisions deferred until community traction validates the concept

### Key Performance Indicators

| KPI | Target | Measurement |
|-----|--------|-------------|
| **Architectures created** | 10+ in first 3 months (personal use) | Platform analytics |
| **Community components** | First external contribution within 6 months | Content creation events |
| **Architecture tier completion** | 80%+ of created architectures reach Tier 1 | Tier assessment results |
| **Return usage** | Users return for new projects or architecture pivots | Returning user sessions |
| **YAML round-trips** | Users complete import → iterate → export flow | Import/export events |

### Anti-Metrics (What We Don't Optimize For)

- **Daily active users** — This is a critical-moment tool, not a daily habit. Low DAU is expected and healthy.
- **Time on platform** — Faster decisions are better decisions. We don't want users stuck in Archie.
- **Vanity signups** — Accounts without architectures created are meaningless.

---

## MVP Scope

### Core Features

**1. YAML Schema (Foundation)**
- Component YAML schema: identity, base_metrics (directional: low/medium/high), ports, configurations dictionary, tags, pros/cons
- Stack YAML schema: collection of pre-wired components
- Blueprint YAML schema: complete architecture with layout metadata
- Versioned schema with self-contained, portable definitions
- AI prompt template / format guide: a static script or template that developers give to their AI agent to generate Archie-compatible YAML

**2. Visual Canvas (Core Experience)**
- Drag-and-drop canvas (React Flow or similar)
- Three-Tab Toolbox: Components | Stacks | Blueprints
- Component benefit cards in the toolbox (what it IS, what you GAIN, what it COSTS)
- Place components, wire connections, WARN on incompatible ports
- Click any component for full detail card (metrics, pros/cons, configurations)
- Select configuration variant from dropdown, see metrics update
- YAML import (load architecture from file) and YAML export (save architecture to file)

**3. Intelligence Layer (What Makes It Useful)**
- Parametric recalculation: change a configuration variant → all connected metrics recalculate
- Bottleneck heatmap: red/yellow/green overlay on components showing directional stress points
- Multi-track scoring dashboard: 7 metric categories displayed as parallel bars
- Constraint guardrails: set a constraint (e.g., budget limit), get violation warnings
- Priority sliders: weight what matters to you, scoring adjusts

**4. Architecture Tier System**
- Core architectural principles organized into progressive tiers
- Tier assessment: architecture is evaluated against principles and assigned a tier
- At minimum, tiers defined and demonstrated on the example architectures
- Tier count and definitions will be refined during implementation (not locked to 3)

**5. Example Content (AI-Generated)**
- 2-3 complete example architectures: WhatsApp, Telegram, possibly Facebook
- Components needed for those architectures fully defined with metrics and configuration variants
- At least 1 example stack (e.g., "Real-Time Messaging Stack")

### Out of Scope for MVP

| Feature | Why Deferred | When |
|---------|-------------|------|
| **Animated flow simulation** ("press play") | Significantly more complex than heatmap; parametric recalculation provides the core value | Post-MVP enhancement |
| **Player profile / personalization** | Architecture metrics are static/objective; gap analysis is a separate layer | Post-MVP |
| **Community features** (sharing, browsing, marketplace) | Tool validated by dogfooding first; community needs a base of content to be useful | Post-MVP |
| **AI-powered features in the tool** | AI builds the content, not the runtime. Tool is static/deterministic | Intentionally excluded |
| **Failure simulation** (click component → simulate outage) | Advanced simulation feature | Post-MVP |
| **A/B comparison view** | Useful but not essential for core workflow | Post-MVP |
| **Traffic load dial** | Full simulation mode deferred | Post-MVP |
| **User accounts / authentication** | Not needed for local-first, YAML-file-based tool | Post-MVP (when community features arrive) |
| **20-30 component library** | MVP ships with components needed for examples; library grows post-MVP via AI generation | Post-MVP |

### MVP Success Criteria

The MVP is successful when:

1. **Gabe can complete the AI-Archie round-trip** — Generate architecture YAML via AI, import into Archie, iterate on the canvas, export finalized YAML back to AI workflow
2. **Trade-offs are visible and interactive** — Changing a configuration variant causes connected metrics to recalculate; bottleneck heatmap highlights stress points
3. **Example architectures demonstrate value** — WhatsApp and Telegram architectures are explorable, with clear trade-offs visible across tiers
4. **Architecture tier assessment works** — A completed architecture receives a tier rating, giving measurable confidence
5. **The tool is faster than an AI conversation** — For evaluating architecture trade-offs, Archie provides clarity in minutes that would take an hour of text-based back-and-forth

**Go/No-Go for post-MVP:** If Gabe uses Archie on 3+ real projects within 3 months and iterates less on architecture in AI workflows, proceed to community features.

### Future Vision

**Near-term (post-MVP):**
- Animated flow simulation with traffic load dial
- Player profile and gap analysis overlay
- Expanded component library (20-30+ components across all 10 categories)
- Community sharing: post/browse/fork architectures

**Medium-term (6-12 months):**
- Architecture tier system expanded with community-defined principles
- GitHub integration (repos linked to architectures, usage stats)
- Forking with diff view (see what changed between architectures)
- Component registry with ratings and common pairings

**Long-term (12+ months):**
- AI-powered advisors (SimCity-style: "Your storage layer is overloaded, consider adding a cache")
- "Describe your app" → AI generates starting blueprint inside Archie
- Embeddable architectures (`<archie-embed>` widget for blog posts and docs)
- Scenario training library (Black Friday spike, region outage, DDoS attack)
- Architecture knowledge map with learning progression
- Rebalancing alerts for architecture drift
