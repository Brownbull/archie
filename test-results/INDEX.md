# E2E Test Results Index

Screenshots persist per-spec folder. Re-running a spec only overwrites that spec's folder.

| Folder | Spec File | Story | Description |
|--------|-----------|-------|-------------|
| `auth-and-app-shell/` | `auth-and-app-shell.spec.ts` | 1-1 | Auth flow and app shell verification |
| `toolbox-browsing/` | `toolbox-browsing.spec.ts` | 1-2 | Toolbox tabs, component browsing, search, command palette |
| `canvas-and-placement/` | `canvas-and-placement.spec.ts` | 1-3 | Canvas empty state, React Flow integration, drag-and-drop, node placement |
| `priority-scoring/` | `priority-scoring.spec.ts` | 5-5 | Weight slider adjustments, reset, export/import round-trip, v1 defaults |
| `constraint-guardrails/` | `constraint-guardrails.spec.ts` | 6-5 | Constraint CRUD, violation badges, navigation, YAML round-trip |
| `stack-browsing/` | `stack-browsing.spec.ts` | 8-4 | Stack tab browsing, drag-and-drop placement, post-placement config editing |
| `data-context/` | `data-context.spec.ts` | 7-4 | Data context CRUD, fit indicators, variant switching, YAML round-trip |
| `pathway-guidance/` | `pathway-guidance.spec.ts` | 7.5-4 | Pathway guidance flow: suggestions, weight reranking, constraint warnings, max tier |
| `demand-simulation/` | `demand-simulation.spec.ts` | 9-5 | Demand scenario selection, heatmap shift, semantic verification, YAML round-trip |
| `canvas-enhancements/` | `canvas-enhancements.spec.ts` | 10-3 | Inline metrics visibility, weight responsiveness, blueprint loading, demand interaction |
| `expanded-content/` | `expanded-content.spec.ts` | 11-6 | New components load, blueprints render, cost-efficiency visible, demand/failure V6 |
| `challenge/` | `challenge-mode.spec.ts` | 16-6 | Challenge journey: select level → build + checklist/budget HUD → Start → real sim → scored results modal (stars) → close |
| `history/` | `history-tab.spec.ts` | 17-5 | History toolbox tab reachable + submissions panel renders (sort controls) in the live app shell |
| `component-icons/` | `component-icons.spec.ts` | 17-pol | Pixel-art component icons (PixelLab) render in the toolbox cards; src = local /icons/*.png |
| `capstone-completion/` | `capstone-completion.spec.ts` | D72 | All 6 Tier-6 absurd capstones replayed to 3★ in the real app: seed an unblocked user → select → import the winning reference architecture → run the sim → 3★ results modal screenshot (planet-scale, thundering-herd, heat-death, zero-budget-hero, the-singularity, maxwells-demon) |
| `feedback-phase2/` | `feedback-phase2.unlocked.spec.ts` | P2 (D89) | Phase-2 runtime evidence: (1) a quest attempt with one port-mismatched edge scores exactly 2★ — Well-formed stays green, the "Ports compatible" row explains the lost star (D87); (2) observe-to-recover's az_outage marks the timeline red, flipping amber at detection (S7+S8) |
| `feedback-phase3/` | `feedback-phase3.unlocked.spec.ts` | P3 (D92/D93) | Phase-3 runtime evidence: config dropdown shows each variant's authored description subrow; inspector Tier row carries the description + https/noopener docs link — read from the S9-reseeded Firestore by the P163 tolerant reader |
