---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
classification:
  projectType: web_app
  domain: developer_tooling
  complexity: medium
  projectContext: greenfield
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-archie-2026-02-09.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-09.md'
  - 'docs/brainstorming/00-project-vision.md'
  - 'docs/brainstorming/01-cross-pollination-ideas.md'
  - 'docs/brainstorming/02-morphological-analysis.md'
  - 'docs/brainstorming/03-six-thinking-hats.md'
  - 'docs/brainstorming/04-constraint-mapping-mvp.md'
  - '_bmad-output/planning-artifacts/ux-playground-gap-analysis.md'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 6
  projectDocs: 0
workflowType: 'prd'
date: 2026-02-09
author: Gabe
---

# Product Requirements Document - Archie

**Author:** Gabe
**Date:** 2026-02-09

---

## Executive Summary

**Archie** is a Factorio-inspired visual architecture simulator — a drag-and-drop canvas where software architecture components have interactive metrics that recalculate when you change configurations or swap components. It makes architecture trade-offs visible and explorable instead of hidden in text-based conversations.

**Differentiator:** No existing tool makes architecture trade-offs interactive. Diagramming tools draw static shapes. AI conversations reason in text. Archie is the first tool where changing one component causes all connected metrics to recalculate and display visually — the innovation is the *interface*, not the information.

**Target User:** Technical solopreneurs and developers making architecture decisions. Archie is a critical-moment tool (project start, architecture pivots), not a daily-use product.

**Core Loop:** Configure component → metrics recalculate → heatmap updates → see trade-offs → make informed decision.

**AI-Archie Workflow:** AI generates architecture as YAML → import into Archie → iterate visually → export YAML → return to AI with full context. YAML is the bridge language between AI reasoning and human visual comprehension.

**Business Context:** Solo project by Gabe. Firebase stack (Auth + Firestore + Hosting), no custom backend, no revenue model for MVP. Validated through personal dogfooding on 3+ real projects within 3 months.

## Success Criteria

### User Success

| Criteria | Signal | Measurement |
|----------|--------|-------------|
| **Downstream consequence visibility** | User changes a component and sees cascading effects on connected components — trade-offs that would otherwise emerge months later during development | Architecture with 3+ connected components where config changes propagate visible metric shifts |
| **Visual iteration speed** | User evaluates architecture alternatives faster through visual manipulation than through text-based AI conversations — no context re-explanation needed | User can swap components, change configurations, and compare trade-offs without leaving the canvas |
| **Architecture confidence** | User achieves a target tier on the Architecture Tier System, providing a concrete measure of completeness | Tier completion rate — % of architectures reaching Tier 1+ |
| **Round-trip completion** | User completes the AI → Archie → AI workflow end-to-end | YAML import → canvas iteration → YAML export events |

**The "aha" moment:** Changing a component and seeing that it fixes a problem in one dimension but introduces a new concern downstream — making an informed trade-off instead of discovering a "gotcha" months later. The value is seeing consequences that would otherwise be invisible until implementation.

### Business Success

| Timeframe | Objective | Success Signal |
|-----------|-----------|----------------|
| **3 months** | Dogfood — Gabe uses Archie on real projects and iterates less on architecture in AI workflows | Personal usage on 3+ projects; reduced architecture back-and-forth |
| **6 months** | Community traction — other developers discover and use Archie | 10+ community-created components or architectures |
| **12 months** | Living knowledge base — more current, interactive architectural knowledge than any single book or blog | Component library covers all 10 categories with community contributions |

**Anti-Metrics (what we refuse to optimize for):**
- Daily active users — critical-moment tool, not a daily habit
- Time on platform — faster decisions are better decisions
- Vanity signups — accounts without architectures created are meaningless

### Technical Success

| Criteria | Target | Notes |
|----------|--------|-------|
| **YAML round-trip fidelity** | Lossless — import → modify → export → reimport produces identical state | Foundation of the AI-Archie workflow |
| **Canvas responsiveness** | Smooth drag-and-drop and wiring at MVP component counts (10-20 components) | No hard performance target; "feels right" for a solo user |
| **Metric recalculation** | Near-instant on configuration change for limited component sets | Simple data (text/CSV), limited variables — straightforward |
| **Client-side reliability** | Core computation runs entirely in browser; Firebase provides auth and component library storage | No custom backend; Firebase handles auth and data; no concurrency concerns for MVP |

