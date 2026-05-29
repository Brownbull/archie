# Deferred Items

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|
| D1 | 2026-06-02 | user-feedback | Port handle dots lack hover tooltips — colored dots on node edges don't communicate port type/direction (e.g., "HTTP Out", "Database In"). Users can't tell what a port is for without connecting to it. | src/components/canvas/ArchieNode.tsx | enterprise | medium | moderate | 0 | open |
| D2 | 2026-05-29 | gabe-execute | architectureStore.test.ts is 1454 lines (>800 size guard) — blocks Edit-tool changes, forces Write/sed workarounds. Split into focused files (addNode, edges, variants, etc.) mirroring the architectureStore-*.test.ts convention. | tests/unit/stores/architectureStore.test.ts | enterprise | medium | moderate | 0 | open |
| D3 | 2026-05-29 | gabe-review | architectureStore.ts crossed the 800-line size guard (815 lines) with Epic 14 Phase 1 additions — now blocks Edit-tool changes. Extract concerns (e.g. replica/economics actions, recalculation orchestration, hydration) into focused modules or store slices. | src/stores/architectureStore.ts | enterprise | medium | moderate | 0 | open |
