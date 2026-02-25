# Tech Debt Story TD-4-3d: Code Style Consistency Cleanup

Status: drafted

> **Source:** ECC Code Review (2026-02-25) on story td-4-3c
> **Priority:** LOW | **Estimated Effort:** Small (1 task)

## Story
As a **developer**, I want **schema transform styles and constant naming to be consistent across the codebase**, so that **future contributors aren't confused by mixed patterns**.

## Acceptance Criteria

**AC-1 (constant unification):**
Given `MAX_PROTOCOL_LENGTH`, `MAX_LATENCY_LENGTH`, `MAX_PATTERN_LENGTH` all equal 100
When reviewing componentSchema.ts
Then consider unifying to a single `MAX_CONNECTION_STRING_LENGTH` or adding a comment explaining why they're separate

**AC-2 (transform style consistency):**
Given `MetricExplanationYamlSchema` uses destructured transform `({ reason, contributing_factors })`
When reviewing `ConnectionPropertiesYamlSchema` which uses `(data) => ({ ... data.field })` style
Then make both transforms use the same style

**AC-3 (E2E helper documentation):**
Given `addComponentToCanvas` assumes sequential usage (count = buttonIndex + 1)
When reviewing canvas-helpers.ts
Then add a JSDoc note documenting this assumption

## Tasks / Subtasks
- [ ] 1.1 Decide: unify constants or add comment explaining separate constants
- [ ] 1.2 Align YAML schema transform style (destructured or data.field — pick one)
- [ ] 1.3 Add JSDoc note on `addComponentToCanvas` sequential usage assumption
- [ ] 1.4 Run `npm run test:quick` — all tests pass

## Dev Notes
- Source story: [td-4-3c](./td-4-3c-connection-detail-useshallow-restoration.md)
- Review findings: #4 (constants), #5 (transforms), #6 (E2E helper)
- Files affected: `src/schemas/componentSchema.ts`, `tests/e2e/helpers/canvas-helpers.ts`