### Measurable Outcomes

1. **Go/No-Go gate:** Gabe uses Archie on 3+ real projects within 3 months and iterates less on architecture in AI workflows → proceed to community features
2. **Tier adoption:** 80%+ of created architectures reach Tier 1
3. **Return usage:** Users return for new projects or architecture pivots (not daily — but reliably at decision points)

## Product Scope

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — deliver the core trade-off visualization loop (configure → recalculate → see heatmap) with enough content (2-3 example architectures) to validate that visual, interactive architecture exploration is genuinely faster and more insightful than text-based AI conversations.

**Resource Requirements:** Solo developer (Gabe), Firebase stack (Auth + Firestore + Hosting). React + React Flow + Tailwind/shadcn stack. AI-generated component data (Opus 4.6) — no runtime AI dependency.

### MVP Feature Set (Phase 1)

Merged MVP 0+1+2 from brainstorming — Schema + Canvas + Intelligence Layer as one deliverable.

**Core User Journeys Supported:**
- Journey 1: AI-Archie Round-Trip (YAML import → canvas iterate → YAML export)
- Journey 2: Explorer (load example, swap components, compare trade-offs)
- Journey 3: Build from Scratch (empty canvas, drag-and-drop, manual wiring)

**Must-Have Capabilities:**
1. **YAML Schema** — Component, Stack, and Blueprint definitions with versioned schema; import/export via browser File API
2. **Visual Canvas** — React Flow drag-and-drop; Three-Tab Toolbox (Components | Stacks | Blueprints); connection wiring with WARN mode; configuration variant dropdown per component
3. **Parametric Recalculation** — Change a configuration variant → all connected metrics recalculate instantly (deterministic, client-side math)
4. **Bottleneck Heatmap** — Red/yellow/green overlay on components and connections; updates in real-time with every change
5. **Multi-Track Scoring Dashboard** — 7-category view (38 metrics) showing directional ratings per component and aggregate per architecture
6. **Architecture Tier System** — Progressive tier assessment (Foundation → Production-Ready → Resilient); demonstrated on example architectures
7. **Example Architectures** — 2-3 fully defined AI-generated blueprints (WhatsApp, Telegram, possibly Facebook) with all components, connections, configuration variants, and metrics populated
8. **AI Prompt Template** — Static format guide for generating Archie-compatible YAML outside the tool
9. **Component Intelligence** — Implementation code snippets per variant with syntax highlighting, metric explanations with contributing factors, variant recommendations for weak metrics, metric delta indicators on variant switch, and metric filtering in inspector
10. **Connection System** — Connections as first-class inspectable objects with protocol, communication pattern, latency, and co-location properties; draggable labels for readability; per-endpoint health metrics in inspector
11. **Architecture Overview** — Issues summary badge with bottleneck/warning navigation, dashboard expanded overlay showing per-category contributing factors, interactive dashboard categories with educational content, flow particle animation on connections, and canvas legend

**Deferred from MVP (moved to Phase 2):**
- **Priority Sliders** — Weight adjustment across metric categories to rerank scoring. Valuable but not essential for core trade-off visualization — users can mentally prioritize in MVP.
- **Constraint Guardrails** — Hard limits that flag violations (e.g., "budget must stay under X"). Useful refinement but WARN mode on connections covers the critical safety net for MVP.
- **Data Context Items** — Personalized per-component data analysis where users define data items (e.g., "User Sessions, read-heavy, 50KB") and see fit indicators (great/good/trade-off/poor/risky) per variant. Powerful differentiator but adds significant data modeling complexity — deferred to align with Phase 3 personalization features.

### Post-MVP Features

**Phase 2 (Growth):**
- Priority sliders for metric category weighting
- Constraint guardrails with configurable thresholds
- Traffic load dial — adjustable load simulation that modifies flow animation intensity and recalculates metrics under different load scenarios (extends MVP flow particle animation)
- Data context items — user-defined data per component (name, access pattern, size) with fit indicators per variant for personalized trade-off analysis
- Expanded component library (20-30+ across all 10 categories)
- Component swapping via drag-replacement (enhanced UX beyond in-place selector)

