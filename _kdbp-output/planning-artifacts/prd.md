---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: COMPLETE
classification:
  projectType: web_app
  domain: developer_tooling
  complexity: high
  projectContext: brownfield
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-archie-2026-02-09.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/implementation-readiness-report-2026-02-12.md'
  - '_bmad-output/planning-artifacts/ux-playground-gap-analysis.md'
  - 'docs/brainstorming/00-project-vision.md'
  - 'docs/brainstorming/01-cross-pollination-ideas.md'
  - 'docs/brainstorming/02-morphological-analysis.md'
  - 'docs/brainstorming/03-six-thinking-hats.md'
  - 'docs/brainstorming/04-constraint-mapping-mvp.md'
  - 'docs/roadmap/phase-2-plan.md'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 5
  planning: 6
  roadmap: 1
workflowType: 'prd'
date: 2026-03-06
author: Gabe
context: brownfield-replacement
---

# Product Requirements Document - Archie (Phase 2)

**Author:** Gabe
**Date:** 2026-03-06

---

## Executive Summary

**Archie** is a Factorio-inspired visual architecture simulator -- a drag-and-drop canvas where software components have interactive metrics that recalculate when you change configurations or swap components. Phase 1 (shipped) delivers the core trade-off visualization loop: canvas, recalculation engine, heatmap, YAML import/export, component intelligence, and example architectures covering all 43 functional requirements.

**Phase 2** adds personalization -- the layer that transforms Archie from an objective architecture reference into a tool that answers "does this work for MY project?" Three features were explicitly deferred from Phase 1: priority sliders (weight what matters to you), constraint guardrails (hard limits that flag violations), and data context items (define your actual data shapes, see per-variant fit indicators). The Stacks tab, currently a placeholder, also becomes functional.

**Target user:** Technical solopreneurs and developers at architecture decision points. Critical-moment tool -- used at project start and architecture pivots, not daily.

**Core loop (unchanged):** Configure component -> metrics recalculate -> heatmap updates -> see trade-offs -> make informed decision. Phase 2 enriches this loop: weighted scoring reranks "best," constraints flag violations, and data context makes trade-offs personal.

**AI-Archie workflow:** AI generates YAML -> import into Archie -> iterate visually -> export YAML -> return to AI. Phase 2 extends the YAML skeleton with weight profiles, constraints, and data context -- so the round-trip carries personalization state.

## What Makes It Special

**No existing tool makes architecture trade-offs interactive, visual, AND personal.** Phase 1 proved the core innovation: changing one component causes all connected metrics to recalculate visually. Phase 2 adds the missing dimension -- "best for whom?"

Priority sliders answer: "If I care more about reliability than cost, which architecture wins?" Constraint guardrails answer: "Does this architecture violate my actual requirements?" Data context items answer: "Is PostgreSQL a great fit for MY read-heavy 50KB session data, or just generically good at consistency?"

This is the bridge between objective architecture metrics (Phase 1) and subjective project-specific analysis (Phase 2) -- without contaminating the static data that makes Archie trustworthy.

## Project Classification

| Dimension | Value |
|-----------|-------|
| **Project Type** | Web Application (SPA) |
| **Domain** | Developer Tooling (general) |
| **Complexity** | High |
| **Context** | Brownfield (Phase 1 shipped, Phase 2 scope) |
| **Stack** | React + React Flow + Zustand + Tailwind/shadcn + Firebase |
| **Builder** | Solo developer (Gabe), AI-assisted workflow |

**High complexity drivers:** New domain model (DataContextItem) intersecting existing objective metrics, YAML schema version migration, boundary between static and contextual scoring.

## Success Criteria

### User Success

Phase 1's "aha" moment: *change a config, see your whole architecture react.* Phase 2's "aha" moment: *change your priorities, see a different "best" architecture emerge.*

