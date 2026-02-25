# Tech Debt Story TD-4-2e: Schema Validation Completeness

Status: done

> **Source:** ECC Code Review (2026-02-24) on story td-4-2c
> **Priority:** LOW | **Estimated Effort:** Small (1 task, 3 subtasks, 2 files)

## Story
As a **developer**, I want **the YAML inline schema to reuse MetricExplanationSchema constants, CodeSnippetSchema fields to have max-length bounds, and schema rejection tests to verify Zod error codes**, so that **validation constraints are DRY, defense-in-depth is consistent across all schemas, and tests verify the correct rejection reason**.

## Acceptance Criteria

- AC-1: `ConfigVariantYamlSchema` inline `metric_explanations` object derives max-length values from shared constants (not duplicated literals)
- AC-2: `CodeSnippetSchema.language` has `.max()` constraint (e.g., 50)
- AC-3: `CodeSnippetSchema.code` has `.max()` constraint (e.g., 10000)
- AC-4: At least one schema test verifies `result.error.issues[0].code === "too_big"` for a max-length rejection
- AC-5: Existing tests pass without modification

## Tasks / Subtasks

- [x] **Task 1: Schema DRY and bounds hardening**
  - [x] 1.1 Extract `MAX_REASON_LENGTH` and `MAX_FACTOR_LENGTH` constants; use in both `MetricExplanationSchema` and `ConfigVariantYamlSchema` inline object
  - [x] 1.2 Add `.max()` constraints to `CodeSnippetSchema.language` and `CodeSnippetSchema.code`
  - [x] 1.3 Add at least one test asserting `result.error.issues[0].code === "too_big"` for over-length rejection

## Review Quick-Fixes Applied
- Added `.min(1)` guards to `CodeSnippetSchema.language` and `.code`
- Extracted `MAX_LANGUAGE_LENGTH = 50` and `MAX_CODE_LENGTH = 10000` constants
- Added `too_big` error code assertions to ConfigVariantSchema overflow tests
- Replaced magic numbers with constants in all test bodies

## Deferred Items

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| [td-4-2f](./td-4-2f-metric-explanation-yaml-schema-extraction.md) | Extract `MetricExplanationYamlSchema` to eliminate structural duplication | LOW | CREATED |

## Senior Developer Review (ECC)
- **Date:** 2026-02-24
- **Classification:** TRIVIAL
- **Agents:** code-reviewer (sonnet)
- **Score:** 8.5/10 → APPROVED
- **Quick fixes applied:** 4 | **TD stories created:** 1 (td-4-2f)
- **Tests:** 1188/1188 pass | Typecheck: clean

## Dev Notes
- Source story: [td-4-2c](./td-4-2c-inspector-schema-validation.md)
- Review findings: #1 (schema duplication), #4 (CodeSnippet bounds), #10 (error message assertions)
- Files affected: `src/schemas/componentSchema.ts`, `tests/unit/schemas/componentSchema.test.ts`