**Phase 3 (Expansion):**
- Player profile and gap analysis overlay (separate layer from static architecture metrics)
- Community sharing: post, browse, fork architectures
- AI-powered advisors (SimCity-style recommendations)
- "Describe your app" → AI generates starting blueprint inside Archie
- Embeddable architectures (`<archie-embed>` widget)
- Scenario training library (Black Friday spike, region outage, DDoS)
- GitHub integration with repo-linked architecture usage stats

### Resource Risk Contingency

- *Absolute minimum:* Solo developer, Firebase stack (Auth + Firestore + Hosting). No custom backend, minimal infrastructure cost (Firebase free tier).
- *Smallest viable feature set:* Ship with 1 example architecture (WhatsApp only) instead of 2-3, defer AI prompt template. The core loop (canvas + recalculation + heatmap) is non-negotiable.

## User Journeys

### Journey 1: The AI-Archie Round-Trip (Primary — Happy Path)

**Persona:** Gabe, Technical Solopreneur

**Opening Scene:** It's Saturday morning. Gabe has spent the last two hours brainstorming a new real-time collaboration feature for his personal finance app with Claude. The AI has suggested an architecture involving WebSockets, Redis Pub/Sub, PostgreSQL with event sourcing, and a CDN for static assets. It sounds reasonable in text — but Gabe's been burned before. Last time he trusted an architecture that "sounded right," he spent three weeks building a multi-user sync system that turned out to be overengineered for his scale. He doesn't want to commit weeks of development to something that might have hidden gotchas.

**Rising Action:** Gabe asks Claude to output the architecture in Archie-compatible YAML using the prompt template. Claude generates a complete blueprint file: 6 components, connections, configuration variants, all in the schema Archie understands. Gabe drags the YAML file onto the Archie canvas. The architecture materializes — components placed, connections drawn, metrics visible. The heatmap is mostly green with one yellow spot on the WebSocket server.

He clicks the WebSocket component. The detail card shows operational complexity is medium-high and the headcount requirement warns that this pattern typically needs monitoring attention. He clicks the configuration dropdown and switches from "raw WebSocket server" to "managed WebSocket service (e.g., Pusher/Ably)." The heatmap shifts — operational complexity drops to green, but cost ticks up from low to medium, and vendor lock-in lights up yellow.

**Climax:** Gabe switches the PostgreSQL configuration from "event sourcing" to "standard normalized." Three connected metrics shift simultaneously: data consistency improves, operational complexity drops significantly, but he notices the real-time data flow to Redis now shows a yellow warning — the sync pattern between a normalized DB and Pub/Sub is less natural than event sourcing would have been. He sees a trade-off that would have taken him days to discover during implementation: the "simpler" database pattern actually creates complexity at the integration layer.

He adjusts the priority sliders — weights operational simplicity heavily, since he's one person. The scoring dashboard recalculates. The architecture settles at Tier 2. He can see exactly what he'd need for Tier 3 (adding a monitoring/observability component), but Tier 2 is enough for now.

**Resolution:** Gabe exports the finalized YAML — the version with managed WebSockets and normalized PostgreSQL, knowing exactly what trade-off he's accepting at the integration layer. He pastes it back into his Claude conversation: "Here's the architecture I've settled on. The normalized DB creates some sync complexity with Redis — let's design the sync layer to handle that." The AI has full context. Gabe starts coding with confidence, having explored trade-offs in 15 minutes that would have taken an hour of back-and-forth chat.

### Journey 2: The Explorer (Primary — Discovery Path)

**Persona:** Maya, Builder-Optimizer

**Opening Scene:** Maya is a mid-level backend developer who plays Factorio on weekends and optimizes everything she touches. She's seen Archie mentioned in a dev newsletter and is curious. She doesn't have a specific project in mind — she wants to understand how different architectures actually compare. She's read countless blog posts about microservices vs. monolith, but they all say "it depends" without showing her what it depends *on*.

**Rising Action:** Maya opens Archie and browses the example architectures. She loads the "WhatsApp-style Messaging" blueprint. The canvas fills with components — message queue, database, cache, delivery service, connection manager. All metrics are visible. The heatmap shows a mix of green and yellow, with the message queue handling the heaviest load.

She's curious: what would happen if she replaced Kafka with RabbitMQ? She drags RabbitMQ from the toolbox onto the canvas, swaps it in. The metrics shift — throughput ceiling drops, but operational complexity improves and cost decreases. She sees the trade-off quantified for the first time: Kafka's throughput advantage comes at a real operational cost that a solo developer would feel.