| Criteria | Signal | Measurement |
|----------|--------|-------------|
| **Personalized decision clarity** | User adjusts priority sliders and the scoring dashboard reranks -- revealing that the "best" architecture depends on what you weight | Architecture with sliders adjusted away from default, followed by an export |
| **Constraint-driven confidence** | User defines hard limits (e.g., "cost must stay medium or below"), sees violations flagged instantly, adjusts architecture to resolve them | Architecture with 1+ active constraints and zero unresolved violations at export |
| **Data-aware trade-offs** | User defines actual data shapes and sees per-variant fit indicators -- "Redis is great for YOUR session data, poor for YOUR rate-limit counters" | Architecture with 2+ data context items defined, variant switches after viewing fit indicators |
| **Extended round-trip fidelity** | YAML export captures weights, constraints, and data context. Reimport restores personalized state identically | Lossless round-trip including all Phase 2 extensions |

### Business Success

| Timeframe | Objective | Success Signal |
|-----------|-----------|----------------|
| **3 months** | Dogfood validation -- Gabe uses Phase 2 features on real projects and finds priority sliders + constraints change actual architecture decisions | Slider/constraint adjustments lead to different component choices than balanced default |
| **6 months** | Community traction -- exported YAML files with weight profiles shared between developers | Weight profiles become a shareable artifact in community conversations |
| **12 months** | Data context as differentiator -- users report data-aware fit indicators keep them coming back | Data context usage in 50%+ of active architectures |

**Anti-Metrics (carried from Phase 1):**
- Daily active users -- still a critical-moment tool
- Time on platform -- faster decisions are better
- Vanity signups -- architectures without personalization used are meaningless

### Technical Success

| Criteria | Target | Notes |
|----------|--------|-------|
| **Extended YAML round-trip** | Lossless -- weights, constraints, data context survive import/export/reimport | Schema v2 migration must not break v1 YAML files |
| **Recalculation with weights** | Under 200ms with weighted scoring applied | Weights add one multiplication per metric -- negligible |
| **Data context fit calculation** | Under 200ms for up to 10 data items per component | New computation path -- must not degrade core loop |
| **Schema backward compatibility** | v1 YAML imports into v2 app without errors, defaults applied for missing fields | Migration registry handles upgrade |

### Measurable Outcomes

1. **Go/No-Go for Phase 3:** Gabe uses priority sliders on 3+ real projects and makes different architecture decisions than the balanced default -> proceed to community features
2. **Data context validation:** At least 1 architecture where data context fit indicators changed a component choice
3. **Constraint utility:** At least 1 architecture where a constraint guardrail caught a violation the user hadn't noticed

## Product Scope

### Phase 1 Summary (Shipped)

43 FRs delivered across 4 epics: canvas + component system, trade-off intelligence (recalculation, heatmap, dashboard, tiers), YAML workflow + content library, and component/connection intelligence polish. All 11 NFRs met.

### Phase 2 -- MVP (This PRD)

| Feature | What It Does | Complexity |
|---------|--------------|------------|
| **Priority Sliders** | 7 sliders (one per metric category) to weight scoring. Dashboard recalculates. Tier system adjusts. YAML export includes weight profile. | Moderate |
| **Constraint Guardrails** | Hard thresholds per category that flag violations. Visual indicators on canvas + dashboard. Operates on weighted scores. | Moderate |
| **Data Context Items** | User-defined data shapes (name, access pattern, size) per component. Per-variant fit indicators (great/good/trade-off/poor/risky). | High |
| **Stacks Tab** | Functional Stacks tab -- browse and place pre-composed technology bundles (e.g., MERN stack = MongoDB + Express + React + Node.js) as a unit. Distinct from Blueprints: Stacks are technology bundles, Blueprints are full architecture patterns associated with companies or design patterns (e.g., WhatsApp, event-driven). | Low-Moderate |

**Dependency order:**
```
Priority Sliders (standalone)
  -> Constraint Guardrails (uses weighted scores)
    -> Data Context Items (new domain model, biggest change)
Stacks Tab (independent, any time)
```

