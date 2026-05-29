# Deviations Log

Minor implementation variances from PLAN.md, logged by /gabe-execute.

| Date | Phase | Task | Type | Note |
|------|-------|------|------|------|
| 2026-05-29 | E15-P1 | T-schema | scope-defer | capacityModel schema field on ConfigVariant deferred (YAGNI) — no consumer in shed-only v1; SimNode.failureMode defaults 'shed'. Add when crash/queue lands. |
| 2026-05-29 | E15-P3 | T-overlay | design-variance | Live telemetry uses a dedicated useNodeSimTelemetry hook + strip (RPS/latency/capacity bar) rather than a useNodeOverlay 'simulation' mode — telemetry is multi-value and gated on a running sim, not on user-selected overlayMode. Cleaner separation. |