**Climax:** Maya starts experimenting aggressively. She toggles the database between PostgreSQL (normalized), PostgreSQL (denormalized), and MongoDB (document store). Each switch ripples through connected components differently. With denormalized PostgreSQL, read performance improves but the connection to the cache layer becomes less impactful — the cache hit rate benefit shrinks because the DB is already fast for reads. She realizes the cache isn't just "always good" — its value depends on what it's caching *from*.

She discovers something the blog posts never showed her: the optimal architecture depends on which metric you care about most. She adjusts the priority sliders from "balanced" to "operational simplicity first" — the scoring dashboard completely reranks the component choices. Same components, same connections, different priorities, different "best" architecture.

**Resolution:** Maya doesn't export anything or start a project. She closes Archie having spent 30 minutes and learned more about architecture trade-offs than months of reading. She bookmarks it for her next real project. When a colleague asks "why not just use Kafka?" the following week, she has an answer that goes deeper than "it depends."

### Journey 3: Building from Scratch (Primary — Edge Case)

**Persona:** Gabe, Technical Solopreneur (no AI-generated YAML)

**Opening Scene:** Gabe is evaluating whether to add a search feature to his app. It's not a full architecture question — he just needs to understand how adding search (Elasticsearch vs. Algolia vs. PostgreSQL full-text search) would affect his existing stack. He doesn't want to fire up an AI conversation for this — he just wants to see the trade-offs quickly.

**Rising Action:** Gabe opens Archie with an empty canvas. He drags his existing components from the toolbox: PostgreSQL (his primary DB), a Node.js API server, and a Redis cache. He wires them together to represent his current stack. The heatmap and scoring show his baseline.

Now he drags Elasticsearch onto the canvas and connects it to his API server. Metrics shift — search capability appears, but operational complexity spikes (Elasticsearch requires cluster management, index maintenance, and monitoring). Cost increases noticeably. He checks the configuration variants: "managed Elasticsearch (e.g., Elastic Cloud)" reduces operational burden but pushes cost higher.

He removes Elasticsearch and tries Algolia instead. Different trade-off: operational complexity stays low (fully managed), cost is moderate, but vendor lock-in jumps to high. Search speed is excellent.

Finally, he tries PostgreSQL full-text search — no new component needed, just a configuration change on his existing PostgreSQL. Operational complexity doesn't change. Cost doesn't change. But the search capability metric shows "limited" compared to dedicated search engines, and performance degrades under heavy search load.

**Climax:** Gabe sees all three options laid out in his memory — not as blog post prose, but as lived experience of watching metrics react. For his scale (solo, moderate traffic, simple search needs), PostgreSQL full-text search is clearly the right choice: zero additional operational burden, zero additional cost, "good enough" search capability. Elasticsearch and Algolia are for problems he doesn't have yet.

**Resolution:** Gabe doesn't even need to export. He got his answer in 5 minutes. He adds `pg_trgm` to his PostgreSQL setup and moves on. Archie earned its keep not through a grand architecture exercise, but through a quick, targeted trade-off comparison.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| **Round-Trip** | YAML import/export, configuration variant switching, parametric recalculation, heatmap visualization, tier assessment, multi-track scoring, metric explanations, variant recommendations, metric deltas, issues summary, priority sliders *(Phase 2)* |
| **Explorer** | Example architecture loading, in-place component selector (swap type preserving connections), metric comparison across alternatives, code pattern inspection, connection inspection, dashboard drill-down, flow particle animation, priority slider reranking *(Phase 2)* |
| **From Scratch** | Empty canvas workflow, component drag-and-drop from toolbox, manual wiring, rapid add/remove component comparison, configuration variants on existing components, connection label arrangement, canvas legend |

**Cross-cutting requirements from all journeys:**
- Canvas must support both "load a full architecture" and "build incrementally" workflows
- Component swapping must be frictionless via in-place component selector (dropdown on placed component to swap type, preserving connections)
- Configuration variant switching must be the single fastest interaction in the tool
- Heatmap must update in real-time with every change — this is the primary feedback mechanism
- Export must capture the exact current state, including all configuration choices
- Connection inspection must be as accessible as component inspection — click to inspect
- Metric explanations and variant recommendations must build trust in directional data without overwhelming the interface (progressive disclosure via expand/collapse)