**Key design decisions (Phase 2):**
- **Weight persistence:** Local-only. Weight profiles live in the YAML file, not Firestore. No cross-device persistence. Simple, aligns with file-first philosophy. Firestore storage deferred to Phase 3 (community features may require it).
- **Stacks vs. Blueprints:** Separate entities. Stacks = technology bundles (MERN, LAMP, JAMstack). Blueprints = full architecture patterns tied to company examples or design patterns (WhatsApp messaging, event-driven microservices). Different content, different browsing intent.

### Phase 3 -- Growth (Future)

- Player profile and gap analysis overlay
- Community sharing: post, browse, fork architectures
- Community component library with voting
- Accessibility improvements (WCAG compliance)

### Phase 4 -- Vision (Future)

- AI-powered advisors (SimCity-style recommendations)
- "Describe your app" -> AI generates starting blueprint
- Embeddable architectures (`<archie-embed>` widget)
- Scenario training library
- GitHub integration with repo-linked architecture stats

### Resource Risk Contingency

- *Absolute minimum Phase 2:* Ship priority sliders only. The core personalization insight ("what's best depends on what you prioritize") is proven with sliders alone.
- *If data context proves too complex:* Ship sliders + constraints, defer data context to Phase 3 alongside player profile (both are personalization layers).

## User Journeys

Phase 1 established three core journeys (AI Round-Trip, Explorer, Build from Scratch). Phase 2 extends each with personalization capabilities and adds three new journeys.

### Journey 4: The Priority Shift (Phase 2 -- Primary)

**Persona:** Gabe, Technical Solopreneur

**Opening Scene:** Gabe has been using Archie for two weeks. He's imported three different architectures for a new real-time collaboration feature and compared them side by side. All three score similarly on the balanced dashboard -- the heatmaps look roughly the same. He knows he cares far more about operational simplicity (he's one person) than raw throughput, but Archie treats both equally. The tool is helpful but isn't giving him the final push toward a decision.

**Rising Action:** Gabe opens the priority settings. Seven sliders appear, one per metric category, all centered at equal weight. He drags "Operational Complexity" to high priority and "Raw Throughput" down to low. The dashboard recalculates instantly -- and the three architectures that looked similar before now show dramatic differences. The managed-services architecture jumps to the top. The self-hosted Kafka architecture, which had great raw scores, drops because its operational burden is now weighted heavily.

He notices a yellow constraint badge he hadn't seen before -- he adds a constraint: "Cost category must stay at medium or below." One architecture immediately shows a red violation indicator. He clicks it, sees which component is the offender (Elastic Cloud's managed pricing pushes cost to high), and considers alternatives.

**Climax:** Gabe switches back and forth between two weight profiles -- "solo developer" (operational simplicity heavy) vs. "small team" (balanced). The same architecture scores differently under each profile. He realizes he's not just choosing an architecture -- he's choosing it FOR a specific context. He exports the YAML with the "solo developer" weight profile baked in, knowing that if he hires someone next year, he can reimport and re-evaluate with different weights.

**Resolution:** Gabe pastes the YAML back into Claude with a note: "This architecture is optimized for solo operational simplicity. The constraint is cost <= medium. Here's where the weak points are." Claude has full context -- not just the architecture, but Gabe's priorities and constraints. The conversation is immediately productive because the AI knows what trade-offs Gabe has already accepted.

### Journey 5: The Data Reality Check (Phase 2 -- Primary)

**Persona:** Gabe, Technical Solopreneur

**Opening Scene:** Gabe is evaluating caching strategies. Redis scores well across all metrics. But his actual data is unusual -- he has large session objects (500KB+, not typical 50KB) with complex nested structures that need partial updates. Generic Redis scores don't capture this nuance.

**Rising Action:** Gabe opens the data context panel on his Redis component. He adds two data items:
- "User Sessions" -- read-heavy, 500KB average, complex nested JSON, partial updates needed
- "Rate Limit Counters" -- write-heavy, tiny (100 bytes), simple key-value

