# UX Playground Gap Analysis

**Date:** 2026-02-10
**Source:** Cross-referencing `archie-ux-playground.html` against PRD FRs, NFRs, Architecture, and UX Design Specification
**Purpose:** Identify features implemented in the interactive UX prototype that are not captured as formal requirements in any planning artifact

---

## Context

The UX playground (`archie-ux-playground.html`) is a fully interactive HTML prototype demonstrating the target Archie experience. During epic/story creation, we discovered features present in the playground that have no corresponding Functional Requirement, NFR, or explicit mention in the Architecture or UX Design documents.

These gaps need to be incorporated into the PRD (as new FRs) and the Architecture document (mapped to files/patterns) before proceeding with epic and story creation.

---

## Critical Gaps

These are substantial interactive features central to the playground experience. Each would likely need one or more FRs.

### Gap 1: Code Patterns / Implementation Snippets

**What the playground does:**
The inspector panel shows syntax-highlighted code snippets for each component's active configuration variant. For example:
- API Gateway with Nginx variant → shows Nginx config syntax
- API Gateway with AWS API GW variant → shows AWS CDK code
- API Gateway with Kong variant → shows Kong declarative YAML

Code snippets change when the user switches variants, making the difference between configurations tangible at the implementation level.

**Why it matters:**
This is one of the playground's strongest educational features. Abstract metric differences (e.g., "Op. Simplicity: 45 vs 80") become concrete when the user sees the actual code they'd write. It bridges the gap between "what changes" (metrics) and "how it changes" (code).

**What's missing from requirements:**
No FR covers displaying implementation patterns or code examples per component/variant. FR9 covers "detail card showing metrics, properties, and trade-off information" but doesn't mention code patterns.

**Suggested FR scope:**
- System displays representative implementation code per configuration variant
- Code snippets are stored as part of component library data
- Syntax highlighting in the inspector panel

---

### Gap 2: Data Context Items (Personalized Trade-off Analysis)

**What the playground does:**
Each component has user-defined "data context items" that describe what data the component handles in the user's specific architecture. For example, Redis might have:
- "User Sessions" (read-heavy, ~50KB)
- "Rate Limit Counters" (write-heavy, small)
- "Message Cache" (mixed, ~200KB)

When the user switches configuration variants, a "Your Data Context" section shows how each data item behaves under that variant with fit indicators:
- Great fit / Good fit / Trade-off / Poor fit / Risky

Users can edit these data items to personalize the analysis.

**Why it matters:**
This is the key differentiator between generic metric scores and personalized advice. Without it, metrics are abstract numbers. With it, the user sees "Your sessions are read-heavy, so Cache-Aside is great for them, but your rate limit counters are write-heavy, so Cache-Aside is a poor fit."

**What's missing from requirements:**
No FR covers user-defined data context, fit indicators, or personalized per-item analysis. This is distinct from the static metrics (FR18) and the deferred player profile (Phase 3).

**Suggested FR scope:**
- User can define data context items per placed component (name, access pattern, size)
- System evaluates fit of each data item against the active configuration variant
- Fit indicators (great/good/trade-off/poor/risky) displayed per item
- Data context items are included in YAML export/import

**Note:** Consider whether this should be MVP or Phase 2. It significantly enriches the experience but adds data modeling complexity.

---

### Gap 3: Metric Explanations (Why This Score?)

**What the playground does:**
Each metric in the inspector has an expandable explanation showing:
- **Reason:** A plain-language explanation of why this component+variant scores the way it does
- **Contributing Factors:** A bulleted list of specific technical factors

For example, Redis (Cache-Aside) → Consistency metric:
- Reason: "Cache and database can diverge. Stale data persists until TTL expires or manual invalidation."
- Factors: "No automatic cache invalidation on DB write", "TTL creates a staleness window", "Concurrent writes can race between cache and DB"

**Why it matters:**
This builds trust in directional data. Users can verify that the scores make sense and understand the reasoning. Without explanations, scores feel arbitrary. With them, scores feel credible and educational.

**What's missing from requirements:**
FR18 covers "per-component directional ratings" but doesn't mention explanations or contributing factors. FR9 covers "trade-off information" broadly but doesn't specify this depth.

**Suggested FR scope:**
- Each metric value has an associated explanation (reason + contributing factors)
- Explanations are stored as part of component library data (per component + variant + metric)
- User can expand/collapse explanations in the inspector

---

### Gap 4: Variant Recommendations

**What the playground does:**
When a component's current variant has a low-scoring metric (below 70), the inspector shows a recommendation:
- "Consider switching to [variant name]"
- Shows which metric improves and by how much
- Shows the trade-off cost (which metric gets worse)

For example: "Consider Fastify — Op. Simplicity improves +15, but Reliability drops -5"

**Why it matters:**
Guides exploration without being prescriptive. Instead of the user trying every variant, the system suggests the most relevant alternative based on the current weak point. This accelerates the core loop.

