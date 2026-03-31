# Story TD-11-data: Component Data Validation Hardening

## Status: drafted
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

- [ ] Task 1: Component YAML validation tests
  - [ ] 1.1 Load all `*.yaml` files from `src/data/components/`
  - [ ] 1.2 `test.each`: each file passes `ComponentYamlSchema` validation
  - [ ] 1.3 `test.each`: each component has base_metrics with 4+ categories
  - [ ] 1.4 `test.each`: each component has 2+ config_variants
  - [ ] 1.5 `test.each`: each component has cost-efficiency metric
  - [ ] 1.6 `test.each`: each component's category exists in COMPONENT_CATEGORIES

- [ ] Task 2: Blueprint YAML validation tests
  - [ ] 2.1 Load all `*.yaml` files from `src/data/blueprints/`
  - [ ] 2.2 `test.each`: each file passes `BlueprintSchema` validation

## Dev Notes

**Why a separate story?** Data-only stories (11-1 through 11-4) involve hand-editing 18+ YAML files. A dedicated validation test suite catches silent regressions that visual testing would miss (wrong field names, missing categories, schema drift).

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