He selects the "Cache-Aside" configuration variant. The fit indicators appear:
- User Sessions: **Trade-off** -- "Cache-Aside handles reads well but 500KB objects increase memory pressure and serialization overhead. Partial updates require full object replacement in cache."
- Rate Limit Counters: **Great fit** -- "Small, write-heavy counters are ideal for Cache-Aside with short TTL."

He switches to "Write-Through" variant:
- User Sessions: **Poor fit** -- "Write-through with 500KB objects creates significant write amplification. Every partial update writes 500KB to both cache and store."
- Rate Limit Counters: **Good fit** -- "Consistent, but unnecessary overhead for ephemeral counters."

**Climax:** Gabe sees something the generic metrics never showed: his data shapes make the "best" caching strategy depend on WHICH data he's caching. The solution isn't one cache configuration -- it's recognizing that his two data types need different strategies. The fit indicators made this visible in seconds instead of discovering it weeks into implementation.

**Resolution:** Gabe exports the architecture with data context items included. When he returns next month with a new data type ("analytics events -- write-heavy, 2KB, append-only"), he reimports and adds it to the context. The fit indicators immediately show how the new data interacts with his existing cache strategy.

### Journey 6: The Stack Explorer (Phase 2 -- Secondary)

**Persona:** Maya, Builder-Optimizer

**Opening Scene:** Maya doesn't have a specific project -- she's curious about how different technology stacks compare. She's heard MERN and MEAN stacks mentioned constantly but has never seen a visual comparison of their trade-offs.

**Rising Action:** Maya opens the Stacks tab. Unlike the Components tab (individual pieces) or the Blueprints tab (full architectures like WhatsApp), the Stacks tab shows technology bundles: MERN, MEAN, LAMP, JAMstack, T3 Stack. Each card shows what's included and a quick trade-off summary.

She drags the MERN stack onto an empty canvas. Four components appear pre-wired: MongoDB, Express, React, Node.js. All connections are already established. The heatmap and dashboard show the stack's baseline trade-offs immediately.

She then drags the MEAN stack onto a second area of the canvas. Angular replaces React, everything else is the same. She can see the metric differences between the two stacks side by side -- Angular's steeper learning curve vs. React's larger ecosystem, both with the same backend trade-offs.

**Climax:** Maya realizes Stacks are the fast on-ramp she's been missing. Instead of dragging four components and wiring them manually, she gets a pre-configured starting point and then customizes from there. She swaps MongoDB for PostgreSQL in the MERN stack and watches the metrics shift -- understanding the trade-off of replacing the "default" choice in a popular stack.

**Resolution:** Maya has explored three stacks in 10 minutes. She hasn't exported anything or started a project, but she now understands the trade-off landscape of popular technology combinations. Next time she sees "just use MERN" advice, she knows exactly what that choice costs and gains.

### Phase 1 Journey Extensions

**Journey 1 (AI Round-Trip) -- Phase 2 extends:** YAML now carries weight profiles, constraints, and data context items. The AI-Archie-AI loop becomes richer -- AI receives not just the architecture, but the developer's priorities and data shapes. AI can generate better-targeted advice because it knows what the developer cares about and what their data looks like.

**Journey 2 (Explorer) -- Phase 2 extends:** Explorers can now adjust priority sliders to answer "what if I cared more about X?" while browsing example architectures. Stacks tab provides a new entry point for exploration. The discovery experience becomes more personal -- same architecture, different conclusions depending on priorities.

**Journey 3 (Build from Scratch) -- Phase 2 extends:** Builders can start from a Stack instead of individual components. After building, they add data context items and constraints to validate their architecture against their real-world requirements before committing.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| **Priority Shift** | Priority sliders, weighted dashboard recalculation, weight profile in YAML export/import, constraint definition + violation indicators, multiple weight profile comparison |
| **Data Reality Check** | Data context items (name, access pattern, size), per-variant fit indicators, fit indicator changes on variant switch, data context in YAML export/import |
| **Stack Explorer** | Stacks tab with pre-composed bundles, stack drag-and-drop as unit, stack vs. blueprint distinction, stack customization (swap individual components) |
| **Phase 1 extensions** | Weight profile in YAML, constraints in YAML, data context in YAML, stacks as starting point for build-from-scratch |