## Innovation & Novel Patterns

### Detected Innovation Areas

1. **Interactive trade-off visualization for software architecture** — No existing tool makes architecture trade-offs interactive and visual. Diagramming tools draw static shapes. Cloud reference architectures are vendor-biased text. Blog posts are opinionated prose. Archie is the first tool where changing one component causes all connected metrics to recalculate and display visually. The innovation is the *interface*, not the information.

2. **Two-level component modeling** — Architecture tools treat components as black boxes. Archie opens the box: a PostgreSQL component has configuration variants (normalized, denormalized, event-sourced) that each produce different metrics AND different interaction behaviors with connected components. This is a novel modeling depth no competitor offers.

3. **AI-human bridge via YAML** — As AI-assisted development accelerates, the gap between AI's text-based architecture output and human visual comprehension widens. Archie positions YAML as the bridge language: AI generates it perfectly, humans explore it visually. This round-trip workflow (AI → Archie → AI) is a new interaction pattern at the intersection of AI tooling and human cognition.

4. **Game mechanics applied to professional tooling** — Factorio-inspired parametric recalculation, bottleneck heatmaps, and progressive tier systems applied to software architecture. Not gamification for engagement — game *mechanics* for comprehension. The heatmap exists because it communicates faster than a table of numbers.

### Competitive Landscape

| Tool | What It Does | What Archie Does Differently |
|------|-------------|------------------------------|
| draw.io / Lucidchart | Static diagrams | Interactive metrics, parametric recalculation, heatmaps |
| AWS/GCP Architecture Centers | Vendor-specific reference architectures | Vendor-agnostic, interactive, configuration variants |
| Blog posts / decision matrices | Prose-based comparisons | Visual, explorable, quantified trade-offs |
| AI chat conversations | Excellent reasoning, text-only | Visual canvas that makes AI output explorable and iterable |

No direct competitor exists. The closest analogy is what Figma did to static design mockups — Archie does for static architecture diagrams.

### Validation Approach

- **MVP dogfooding:** Gabe uses Archie on 3+ real projects within 3 months. If parametric recalculation + heatmap + AI round-trip delivers faster, more confident architecture decisions for one person, the core innovation works.
- **Directional accuracy test:** Do the example architectures (WhatsApp, Telegram) produce trade-off insights that match real-world experience? If a senior engineer looks at the metrics and says "yeah, that's roughly right," the data model works.
- **Speed test:** Can a user evaluate 3 architecture alternatives in under 15 minutes? If yes, Archie is faster than the text-based alternative.

### Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Directional-but-wrong data** | High | Confidence indicators on metrics, visible data sources, community correction, tier system as calibration anchor |
| **Two-level model propagation** | High | Start with 2-3 example architectures as integration tests; deterministic recalculation means every case is testable |
| **Canvas + heatmap performance** | Medium | Prototype early; React Flow is battle-tested at 10-20 component scale |
| **Directional metrics dismissed as imprecise** | Medium | Architecture Tier System provides confidence anchoring; dogfooding on 3+ real projects validates sufficiency |
| **Innovation not valued** | Medium | Dogfooding validates personally before community launch; if Gabe doesn't use it, the innovation doesn't matter |
| **Complexity ceiling** | Medium | MVP scoped to 10-20 components; canvas libraries handle rendering; metric recalculation is simple math on limited variables |

## Web App Specific Requirements

### Project-Type Overview

Archie is a Single Page Application (SPA) built with React and React Flow, backed by Firebase (Auth, Firestore, Hosting). Core computation runs in the browser; Firebase provides authentication, component library storage, and hosting. The primary interaction is a drag-and-drop canvas with live parametric recalculation — a precision-interaction tool optimized for desktop use.

### Technical Architecture Considerations

**Application Type:** SPA (Single Page Application)
- React with React Router (minimal: login page + app view)
- No server-side rendering — no SEO requirement
- Firebase backend (Auth + Firestore for component library); no custom API server

**Browser Support:**
- Modern evergreen browsers only (Chrome, Firefox, Safari, Edge — latest 2 versions)
- No IE11, no legacy browser support
- Desktop-first: optimized for 1280px+ viewports (laptop through external monitor)
- Mobile: not supported — canvas drag-and-drop requires mouse precision

