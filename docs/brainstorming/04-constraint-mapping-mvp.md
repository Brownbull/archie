# Phase 4: Constraint Mapping — MVP Roadmap

**Status:** COMPLETE

## Real Constraints

| Constraint | Type | Impact |
|-----------|------|--------|
| Solo developer | Hard | Everything must be buildable by one person |
| Time | Hard | Need to see results in reasonable timeframe |
| Budget | Soft | Bootstrapping, minimal infra costs |
| Data accuracy | Soft | AI-generated, directional not precise — manageable |
| Canvas complexity | Technical | Drag-drop with live recalculation is non-trivial |

## Critical Path

```
Step 1: YAML Schema Definition
  ↓ (everything depends on this)
Step 2: Component Library (AI-generated, 20-30 core components)
  ↓ (can't build UI without components to display)
Step 3: Canvas / Build Mode UI
  ↓ (core interaction surface)
Step 4: Metric Recalculation Engine
  ↓ (makes the canvas useful)
Step 5: Heatmap + Multi-Track Scoring
  ↓ (makes trade-offs visible)
Step 6: Import/Export YAML
  ↓ (enables sharing and persistence)
```

## MVP Breakdown

### MVP 0: The Schema (Foundation)

**Goal:** Define the YAML schema for components, stacks, and blueprints.

**Deliverables:**
- Component YAML schema: identity, base_metrics (directional: low/medium/high), ports, configurations dictionary, tags, pros/cons
- Stack YAML schema: collection of pre-wired components
- Blueprint YAML schema: complete architecture with layout
- 3 example components fully defined (e.g., PostgreSQL, Firebase, Redis)
- 1 example stack (e.g., "Auth Stack")
- 1 example blueprint (e.g., "Simple Web App")

**Why first:** Every other feature reads/writes this format. Get it wrong and everything breaks.

### MVP 1: The Canvas (Core Experience)

**Goal:** Visual canvas where you drag components, connect them, and see their attributes.

**Deliverables:**
- Drag-and-drop canvas (React Flow or similar)
- Three-Tab Toolbox panel: Components | Stacks | Blueprints
- Component benefit cards in the toolbox
- Place components, wire connections, WARN on incompatible ports
- Click any component for full card (metrics, pros/cons, configurations)
- Select configuration variant from dropdown, see metrics update
- Load/save as YAML file

### MVP 2: The Intelligence Layer (What Makes It Useful)

**Goal:** Parametric recalculation, heatmaps, scoring.

**Deliverables:**
- Change configuration variant → all connected metrics recalculate
- Bottleneck heatmap (red/yellow/green on components)
- Multi-track scoring dashboard (7 metric categories as parallel bars)
- Constraint guardrails (set budget limit, get violation warnings)
- Priority sliders (weight what matters to you)

### MVP 3: The Personalization Layer

**Goal:** Player profile and gap analysis.

**Deliverables:**
- Player profile setup (team size, skills, budget, experience)
- Gap analysis overlay (architecture requirements vs. player capabilities)
- Skill gap indicators on components
- Budget constraint mode (live counter)

### MVP 4: Community Seed

**Goal:** Make it shareable and start building a library.

**Deliverables:**
- 20-30 AI-generated components across all 10 categories
- 5-10 pre-built stacks
- 3-5 complete blueprints (common architectures)
- Challenge-based browsing (filter by problem)
- Blueprint library browser
- Share/import YAML via file or URL

## Future Roadmap (Post-MVP)

### Views
- Play / Simulation Mode with traffic load dial
- Instrument Panel for monitoring
- Mixing Board View, A/B Comparison, Knowledge Map, Efficient Frontier, Timeline

### Simulation
- Solo/Mute, Failure Simulation, Time-Based Simulation
- Scenario Training Library, Critical Path Highlighting, Animated Flow

### Community
- Forking with Diff View, Community Marketplace, Component Registry with Ratings
- Architecture Comments, Version History
- Karma/rating system for community validation of data accuracy

### Personalization
- Matchup Analysis, "What Can I Build?" Mode, Substitution Suggestions
- "Avoid Tolls" Mode, Time-to-Production ETA, Multiple Routes

### Progression
- Mastery-Based Unlocks, Growth Quest Log, Knowledge Map
- Blind Spot Detection, Challenge / Puzzle Mode

### Intelligence
- AI-powered advisors (SimCity-style)
- "Describe your app" → AI generates starting blueprint
- Embeddable architectures (`<archie-embed>` widget)
- Rebalancing alerts for architecture drift
