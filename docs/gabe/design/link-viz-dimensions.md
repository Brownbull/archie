# Link-Visualization Dimensions — design map (P5-S6/S7, D95)

> Source: feedback20260609.md lines 13–18. Status: v1 SHIPPED (owner fork, 2026-06-10);
> remaining dimensions consciously deferred with this note as the exit-criteria design doc.

A link between two blocks carries more meaning than one visual channel can hold. This maps every
dimension the feedback named to a channel, marks what shipped in v1, and records why the rest waits.

## Channel allocation

| Dimension | Channel | Status | Where |
|-----------|---------|--------|-------|
| Kind of traffic (http/auth/db…) | **Dot color** | shipped (pre-P5) | `EdgeParticles` portColor |
| Compatibility / health | **Line color** + dasharray (heatmap mode) | shipped (pre-P5) | `ArchieEdge` heatmap branch |
| Protocol (port type) | **Line style** (default view) | **shipped v1** | `lib/linkViz.ts` PORT_DASHARRAYS |
| Throughput (downstream capacity) | **Dot speed** (log-scaled 0.6×–1.8×) | **shipped v1** | `lib/linkViz.ts` throughputSpeedFactor |
| Protocol (text) | Draggable label | shipped (pre-P5) | `ArchieEdge` connectionProps |
| Live load (sim RPS on this edge) | Dot **density** during a run | deferred | — |
| Saturation / headroom | **Glow / aura** | deferred | — |

## Why glow/aura is deferred

1. **Perf**: an SVG glow (feGaussianBlur filter per edge) on a 50-node/120-edge canvas is the
   single most expensive channel proposed — filters force per-frame rasterization while particles
   already animate via rAF. It needs a canvas-layer or WebGL approach, not a per-edge filter.
2. **Semantic collision**: health already owns line color AND dasharray (the colour-blind cue);
   glow as "throughput" reads as "warning" to half of users. Glow should mean exactly one thing —
   the best candidate is *saturation* (live load ÷ capacity during a run), which needs the live
   per-edge RPS plumbing below.
3. **Live per-edge RPS**: tick states carry per-NODE incoming RPS, not per-edge flow. Splitting a
   node's inflow across its in-edges needs the sim's routing weights exposed per tick — an engine
   surface change that belongs with the next sim-telemetry phase, not a render-only slice.

## v2 sketch (when live per-edge flow exists)

- Dot density = live RPS share (idle view keeps health-based density).
- Glow = saturation ≥ 80% of effective capacity, pulsing at 100% (one meaning, run-time only).
- The legend gains a run-mode section, mirroring the static one shipped in v1.
