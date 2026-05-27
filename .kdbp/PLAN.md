# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Epic 12: Typed Port System & Schema v3 — Replace generic source/target handles with 7 typed, colored port types (http, database, cache, stream, monitor, auth, cdn). Components define their ports, nodes render colored Handle dots, edges connect compatible port pairs only. Includes topology checker, schema v3 migration, and port compatibility replacing the old category-pair system.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-05-27
- **Last Updated:** 2026-05-30

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Port types & schema foundation | PORT_TYPES constants, PortDefinition Zod schema, extend ComponentSchema with ports array | mvp | medium | ✅ | ✅ | ✅ | ✅ |
| 2 | Port-aware node rendering | Replace 2 generic Handles with dynamic colored port dots, inputs-left / outputs-right | ent | high | ✅ | ✅ | ✅ | ✅ |
| 3 | Port-compatible edge creation | Update addEdge for sourceHandle/targetHandle, rewrite compatibilityChecker, hybrid warn/block | ent | high | ✅ | ✅ | ✅ | ✅ |
| 4 | Topology checker engine | New topologyChecker: orphan nodes, missing hops, unreachable components; Issues panel integration | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 5 | Component library port data | Author port definitions for all 30+ components, validate coverage across categories | mvp | medium | 🔄 | ⬜ | ✅ | ⬜ |
| 6 | Schema v3 migration & YAML round-trip | v2 detection, auto-mapping heuristic, legacy edge type, v3 export, E2E tests | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Edge visual upgrade | Color edges by port type, legacy edges grey dashed, particle color inheritance | mvp | medium | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- Manual override is fine — edit cells by hand any time -->

## Phase Details

### Phase 1 — Port types & schema foundation

```yaml
phase: 1
types: [data-model, schema-migration]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D6
```

- **Tier chosen:** `mvp`
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dims:** 0
- **Trade-offs accepted:** See DECISIONS.md D6
- **Key files:** `src/lib/constants.ts`, `src/schemas/componentSchema.ts`, `src/types/index.ts`

### Phase 2 — Port-aware node rendering

```yaml
phase: 2
types: [user-facing, ui-kit, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, UI Kit, Client State]
suppressed_dims_count: 7
decisions_entry: D7
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX (3 dims, 1 suppressed), UI Kit (3 dims, 1 suppressed), Client State (2 dims, 5 suppressed)
- **Suppressed dims:** 7 (Streaming, Platform variance, Cache invalidation, Optimistic updates, Cross-tab sync, Offline support, Stale data)
- **Trade-offs accepted:** See DECISIONS.md D7
- **Key files:** `src/components/canvas/ArchieNode.tsx`, `src/stores/architectureStore.ts`
- **Runtime evidence:** Browser verification of port dot rendering on nodes with 1-7 ports, hover states, dynamic node height

### Phase 3 — Port-compatible edge creation

```yaml
phase: 3
types: [user-facing, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, Client State]
suppressed_dims_count: 7
decisions_entry: D8
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX (2 dims, 2 suppressed), Client State (2 dims, 5 suppressed)
- **Suppressed dims:** 7
- **Trade-offs accepted:** See DECISIONS.md D8
- **Key files:** `src/engine/compatibilityChecker.ts` (or new `portCompatibilityChecker.ts`), `src/stores/architectureStore.ts`, `src/components/canvas/ConnectionWarning.tsx`
- **Runtime evidence:** Browser verification of drag-from-port-to-port edge creation, incompatible drop rejection, warn mode visual

### Phase 4 — Topology checker engine

```yaml
phase: 4
types: [engine, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client State]
suppressed_dims_count: 6
decisions_entry: D9
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, Client State (1 dim, 6 suppressed)
- **Suppressed dims:** 6
- **Trade-offs accepted:** See DECISIONS.md D9
- **Key files:** new `src/engine/topologyChecker.ts`, `src/components/layout/IssuesSummary.tsx`

### Phase 5 — Component library port data

```yaml
phase: 5
types: [content, data-model]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D10
```

- **Tier chosen:** `mvp`
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dims:** 0
- **Trade-offs accepted:** See DECISIONS.md D10
- **Key files:** Firestore component YAML files (30+ components)

### Phase 6 — Schema v3 migration & YAML round-trip

```yaml
phase: 6
types: [schema-migration, data-model]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D11
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dims:** 0
- **Trade-offs accepted:** See DECISIONS.md D11
- **Key files:** `src/services/yamlImporter.ts`, `src/services/yamlExporter.ts`, `src/schemas/architectureFileSchema.ts`

### Phase 7 — Edge visual upgrade

```yaml
phase: 7
types: [user-facing, ui-kit]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, UI Kit]
suppressed_dims_count: 3
decisions_entry: D12
```

- **Tier chosen:** `mvp`
- **Prototype:** no
- **Sections considered:** Core, UI/UX (2 dims, 2 suppressed), UI Kit (2 dims, 2 suppressed — but mvp tier means minimal state matrix is fine)
- **Suppressed dims:** 3 (Streaming, Loading, Platform variance)
- **Trade-offs accepted:** See DECISIONS.md D12
- **Key files:** `src/components/canvas/ArchieEdge.tsx`, `src/components/canvas/EdgeParticles.tsx`
- **Runtime evidence:** Browser verification of colored edges, legacy dashed edge rendering

## Current Phase

Phase 5: Component library port data

## Dependencies

- Phase 2 depends on Phase 1 (port types must exist before rendering Handles)
- Phase 3 depends on Phases 1 + 2 (handles must render before edges can target them)
- Phase 4 depends on Phases 1 + 3 (topology checker needs port-typed edges to validate)
- Phase 5 can start after Phase 1 (independent content work, parallelizable with 2-4)
- Phase 6 depends on Phases 1 + 3 (migration needs both schema types and edge creation logic)
- Phase 7 depends on Phases 1 + 3 (edge coloring needs port types and sourceHandle/targetHandle data)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| 30+ components need port definitions authored — content bottleneck | medium | Phase 5 parallelizes with code phases; AI-generate then hand-validate |
| React Flow Handle positioning with dynamic port count causes visual overlap | medium | Dynamic node height when ports > 5; test with App Server (7 ports) in Phase 2 |
| v2 YAML migration heuristic mismaps connections with multiple matching port types | low | Priority order fallback + legacy edge visual + manual reassignment UI |
| Existing edge features (particles, labels, inspector) need port-awareness | medium | Phase 7 handles edge visuals; inspector updated as part of Phase 3 edge logic |
| Port taxonomy may need revision after seeing real usage | low | 7 types are additive — new types can be added without breaking existing data |

## Notes

- Architecture decisions resolved in `docs/roadmap/phase-3-plan.md` ADR section (2026-05-27 architect session)
- Port color palette: jewel tones (royal blue, deep violet, ruby, deep amber, emerald, dark gold, deep teal)
- Compatibility rule: `source.portType === target.portType && source.direction === 'out' && target.direction === 'in'`
- Hybrid warn/block: warn in sandbox mode, block in challenge mode (challenge mode ships in Epic 16)
- Bezier edge change is uncommitted on dev — commit as part of Phase 7 or standalone beforehand
