# Tech Debt Story TD-4-2f: MetricExplanationYamlSchema Extraction

Status: ready-for-dev

> **Source:** ECC Code Review (2026-02-24) on story td-4-2e
> **Priority:** LOW | **Estimated Effort:** Small (1 task, 2 subtasks, 2 files)

## Story
As a **developer**, I want **the `ConfigVariantYamlSchema` inline `metric_explanations` object extracted into a named `MetricExplanationYamlSchema`**, so that **the snake_case-to-camelCase YAML variant mirrors the existing pattern used by `ConnectionPropertiesYamlSchema` and `CodeSnippetSchema`, eliminating structural duplication**.

## Acceptance Criteria

- AC-1: A named `MetricExplanationYamlSchema` exists that accepts `{ reason, contributing_factors }` and transforms to `{ reason, contributingFactors }`
- AC-2: `ConfigVariantYamlSchema.metric_explanations` uses the extracted schema instead of an inline `z.object()`
- AC-3: Existing tests pass without modification
- AC-4: YAML round-trip test still validates correctly

## Tasks / Subtasks

- [x] **Task 1: Extract MetricExplanationYamlSchema**
  - [x] 1.1 Create `MetricExplanationYamlSchema` with snake_case fields, `.strict()`, and `.transform()` to camelCase — reuse `MAX_REASON_LENGTH` and `MAX_FACTOR_LENGTH` constants
  - [x] 1.2 Replace `ConfigVariantYamlSchema` inline `metric_explanations` object with `z.record(z.string(), MetricExplanationYamlSchema)`

## Dev Notes
- Source story: [td-4-2e](./td-4-2e-schema-validation-completeness.md)
- Review findings: #1 (structural duplication)
- Files affected: `src/schemas/componentSchema.ts`, `tests/unit/schemas/componentSchema.test.ts`
- Pattern reference: `ConnectionPropertiesYamlSchema` already follows this pattern (named schema, snake_case → camelCase transform)
