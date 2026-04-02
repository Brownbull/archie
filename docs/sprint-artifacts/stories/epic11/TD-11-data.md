# Story TD-11-data: Component Data Validation Hardening

## Status: done
## Epic: Epic 11 -- Expanded Content Library

## Intent
**Epic Handle:** "More building blocks for more architectures"
**Story Handle:** "Trust but verify -- automated schema validation catches data drift before users do"

## Overview

As a developer,
I want automated validation tests that confirm all 18 component YAML files conform to the schema and contain required fields,
So that data-only stories (11-1, 11-2, 11-3, 11-4) don't introduce silent schema violations.

**FRs:** None -- technical debt / hardening story
**Size:** SMALL (2 pts) -- 2 tasks, 8 subtasks, 2 files
**Risk Flags:** DATA_PIPELINE, ERROR_RESILIENCE
**Depends on:** Story 11-1 and Story 11-2 (component YAML files exist)

## Acceptance Criteria

**AC-1: Automated Schema Validation Test**
Given all component YAML files in `src/data/components/`,
When a validation test suite runs,
Then every file is loaded and validated against `ComponentYamlSchema`. Any schema violation fails the test with a clear error message identifying the file and invalid field.

**AC-2: Required Field Coverage Check**
Given all component YAML files,
When the coverage test runs,
Then every component has: id, name, category, description, base_metrics (with at least 4 categories), config_variants (at least 2), connection_properties (with protocol, communication_patterns, typical_latency, co_location_potential).

**AC-3: Cost-Efficiency Metric Presence**
Given all 18 component YAML files,
When the validation test runs,
Then every component includes at least one metric with `category: cost-efficiency`. Files missing this metric fail the test.

**AC-4: Cross-Component Consistency**
Given all components,
When category IDs are cross-checked,
Then every `category` field references an ID that exists in `COMPONENT_CATEGORIES`. Unknown categories fail the test.

## Architectural Acceptance Criteria

**AC-ARCH-LOC-1:** Validation tests in `tests/unit/data/component-yaml-validation.test.ts` (CREATE)
**AC-ARCH-PATTERN-1:** Dynamic test generation: `fs.readdirSync` + `test.each` over all YAML files
**AC-ARCH-PATTERN-2:** Tests run as part of `npm run test:quick` (fast, no side effects)
**AC-ARCH-NO-1:** No code changes -- test-only story
**AC-ARCH-NO-2:** No new schema extensions -- validates existing schema

## File Specification

| File | Path | Action |
|------|------|--------|
| component-yaml-validation | `tests/unit/data/component-yaml-validation.test.ts` | CREATE |
| blueprint-yaml-validation | `tests/unit/data/blueprint-yaml-validation.test.ts` | CREATE |

## Tasks / Subtasks

- [x] Task 1: Component YAML validation tests
  - [x] 1.1 Load all `*.yaml` files from `src/data/components/`
  - [x] 1.2 `test.each`: each file passes `ComponentYamlSchema` validation
  - [x] 1.3 `test.each`: each component has base_metrics with 4+ categories
  - [x] 1.4 `test.each`: each component has 2+ config_variants
  - [x] 1.5 `test.each`: each component has cost-efficiency metric in base_metrics
  - [x] 1.5b `test.each`: each variant has cost-efficiency metric override (11-3 review found ALL 8 new components from 11-1/11-2 have variant gaps — see Dev Notes)
  - [x] 1.6 `test.each`: each component's category exists in COMPONENT_CATEGORIES
  - [x] 1.7 `test.each`: each variant has metric_explanations with 2+ entries (reason + contributing_factors) [V6 — from 11-1 review]
  - [x] 1.8 `test.each`: each variant has a non-empty code_snippet [V6 — from 11-1 review]
  - [x] 1.9 `test.each`: variant metrics differ from each other for at least one metric (distinctness) [V6 — from 11-1 review]

- [x] Task 2: Blueprint YAML validation tests
  - [x] 2.1 Load all `*.yaml` files from `src/data/blueprints/`
  - [x] 2.2 `test.each`: each file passes `BlueprintSchema` validation

## Dev Notes

**Why a separate story?** Data-only stories (11-1 through 11-4) involve hand-editing 18+ YAML files. A dedicated validation test suite catches silent regressions that visual testing would miss (wrong field names, missing categories, schema drift).

**11-3 review findings (2026-03-30):** All 8 new components from 11-1/11-2 have variant cost-efficiency gaps:
- etl-pipeline: base only, 0/3 variants have cost-efficiency overrides
- payment-gateway: no base metric, only 1/3 variants (recurring-billing)
- graph-db: no base metric, only 1/3 variants (managed-cloud)
- llm-gateway: base present, only 1/3 variants have cost-efficiency
- vector-db: base present, only 1/3 variants have cost-efficiency
- serverless: base present, only 2/3 variants have cost-efficiency
- data-lake: base present, only 2/3 variants have cost-efficiency
- siem: base present, only 2/3 variants have cost-efficiency
Subtask 1.5b validates this is fixed. Source: findings #1 and #6 from 11-3 code review.

**Test pattern:**
```typescript
const componentFiles = fs.readdirSync('src/data/components/')
  .filter(f => f.endsWith('.yaml'));

describe.each(componentFiles)('Component %s', (filename) => {
  const raw = fs.readFileSync(`src/data/components/${filename}`, 'utf8');
  const parsed = load(raw);

  it('passes ComponentYamlSchema', () => {
    expect(() => ComponentYamlSchema.parse(parsed)).not.toThrow();
  });

  it('has cost-efficiency metric', () => {
    const metrics = parsed.base_metrics || [];
    expect(metrics.some(m => m.category === 'cost-efficiency')).toBe(true);
  });
});
```

**Implementation notes (2026-04-01):**
- Tests discovered 16 cost-efficiency gaps across 7 components (matching dev notes exactly). Fixed YAML data as part of TDD GREEN phase.
- prometheus.yaml and redis-cache.yaml had only 3 metric categories — added reliability and scalability respectively to reach 4+ threshold.
- Self-review: 7.5/10 APPROVE. Added `beforeEach` parse caching to reduce disk I/O from 126 to 18 reads.

## Senior Developer Review (ECC) — 2026-04-01

- **Agents:** code-reviewer (sonnet), tdd-guide (sonnet)
- **Classification:** SIMPLE
- **Score:** 7.25/10 → APPROVE (after fixes)
- **Outcome:** 7 quick fixes applied, 0 TD stories, 1 backlog entry
- **Quick fixes:** connectionProperties test, beforeAll optimization, floor guards, Zod error detail, explicit assertions, blueprint caching
- **Backlog:** blueprint structural assertions (PROD)
- **Session cost:** $10.57

<!-- CITED: none -->

## Review Deferred Items (2026-04-01)

| # | Finding | Stage | Destination | Action |
|---|---------|-------|-------------|--------|
| 4 | No malformed YAML rejection test | — | Archived | Schema-level tests already cover negative paths |
| 5 | Blueprint structural assertions + referential integrity | PROD | Backlog | Added to deferred-findings.md |
| 10 | recalculationService defensive noise | — | Archived | Out of scope for test-only story |

<!-- CITED: none -->
<!-- INTENT: aligned -->
<!-- ORDERING: clean -->