**What's missing from requirements:**
No FR covers variant recommendations or suggestions. The closest is FR22 (what's needed for next tier), but that's at the architecture level, not the component level.

**Suggested FR scope:**
- System identifies components with weak metrics (below threshold)
- System suggests the variant that best addresses the weakest metric
- Recommendation shows improvement amount AND trade-off cost
- Recommendations are computed, not stored (derived from existing metric data)

---

### Gap 5: Connection Inspection (First-Class Connections)

**What the playground does:**
Connections between components are inspectable first-class objects. Clicking a connection label on the canvas opens the inspector with:
- **Protocol:** HTTP/REST, RESP (Redis), Kafka TCP, PostgreSQL Wire Protocol, etc.
- **Communication Pattern:** Request-Response, Pub-Sub, Poll-Consume, Fire-and-Forget
- **Typical Latency:** e.g., "<1ms (in-memory)", "1-5ms (local network)"
- **Co-location:** Whether components can run on the same machine
- **Implementation Code:** How the connection works in code
- **Connection Health:** Per-endpoint metric breakdown showing how each endpoint contributes to overall connection health

**Why it matters:**
The playground treats connections as more than lines — they have properties that affect architecture decisions. Protocol choice impacts latency, communication pattern affects coupling, and co-location determines infrastructure options. This depth is missing from the requirements.

**What's missing from requirements:**
FR3 covers creating connections. FR5 covers removing them. FR7 covers WARN mode on incompatible connections. But no FR covers:
- Inspecting connection properties
- Connection protocol, pattern, latency, or co-location data
- Connection health detail or per-endpoint metrics
- Implementation code per connection

**Suggested FR scope:**
- Connections have typed properties (protocol, pattern, latency, co-location)
- User can click a connection to inspect its properties in the inspector panel
- Connection properties are derived from the connected components and stored in component library data
- Connection health is displayed based on the metrics of both endpoints

---

### Gap 6: Issues Summary (Architecture Health Overview)

**What the playground does:**
A button in the top bar shows a badge with the count of components that have warnings or bottlenecks. Clicking it opens a dropdown listing:
- Component name and category
- Health status (red = bottleneck, yellow = warning)
- Average score and worst metric
- Clickable — selects the component on the canvas

**Why it matters:**
Provides a quick overview of architecture health without scanning the entire canvas. Especially useful for larger architectures where some components might be off-screen. Acts as a todo list for architecture improvement.

**What's missing from requirements:**
No FR covers an issues summary, health overview, or problem navigation feature. The closest is FR15-FR16 (heatmap), which shows health visually on the canvas, but there's no aggregated list view.

**Suggested FR scope:**
- System maintains a list of components with non-green health status
- User can view an issues summary showing count and details
- Clicking an issue navigates to / selects that component
- Issues list updates in real-time with metric changes

---

## Moderate Gaps

These enhance the experience but are more visual/UX polish than core functionality.

### Gap 7: Node Shape Variations per Category

**What:** Each of 10 component categories has a distinct node shape on the canvas (Compute = sharp rectangle, Data Storage = cylinder with rounded bottom, Caching = pill, Messaging = alternating corners, Delivery = stadium). Provides instant visual identification beyond color.

**Missing from:** No FR or UX spec mentions shape variation. UX spec mentions "colored blocks with names" at Layer 0 but not distinct shapes.

---

### Gap 8: Dashboard Expanded Overlay

**What:** Clicking an expand button on the dashboard reveals a detailed overlay showing per-category contributing factors — which components and which metrics contribute to each category score.

**Missing from:** FR17 and FR19 cover the dashboard and aggregate ratings but not an expanded breakdown view.

---

### Gap 9: Dashboard Clickable Category Info

**What:** Clicking a dashboard category bar shows an info popup with: description, key metrics, why it matters, and how to improve. Educational content about each metric category.

**Missing from:** No FR covers dashboard interactivity beyond display.

---

### Gap 10: Metric Filter (Show/Hide Metrics)

**What:** Inspector provides a filter dropdown to show/hide individual metrics, letting users focus on metrics they care about.

**Missing from:** FR18 covers viewing metrics but not filtering them.

---

### Gap 11: Flow Particle Animation

**What:** When heatmap is enabled, animated particles flow along connection lines. Speed varies by health status (green = fast flow, red = slow/congested). Provides a visceral sense of data flow health.

**Missing from:** No requirement mentions animated particles. UX spec mentions "micro-animations for metric recalculation" but not flow animation on connections.

---

### Gap 12: Canvas Legend

**What:** A semi-transparent legend in the canvas corner explaining heatmap colors (green/yellow/red), connection line styles (solid/dashed), and connection type indicators.

**Missing from:** No FR covers a canvas legend. Implicitly useful but not specified.

---

### Gap 13: Connection Label Dragging

**What:** Connection labels on the canvas (showing protocol type) are draggable so users can reposition them for readability when connections overlap.

**Missing from:** No FR covers connection label positioning.

---

### Gap 14: Dynamic Prompt Generator

**What:** A collapsible section at the bottom generates a live-updating text description of the current architecture state — including layout specs, current selection, heatmap state, and all interaction patterns. This goes significantly beyond FR30's static AI prompt template. It dynamically reflects the current canvas state for copy-paste into AI conversations.

**Missing from:** FR30 covers "a static AI prompt template." The playground implements a dynamic, state-aware prompt generator.

---

### Gap 15: Metric Delta Indicators

**What:** When switching configuration variants, the inspector shows +/- delta values next to each metric bar, indicating what changed and by how much. Deltas persist until the next variant switch.

**Missing from:** No FR covers delta display. FR13 covers recalculation but not the display of change amounts.

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **Critical** | 6 | Core interactive features needing new FRs |
| **Moderate** | 9 | UX enhancements needing FR additions or spec updates |
| **Total** | 15 | Features in playground not captured in requirements |

## Recommended Action

1. **Update PRD:** Add new FRs for critical gaps (Gap 1-6). Consider which moderate gaps warrant FRs vs. UX spec updates.
2. **Update Architecture:** Map new FRs to files, patterns, and data model changes (especially connection properties, data context items, and metric explanations — these affect the component library schema).
3. **Decide MVP scope:** Some gaps (especially Data Context Items, Gap 2) could be deferred to Phase 2. Others (Metric Explanations, Connection Inspection) are arguably essential for the "trust in directional data" principle.
4. **Then proceed:** Re-run epics/stories with complete requirements.