**Rendering & Performance:**
- React Flow handles canvas rendering (SVG/HTML hybrid with virtualization)
- Metric recalculation is pure JavaScript computation on in-memory data — no server round-trips
- Component library data loaded at startup (bundled or fetched once) — small dataset (10-20 components for MVP)
- No lazy loading needed for MVP scale

**Data & Persistence:**
- User architectures: YAML file import/export via browser File API (skeleton format — component IDs, positions, connections, config selections)
- Component library (reference data): Firebase Firestore — shared, updatable without app redeployment
- Runtime state: Zustand (in-memory) — hydrated from YAML skeleton + Firestore library data
- File System Access API where available, standard file picker/download as fallback
- Firebase Auth (Google Sign-In) for user identity from Day 1

**SEO:** Not applicable — tool-based SPA with no public content to index.

**Accessibility:** Deferred for MVP. Canvas-based precision interactions are inherently challenging for accessibility. Will revisit post-MVP if community adoption warrants it.

### Implementation Considerations

**Build & Deployment:**
- Vite as build tool (fast development, optimized production builds)
- Firebase Hosting (same Firebase project as Auth + Firestore — single platform)
- Single HTML entry point with bundled JS/CSS
- CI/CD via GitHub Actions (preview deploys on PR, production deploy on merge to main)

**Key Libraries (MVP):**
- React + React Flow (canvas)
- Tailwind CSS + shadcn/ui (UI components)
- Firebase (Auth + Firestore + Hosting)
- Zustand (state management)
- Zod (schema validation — single source of truth for types + runtime validation)
- React Router (minimal routing — login + app)
- js-yaml (YAML parsing/serialization)
- Vitest + Playwright (testing)

**Sections Skipped (per project-type configuration):**
- Native features — not applicable (web only)
- CLI commands — not applicable (GUI tool)
- Mobile-first responsive design — desktop-first tool, no mobile support

## Functional Requirements

### Architecture Composition

- **FR1:** User can create a new architecture on an empty canvas
- **FR2:** User can drag components from the toolbox onto the canvas
- **FR3:** User can create connections between components by wiring their ports
- **FR4:** User can remove components from the canvas
- **FR5:** User can remove connections between components
- **FR6:** User can reposition components on the canvas via drag-and-drop
- **FR7:** System displays a visual warning when the user connects incompatible components (WARN mode — connection is allowed, but flagged)

### Component System

