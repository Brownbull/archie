# Tech Debt Story TD-6-4a: Import pipeline hardening + schema maintenance

## Status: done
## Epic: Epic 6 -- Constraint Guardrails

> **Source:** KDBP Code Review (2026-03-10) on story 6-4
> **Priority:** LOW | **Estimated Effort:** 1 pt (TRIVIAL — 4 localized changes)

## Story
As a **developer**, I want **import pipeline defense-in-depth improvements and schema file clarity**, so that **error messages are safer, file validation is stricter, and schema code is self-documenting**.

## Acceptance Criteria

**AC-1:** YAML parse error message genericized — do not echo file content fragments to user
**AC-2:** MIME type check added to `importYaml` alongside extension check (accept text-like types, reject clearly non-text)
**AC-3:** `migrateV1ToV2` includes explicit `constraints: undefined` for self-documenting v2 shape
**AC-4:** YAML-variant schemas grouped with shared comment block in architectureFileSchema.ts

## Tasks / Subtasks

- [x] Task 1: Genericize YAML parse error message
  - [x] 1.1 In yamlImporter.ts (~line 123), replace `error.message` with fixed string like "YAML file could not be parsed. Check file syntax."
  - [x] 1.2 Update tests that assert on YAML_PARSE_ERROR message content (if any)

- [x] Task 2: Add MIME type check to importYaml
  - [x] 2.1 After extension check in importYaml, add `file.type` validation
  - [x] 2.2 Accept: `application/x-yaml`, `text/yaml`, `text/plain`, `application/octet-stream`, `""` (empty — browser default for .yaml)
  - [x] 2.3 Reject clearly non-text types (e.g., `image/*`, `application/pdf`)
  - [x] 2.4 Add unit test for MIME type rejection

- [x] Task 3: Self-documenting migration
  - [x] 3.1 Add `constraints: undefined` to migrateV1ToV2 return object
  - [x] 3.2 Add inline comment explaining v2 shape documentation intent

- [x] Task 4: Schema grouping comments
  - [x] 4.1 Add section header comment grouping YAML-variant schemas (ConstraintYamlSchema, ArchitectureFileNodeYamlSchema, etc.)

## Dev Notes
- Source story: [6-4](./6-4.md)
- Review findings: #4, #5, #6, #7
- Files affected: `src/services/yamlImporter.ts`, `src/schemas/architectureFileSchema.ts`
- Self-review: APPROVE 8.5/10, finding #1 fixed (constant hoisted to module scope)

## Deferred Items

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| TD-6-4b | Constraint schema DRY + deterministic import IDs | LOW | CREATED |

## Senior Developer Review (KDBP)
- **Date:** 2026-03-10
- **Classification:** SIMPLE
- **Agents:** code-reviewer (sonnet), tdd-guide (sonnet)
- **Outcome:** APPROVE 8.1/10
- **Quick fixes applied:** 4 (MIME test coverage, `as const`, safety comment, positive assertion)
- **TD stories created:** 1 (TD-6-4b)
- **Session cost:** $7.67

<!-- CITED: none -->
<!-- ORDERING: clean -->