**Cross-cutting requirements from Phase 2 journeys:**
- Priority sliders must be the fastest interaction after variant switching -- drag and see instant recalculation
- Constraint violations must be visually prominent without blocking the user (WARN pattern, not BLOCK)
- Data context fit indicators must feel like an extension of existing metric display, not a separate system
- Weight profiles must survive YAML round-trip with no fidelity loss
- Stacks must place as a unit but remain individually editable after placement

## Innovation Analysis

*Domain requirements skipped -- developer tooling with no compliance concerns.*

### Detected Innovation Areas

1. **Personalized scoring on objective data (Phase 2 -- novel)** -- Phase 1 metrics are static and objective: PostgreSQL's consistency score doesn't change based on who's looking. Phase 2 introduces a subjective layer (data context fit indicators) that sits ALONGSIDE the objective metrics without contaminating them. This dual-track scoring model -- "here's what the technology does objectively" + "here's how it fits YOUR specific data" -- is novel in architecture tooling.

2. **Weight-profile-as-artifact (Phase 2 -- novel)** -- Priority sliders create a portable, shareable artifact: your weight profile. "Here's my reliability-first scoring" becomes something you can share, compare, and evolve. Weight profiles embedded in YAML make personalization a first-class part of the architecture definition, not a UI preference.

3. **Interactive trade-off visualization (Phase 1 -- carried forward)** -- No existing tool makes architecture trade-offs interactive and visual. Still the core differentiator. Phase 2 doesn't change this -- it makes it personal.

4. **AI-human bridge via YAML (Phase 1 -- extended)** -- YAML as the bridge language between AI reasoning and human visual comprehension. Phase 2 enriches this bridge: the YAML now carries not just "what the architecture IS" but "what the developer CARES ABOUT" (weights, constraints, data context).

### Validation Approach

- **Dual-track scoring validation:** Does the separation between objective metrics and contextual fit indicators feel natural? Validated through dogfooding on 3+ real architectures.
- **Weight profile utility:** Do different weight profiles produce meaningfully different scoring outcomes? If all weight configurations produce similar rankings, the feature adds complexity without value.
- **Data context accuracy:** Do fit indicators match real-world experience? If a senior developer looks at fit indicators and says "yeah, that's roughly right for my data shapes," the model works.

### Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Dual-track confusion** | High | Clear visual separation between objective metrics and contextual fit. Different visual treatment (metric bars vs. fit badges). Progressive disclosure -- fit indicators only appear after user defines data context. |
| **Fit indicator accuracy** | High | AI-generated fit rules with clear contributing factors. Community correction path in Phase 3. Transparent reasoning ("why this rating?") builds trust even when approximate. |
| **Weight profiles feel cosmetic** | Medium | Test with architectures that have genuine trade-off diversity. If all architectures rank similarly under different weights, sliders feel pointless. |
| **Data context overcomplicates the core loop** | Medium | Data context is additive -- the core loop works without it. Users who don't define data context see exactly what Phase 1 showed. |

## Web App Specific Requirements

### Key Questions (Phase 2 Update)

| Question | Phase 1 Answer | Phase 2 Impact |
|----------|---------------|----------------|
| **SPA or MPA?** | SPA (React + React Flow) | No change |
| **Browser support?** | Modern evergreen only (latest 2 versions) | No change |
| **SEO needed?** | No -- tool-based SPA | No change |
| **Real-time?** | Client-side recalculation only | No change -- weights/constraints/fit are all client-side |
| **Accessibility?** | Basic ARIA + keyboard + color independence | No change for Phase 2 |

**New for Phase 2:**
- **Schema migration:** v1 YAML files must import cleanly into v2 app. Missing fields default gracefully.
- **Increased data complexity:** Data context items add a new domain model and calculation path.
- **UI surface growth:** Four new UI areas (sliders, constraints, data context, Stacks tab) must integrate into existing layout without clutter.
- **Component library extension:** Stack definitions and fit rules need storage alongside existing component library data.

