# Active Plan

<!-- status: completed -->
<!-- project_type: code -->

## Goal

Epic 13: Concrete Variant Economics — Add monthlyCost, maxRPS, and baseLatencyMs to every config variant. Budget HUD on canvas, inline cost per node, cost ranges in toolbox, economics in inspector with delta indicators. Foundation for replicas (E14) and simulation engine (E15).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-06-02
- **Last Updated:** 2026-06-02

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Economics schema & variant data | Extend ConfigVariant with monthlyCost/maxRPS/baseLatencyMs, author values for all 46 variants | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 2 | Cost computation & inline node display | totalArchitectureCost selector, cost badge on ArchieNode, recalculate on variant switch | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 3 | Budget HUD & toolbox cost ranges | Budget HUD progress bar in dashboard, cost range on toolbox cards | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 4 | Inspector economics & delta indicators | Cost/RPS/latency in inspector, delta indicators on variant switch | ent | low | ✅ | ✅ | ✅ | ✅ |

## Archived

- **Resolution:** completed
- **Date:** 2026-06-02
- **Reason:** Goal achieved — all 4 phases shipped, CI green, deployed as P11–P14