- **FR8:** User can browse available components in a Three-Tab Toolbox organized as Components, Stacks, and Blueprints
- **FR9:** User can view a component's detail card showing its metrics, properties, and trade-off information
- **FR10:** User can swap a placed component for an alternative within the same category via an in-place component selector (e.g., PostgreSQL → MongoDB), preserving all existing connections
- **FR11:** User can switch a component's configuration variant via a dropdown selector (e.g., PostgreSQL normalized → denormalized)
- **FR12:** Each component exposes two levels of selection: component type (what it is) and configuration variant (how it's configured)

### Trade-off Visualization

- **FR13:** System recalculates all affected metrics when a component type, configuration variant, or connection changes
- **FR14:** System propagates metric changes through connected components (changing component A affects metrics displayed on connected component B)
- **FR15:** System displays a bottleneck heatmap (red/yellow/green) overlay on all components and connections
- **FR16:** Heatmap updates in real-time with every component, connection, or configuration change
- **FR17:** System displays a multi-track scoring dashboard showing ratings across 7 metric categories
- **FR18:** User can view per-component directional ratings (low/medium/high) for each of the 38 metrics
- **FR19:** User can view aggregate architecture-level ratings across all metric categories

### Architecture Assessment

- **FR20:** System evaluates the current architecture against the Architecture Tier System
- **FR21:** User can view the current tier level for their architecture (Foundation → Production-Ready → Resilient)
- **FR22:** User can see what components or capabilities would be needed to reach the next tier

### Data Import & Export

- **FR23:** User can import a YAML file to load a complete architecture onto the canvas
- **FR24:** User can export the current canvas state as a YAML file
- **FR25:** Exported YAML captures the architecture skeleton: component IDs, canvas positions, component type selections, configuration variant choices, connections, and schema/library version metadata. Derived data (metrics, descriptions, heatmap state) is re-hydrated from the component library on import
- **FR26:** System performs lossless skeleton round-trip: import → modify → export → reimport produces identical structural state (same component placements, connections, and configuration selections). Computed state (metrics, heatmap, tier) is re-derived from the current component library on each import
- **FR27:** System validates imported YAML against the schema and rejects invalid files with clear error messages

### Content Library

- **FR28:** User can browse and load pre-built example architectures (WhatsApp, Telegram, possibly Facebook)
- **FR29:** Example architectures include fully defined components, connections, configuration variants, and populated metrics
- **FR30:** User can access a static AI prompt template for generating Archie-compatible YAML outside the tool

### Component Intelligence

- **FR31:** Inspector displays representative implementation code snippets per configuration variant with syntax highlighting; code snippets are stored as part of component library data
- **FR32:** Each metric value has an expandable explanation showing a plain-language reason and a list of contributing technical factors; explanations are stored per component + variant + metric in the component library
- **FR33:** System identifies components with metrics below a health threshold and suggests the variant that best addresses the weakness, showing both the improvement amount and the trade-off cost; recommendations are computed from existing metric data, not pre-stored
- **FR34:** When switching configuration variants, the inspector displays +/- delta indicators next to each metric, showing the change amount from the previous configuration; deltas persist until the next variant switch
- **FR35:** Inspector provides a filter to show or hide individual metrics, letting users focus on the metrics most relevant to their current decision

### Connection System

- **FR36:** Connections are first-class inspectable objects with typed properties: protocol, communication pattern, typical latency, and co-location potential; properties are derived from connected components and stored in the component library
- **FR37:** User can click a connection to inspect its properties in the inspector panel, including per-endpoint health metrics showing how each endpoint contributes to overall connection health
- **FR38:** Connection labels on the canvas are draggable so users can reposition them for readability when connections overlap

### Dashboard & Architecture Overview

- **FR39:** Dashboard supports an expanded overlay view showing per-category contributing factors — which specific components and metrics drive each category score
- **FR40:** Dashboard category bars are interactive — clicking shows a description of the category, its key metrics, why it matters, and how to improve it
- **FR41:** System displays an issues summary with a badge count of components that have warning or bottleneck status; clicking opens a dropdown listing each affected component with health status, average score, and worst metric — each entry is clickable to navigate to that component on the canvas

### Canvas Enhancements

- **FR42:** When heatmap is enabled, animated particles flow along connection lines with speed varying by health status (green = fast flow, red = slow/congested flow)
- **FR43:** Canvas displays a semi-transparent legend explaining heatmap colors, connection line styles, and connection type indicators

## Non-Functional Requirements

### Performance

- **NFR1:** Canvas interactions (drag, drop, reposition, connect) must respond within 100ms — no perceptible lag during direct manipulation at MVP component counts (10-20 components)
- **NFR2:** Metric recalculation must complete and render within 200ms of a configuration or component change — fast enough to feel instant, not "loading"
- **NFR3:** Heatmap visual updates must appear synchronously with the metric recalculation that triggers them — no separate loading state
- **NFR4:** YAML import must parse and render a complete architecture (up to 20 components with connections) within 1 second
- **NFR5:** Initial application load (first meaningful paint) must complete within 3 seconds on a standard broadband connection

### Security

- **NFR6:** All imported YAML must be validated against the schema before rendering — reject files with unexpected keys, enforce allowlisted fields only
- **NFR7:** Imported YAML files must be rejected if they exceed 1MB in size
- **NFR8:** All user-provided strings from YAML (component names, descriptions, tags, labels) must be sanitized before DOM rendering — no `dangerouslySetInnerHTML` with untrusted content
- **NFR9:** URL fields in YAML (documentation links, icon references) must be validated to allow only `https://` protocol — reject `javascript:`, `data:`, and other URI schemes
- **NFR10:** The application must not use `eval()`, `new Function()`, or dynamic `import()` on any user-provided content
- **NFR11:** Exported YAML must not include runtime state, environment data, or any data beyond the architecture definition

### Categories Skipped

- **Scalability:** Not applicable for MVP — Firebase handles infrastructure scaling; single-user tool with no custom backend
- **Accessibility:** Basic accessibility included in MVP (ARIA labels on canvas nodes, keyboard navigation, color independence for heatmap status). Full WCAG compliance deferred to post-MVP.
- **Integration:** No external system integrations for MVP
- **Reliability:** Client-side tool with no uptime requirements; data integrity covered by FR26 (lossless round-trip)