### Implementation Considerations

- Priority sliders: dashboard area or settings panel
- Constraint editor: settings panel or inspector sidebar
- Data context items: inspector panel extension (per-component)
- Stacks tab: third tab in existing Three-Tab Toolbox (already has placeholder)

## Project Scoping & Phased Development

### MVP Strategy

**Problem-solving MVP** -- Phase 2 solves one problem: "the same architecture can't be 'best' for everyone." Priority sliders prove this with minimal surface area.

### Feature Prioritization

| Priority | Feature | Rationale |
|----------|---------|-----------|
| **Must-have** | Priority Sliders | Core Phase 2 value prop. Proves personalization changes decisions. |
| **Must-have** | YAML schema v2 (weights + backward compat) | Sliders are useless if weight profiles don't survive export/import. |
| **Should-have** | Constraint Guardrails | Builds on sliders. Adds "hard limits" to "soft preferences." |
| **Should-have** | Stacks Tab | Fills existing placeholder. Independent, low risk. |
| **Could-have** | Data Context Items | Highest value but highest complexity. Could ship after sliders + constraints validated. |
| **Won't-have** | Player profile, community, AI advisors | Phase 3+ |

### Phased Delivery Within Phase 2

```
Epic 5: Priority Sliders + Schema v2 (~3 stories)
  -> Standalone. Validates core personalization concept.

Epic 6: Constraint Guardrails (~2-3 stories)
  -> Depends on Epic 5 (constraints use weighted scores).

Epic 7: Data Context Items (~4-5 stories)
  -> Biggest change. New domain model.

Stacks Tab (~1-2 stories)
  -> Independent. Can slot in with any epic.
```

### Risk-Based Scoping

| Risk | Type | Mitigation |
|------|------|------------|
| **Data context domain model complexity** | Technical | Prototype fit calculation early. Defer to Phase 3 if too complex. |
| **Schema v2 breaks existing YAML** | Technical | Build migration registry first. Test with all example architectures. |
| **Weight profiles don't differentiate** | Market | Test with existing examples. If extreme weights don't change rankings, feature is cosmetic. |
| **UI clutter from four new panels** | UX | Progressive disclosure -- hidden until user opts in. |
| **Stacks content creation** | Resource | AI-generate 3-5 popular stacks. Same approach as Phase 1. |

## Functional Requirements

Phase 1 delivered FR1-FR43 across 10 capability areas. Phase 2 adds FR44-FR72 across 5 new capability areas.

### Priority & Scoring Personalization

- **FR44:** User can adjust priority weight for each of the 7 metric categories via individual sliders
- **FR45:** System recalculates the scoring dashboard using the user's weight profile when any slider value changes
- **FR46:** Weighted scoring updates the heatmap overlay -- component health reflects weighted category scores, not balanced defaults
- **FR47:** Tier system evaluation adjusts to reflect weighted scoring -- the same architecture may achieve a different tier under different weight profiles
- **FR48:** User can reset all priority sliders to equal weight (default balanced profile) with a single action
- **FR49:** System displays weighted and unweighted scores side by side so the user can see the impact of their weight adjustments
- **FR50:** Priority slider positions are included in the YAML skeleton on export and restored on import

### Constraint Management

- **FR51:** User can define constraint guardrails as hard thresholds on any metric category (e.g., "Cost must not exceed medium")
- **FR52:** System evaluates all active constraints after every recalculation (including weighted recalculation) and flags violations
- **FR53:** Constraint violations display as visual indicators on affected components on the canvas (distinct from heatmap -- WARN pattern, not BLOCK)
- **FR54:** Dashboard displays an aggregate constraint status showing the count of active constraints and count of violations
- **FR55:** User can click a constraint violation indicator to navigate to the violating component and see which constraint is breached and by how much
- **FR56:** User can add, edit, and remove constraints without affecting the architecture state (constraints are an overlay, not a modification)
- **FR57:** Active constraints and their thresholds are included in the YAML skeleton on export and restored on import

### Data Context & Fit Analysis

- **FR58:** User can define data context items on any placed component, specifying: name, access pattern (read-heavy / write-heavy / mixed / append-only), average data size, and structure type (simple key-value / nested JSON / relational / binary blob)
- **FR59:** System evaluates each data context item against the component's active configuration variant and produces a fit indicator: great fit / good fit / trade-off / poor fit / risky
- **FR60:** Each fit indicator includes an expandable explanation showing the reason for the rating and contributing factors (same progressive disclosure pattern as Phase 1 metric explanations, FR32)
- **FR61:** Fit indicators update when the user switches configuration variants on the component -- showing how different variants handle the same data shapes
- **FR62:** User can add, edit, and remove data context items per component without affecting objective metrics (data context is a separate analysis layer)
- **FR63:** Data context items are included in the YAML skeleton on export and restored on import (fit indicators are re-derived from current library data on import, not stored statically)

### Stack Browsing & Placement

- **FR64:** User can browse pre-composed technology stacks in the Stacks tab of the Three-Tab Toolbox
- **FR65:** Each stack card displays the included components, their pre-wired connections, and a summary trade-off profile
- **FR66:** User can drag a stack from the Stacks tab onto the canvas, placing all included components with their pre-defined connections as a single action
- **FR67:** After placement, stack components are individually editable -- user can swap individual components within a placed stack (using existing in-place component selector, FR10), change configuration variants, add/remove connections, and reposition components independently
- **FR68:** System loads stack definitions from the component library alongside existing component, blueprint, and connection data

### Extended Data Import/Export

- **FR69:** System supports YAML schema v2 which extends v1 with weight profile, constraints, and data context sections
- **FR70:** System imports v1 YAML files without error, applying default values for missing Phase 2 fields (equal weights, no constraints, no data context items)
- **FR71:** System validates Phase 2 YAML extensions against the v2 schema -- rejecting invalid weight profiles, malformed constraints, and invalid data context items with clear error messages
- **FR72:** Exported YAML includes Phase 2 sections (weights, constraints, data context) only when the user has actively used those features -- no empty sections in exports from users who haven't touched Phase 2 features

## Non-Functional Requirements

Phase 1 delivered NFR1-NFR11. Phase 2 adds NFR12-NFR19.

### Performance

- **NFR12:** Weighted scoring recalculation must complete and render within 200ms of any slider adjustment -- same responsiveness target as Phase 1 metric recalculation (NFR2)
- **NFR13:** Data context fit indicator calculation must complete within 200ms for up to 10 data context items per component
- **NFR14:** Constraint evaluation must complete synchronously with recalculation -- no separate loading state for violation checks
- **NFR15:** Stack placement (drag from Stacks tab to canvas) must render all included components with connections within 500ms for stacks containing up to 6 components

### Security

- **NFR16:** All user-provided strings from data context items (names, descriptions) must be sanitized before DOM rendering -- same sanitization rules as Phase 1 YAML imports (NFR8)
- **NFR17:** Constraint threshold values must be validated as numeric within expected ranges -- reject non-numeric or out-of-range values
- **NFR18:** Imported YAML v2 extensions (weight profiles, constraints, data context) must be validated against the v2 schema before applying -- reject malformed Phase 2 data with clear error messages without corrupting the base architecture import
- **NFR19:** Weight profile values must be validated as numeric between 0 and 1 (inclusive) -- reject values outside this range on import

### Categories Skipped

- **Scalability:** Not applicable -- Firebase handles infrastructure. Single-user tool, no custom backend.
- **Accessibility:** Phase 2 maintains Phase 1's basic accessibility (ARIA labels, keyboard nav, color independence). Full WCAG compliance deferred to Phase 3.
- **Reliability:** Client-side tool with no uptime requirements. Data integrity covered by FR70 (backward compatibility) and extended round-trip fidelity.
- **Integration:** No new external system integrations in Phase 2.
