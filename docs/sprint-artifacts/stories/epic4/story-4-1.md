# Story 4-1: Code Snippets & Metric Explanations

## Status: done
## Epic: Epic 4 — Deep Intelligence & Polish
## Branch: feature/epic-4

## Overview

As a user,
I want to see implementation code examples and understand why each metric scores the way it does,
So that I can connect abstract metric values to real implementation decisions and trust the directional data.

**FRs:** FR31 (code snippets per variant with syntax highlighting), FR32 (expandable metric explanations per component+variant+metric)
**Risk:** LOW — schema already complete; pure UI + seed data enrichment

**Key discovery:** `CodeSnippetSchema`, `MetricExplanationSchema`, and `ConfigVariant.codeSnippet`/`configVariant.metricExplanations` are already defined in `src/schemas/componentSchema.ts`. Types already exported from `src/types/index.ts`. No schema changes needed.

## Functional Acceptance Criteria

**AC-1:** Given I have a component selected in the inspector, when I view the code section, then I see a syntax-highlighted code snippet for the active configuration variant (FR31)

**AC-2:** Given I switch the configuration variant, when the inspector updates, then the code snippet changes to reflect the new variant's implementation pattern

**AC-3:** Given a component variant has no code snippet, when I view the inspector, then no code section is rendered (graceful absence)

**AC-4:** Given I view a metric in the inspector, when I click the metric row to expand it, then I see a plain-language explanation of why this component+variant scores this way (FR32)

**AC-5:** Given I expanded a metric explanation, when I see the expanded state, then I see a `reason` string and a list of `contributingFactors`

**AC-6:** Given I collapse an expanded metric explanation, when I click the collapse control, then the explanation hides and the metric returns to compact display

**AC-7:** Given a metric has no explanation in the active variant, when I view that metric, then the metric row shows no expand affordance (non-expandable)

**AC-8:** Given I view the inspector, when code snippet and metric explanations data is populated in Firestore via seed script, then the data flows through componentLibrary service to the UI without any service layer changes

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

**AC-ARCH-LOC-1:** `CodeSnippetViewer` component MUST be created at `src/components/inspector/CodeSnippetViewer.tsx` — following the established inspector component pattern

**AC-ARCH-LOC-2:** `CodeSnippetViewer` MUST be exported from the inspector barrel at `src/components/inspector/index.ts`

**AC-ARCH-LOC-3:** Seed data additions (`code_snippet`, `metric_explanations`) MUST be in `src/data/components/*.yaml` files using snake_case field names (the YAML schema transforms them to camelCase at boundary)

**AC-ARCH-LOC-4:** Unit tests for new/modified components MUST mirror `src/` structure: `tests/unit/components/inspector/`

### Pattern Requirements

**AC-ARCH-PATTERN-1:** `MetricBar` expansion state MUST use local `useState` — no Zustand store involvement. Expansion is transient UI state, not architecture domain state.

**AC-ARCH-PATTERN-2:** `ComponentDetail` passes metric explanations to `MetricCard` via a new `metricExplanations?: Record<string, MetricExplanation>` prop. `MetricCard` passes individual explanation to each `MetricBar` via `explanation?: MetricExplanation`. Prop drilling is correct here — no context needed for this depth.

**AC-ARCH-PATTERN-3:** Code snippet display MUST install `react-syntax-highlighter` for proper syntax highlighting (FR31 requirement). Use `SyntaxHighlighter` from `react-syntax-highlighter/dist/esm/prism-light` with `vscDarkPlus` theme to match Archie's dark-mode-first design. Register only the languages used in seed data (typescript, javascript, yaml, sql, bash) to keep bundle size small.

**AC-ARCH-PATTERN-4:** `MetricExplanation` data comes from `activeVariant.metricExplanations[metric.id]` — always keyed by metric ID. When `computedMetrics` overrides the metric values, the explanations still come from `activeVariant` (explanations are static, not recalculated).

**AC-ARCH-PATTERN-5:** Seed data `metric_explanations` must only include entries for metrics that exist in that variant's `metrics` array (not base_metrics). The variant-level `metric_explanations` explains the variant-specific scores.

### Anti-Pattern Requirements (Must NOT Happen)

**AC-ARCH-NO-1:** Do NOT use `dangerouslySetInnerHTML` with code snippet content. The `react-syntax-highlighter` library handles its own HTML sanitization; pass code as a plain string prop.

**AC-ARCH-NO-2:** Do NOT add `codeSnippet` or `metricExplanations` lookup to `recalculationService` or `recalculationEngine` — these are static library data, not computed values.

**AC-ARCH-NO-3:** Do NOT add new Zustand store state for expansion state — use local `useState` in `MetricBar`.

**AC-ARCH-NO-4:** Do NOT call `sanitizeDisplayString()` on code snippet content — code is trusted Firestore data (seeded by admin) and contains characters like `<`, `>`, `{`, `}` that would be stripped. Display code via syntax highlighter library directly.

**AC-ARCH-NO-5:** Do NOT add `code_snippet` or `metric_explanations` to the YAML architecture file schema (`architectureFileSchema.ts`) — these fields belong to the component library schema only, not the architecture skeleton.

## File Specification

| File/Component | Exact Path | Action | AC Reference |
|----------------|------------|--------|--------------|
| CodeSnippetViewer | `src/components/inspector/CodeSnippetViewer.tsx` | CREATE | AC-ARCH-LOC-1 |
| inspector barrel | `src/components/inspector/index.ts` | MODIFY | AC-ARCH-LOC-2 |
| MetricBar | `src/components/inspector/MetricBar.tsx` | MODIFY | AC-ARCH-PATTERN-1 |
| MetricCard | `src/components/inspector/MetricCard.tsx` | MODIFY | AC-ARCH-PATTERN-2 |
| ComponentDetail | `src/components/inspector/ComponentDetail.tsx` | MODIFY | AC-ARCH-PATTERN-2/4 |
| postgresql.yaml | `src/data/components/postgresql.yaml` | MODIFY | AC-ARCH-LOC-3 |
| redis.yaml | `src/data/components/redis.yaml` | MODIFY | AC-ARCH-LOC-3 |
| kafka.yaml | `src/data/components/kafka.yaml` | MODIFY | AC-ARCH-LOC-3 |
| nginx.yaml | `src/data/components/nginx.yaml` | MODIFY | AC-ARCH-LOC-3 |
| node-express.yaml | `src/data/components/node-express.yaml` | MODIFY | AC-ARCH-LOC-3 |
| redis-cache.yaml | `src/data/components/redis-cache.yaml` | MODIFY | AC-ARCH-LOC-3 |
| rabbitmq.yaml | `src/data/components/rabbitmq.yaml` | MODIFY | AC-ARCH-LOC-3 |
| websocket-server.yaml | `src/data/components/websocket-server.yaml` | MODIFY | AC-ARCH-LOC-3 |
| cloudflare-cdn.yaml | `src/data/components/cloudflare-cdn.yaml` | MODIFY | AC-ARCH-LOC-3 |
| prometheus.yaml | `src/data/components/prometheus.yaml` | MODIFY | AC-ARCH-LOC-3 |
| CodeSnippetViewer test | `tests/unit/components/inspector/CodeSnippetViewer.test.tsx` | CREATE | AC-ARCH-LOC-4 |
| MetricBar test | `tests/unit/components/inspector/MetricBar.test.tsx` | MODIFY | AC-ARCH-LOC-4 |

**Total:** 2 creates + 15 modifies = 17 files (data files are additive YAML edits — low complexity per file)

## Tasks / Subtasks

- [x] Task 1: Install syntax highlighting library and create CodeSnippetViewer component
  - [x] 1.1 Install `react-syntax-highlighter` and `@types/react-syntax-highlighter`
  - [x] 1.2 Create `CodeSnippetViewer.tsx` with PrismLight + vscDarkPlus theme
  - [x] 1.3 Register languages: typescript, javascript, yaml, sql, bash (only what seed data uses)
  - [x] 1.4 Add language label display above code block
  - [x] 1.5 Render nothing when `codeSnippet` prop is undefined
  - [x] 1.6 Export from `src/components/inspector/index.ts`

- [x] Task 2: Add expandable metric explanations to MetricBar and MetricCard
  - [x] 2.1 Add `explanation?: MetricExplanation` prop to `MetricBar`
  - [x] 2.2 Add `useState(false)` for `isExpanded` in `MetricBar`
  - [x] 2.3 Render chevron icon (ChevronDown/ChevronUp from lucide-react) only when `explanation` is present
  - [x] 2.4 On click of metric row: toggle `isExpanded`
  - [x] 2.5 When expanded: render `reason` text and `contributingFactors` list below the bar
  - [x] 2.6 Add `data-testid="metric-explanation"` to expanded section
  - [x] 2.7 Add `metricExplanations?: Record<string, MetricExplanation>` prop to `MetricCard`
  - [x] 2.8 Pass `explanation={metricExplanations?.[metric.id]}` to each `MetricBar`

- [x] Task 3: Update ComponentDetail to wire code snippets and metric explanations
  - [x] 3.1 Add code snippet section between ConfigSelector and IS/GAIN/COST sections
  - [x] 3.2 Pass `activeVariant?.codeSnippet` to `CodeSnippetViewer`
  - [x] 3.3 Pass `activeVariant?.metricExplanations` to each `MetricCard` invocation
  - [x] 3.4 Add `data-testid="code-snippet-section"` to the code snippet container

- [x] Task 4: Populate seed data (all 10 component YAML files)
  - [x] 4.1 Add `code_snippet` to each variant in `postgresql.yaml` (3 variants)
  - [x] 4.2 Add `metric_explanations` for each variant metric in `postgresql.yaml`
  - [x] 4.3 Add `code_snippet` + `metric_explanations` to `redis.yaml` (3 variants)
  - [x] 4.4 Add `code_snippet` + `metric_explanations` to `kafka.yaml` (2 variants)
  - [x] 4.5 Add `code_snippet` + `metric_explanations` to `nginx.yaml` (all variants)
  - [x] 4.6 Add `code_snippet` + `metric_explanations` to `node-express.yaml` (all variants)
  - [x] 4.7 Add `code_snippet` + `metric_explanations` to `redis-cache.yaml` (all variants)
  - [x] 4.8 Add `code_snippet` + `metric_explanations` to `rabbitmq.yaml` (all variants)
  - [x] 4.9 Add `code_snippet` + `metric_explanations` to `websocket-server.yaml` (all variants)
  - [x] 4.10 Add `code_snippet` + `metric_explanations` to `cloudflare-cdn.yaml` (all variants)
  - [x] 4.11 Add `code_snippet` + `metric_explanations` to `prometheus.yaml` (all variants)
  - [x] 4.12 Run `npx ts-node scripts/seed-firestore.ts` to push to Firestore

- [x] Task 5: Unit tests
  - [x] 5.1 Test `CodeSnippetViewer` renders code with language label
  - [x] 5.2 Test `CodeSnippetViewer` renders nothing when `codeSnippet` is undefined
  - [x] 5.3 Test `MetricBar` shows no chevron when no explanation
  - [x] 5.4 Test `MetricBar` shows chevron + expands on click when explanation present
  - [x] 5.5 Test `MetricBar` collapses on second click
  - [x] 5.6 Test `MetricCard` passes explanation to `MetricBar`
  - [x] 5.7 Run `npm run test:quick` and ensure all tests pass

## Dev Notes

### Architecture Guidance

**Data flow (no service changes needed):**
```
Firestore (seed data)
  → componentRepository.getAll()
  → componentLibrary.initialize() (caches Component[])
  → useLibrary().getComponentById(id)
  → ComponentDetail (activeVariant.codeSnippet, activeVariant.metricExplanations)
  → CodeSnippetViewer (codeSnippet prop)
  → MetricCard → MetricBar (explanation prop)
```

**MetricExplanation vs computedMetrics split:**
- `computedMetrics` (from recalculation engine) overrides metric VALUES but NOT explanations
- Always read explanations from `activeVariant.metricExplanations[metric.id]` — NOT from computedMetrics
- Rationale: explanations describe the component+variant's inherent characteristics, not the propagated computed values

**Prop chain for metric explanations:**
```
ComponentDetail
  activeVariant.metricExplanations → MetricCard.metricExplanations
    MetricCard: metricExplanations?.[metric.id] → MetricBar.explanation
      MetricBar: useState(isExpanded) + render reason + contributingFactors
```

### Technical Notes

**react-syntax-highlighter setup:**
```typescript
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light'
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'

SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('yaml', yaml)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('bash', bash)
```

**YAML seed data format (example for postgresql single-node variant):**
```yaml
config_variants:
  - id: single-node
    name: Single Node
    metrics:
      - id: read-latency
        value: low
        numeric_value: 3
        category: performance
    code_snippet:
      language: typescript
      code: |
        // PostgreSQL - Single Node via node-postgres (pg)
        import { Pool } from 'pg'

        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 10,
        })

        export async function query(text: string, params?: unknown[]) {
          const { rows } = await pool.query(text, params)
          return rows
        }
    metric_explanations:
      read-latency:
        reason: Single-node PostgreSQL has higher read latency than clustered setups due to all reads hitting one server with no read distribution.
        contributing_factors:
          - Single server handles all read and write traffic concurrently
          - No read replicas to distribute query load
          - Sequential I/O on high-load tables creates contention
      horizontal-scalability:
        reason: A single PostgreSQL node cannot scale horizontally — adding servers requires architectural changes not available in this variant.
        contributing_factors:
          - No built-in sharding or partitioning across nodes
          - Manual application-level sharding is complex and error-prone
          - Migration to distributed variant requires significant effort
```

**Seed data quality guideline (AI-generation prompt):**
- `reason`: 1-2 sentences. Why does THIS variant score THIS way for THIS metric? Be specific to the variant name.
- `contributingFactors`: 2-3 bullet points. Specific technical reasons. Start each with a noun.
- `code_snippet.code`: 10-20 lines. Minimal realistic implementation. Include import and basic usage. Use `process.env.*` for credentials.

**MetricBar expansion UX:**
- Entire metric row should be clickable (not just chevron) when explanation is present
- Use `cursor-pointer` class when explanation is available
- Expanded section: small text (text-xs), muted color for reason, bullet list for factors
- Keep animation minimal (no heavy CSS transitions needed — just show/hide)

**Sizing note:** 10 YAML files are additive only (no existing content modified). Mechanical, low-risk. Treat as one task (Task 4) even though it touches many files.

### E2E Testing
- Action: EXTEND | File: tests/e2e/inspector-and-config.spec.ts | Result: PASS
- Multi-User: SINGLE-USER | Quality Score: 85/100 | Date: 2026-02-24
- Tests added: 4 (AC-1/2 code snippet visible, AC-2 variant switch, AC-4/5/6 expand/collapse, AC-7 no chevron)
- AC-3 (graceful absence) covered by unit tests only — no component without code snippet in seed data
- Firestore seeded: `ignoreUndefinedProperties` fix applied to seed script
- Pre-existing failures: 2 (inspector width assertions on pane-click/delete — not caused by 4-1)

## Senior Developer Review (ECC)

**Date:** 2026-02-24 | **Agents:** code-reviewer, security-reviewer (opus), architect (opus), tdd-guide
**Classification:** COMPLEX (17 files) | **Overall Score:** 8.5/10 | **Outcome:** APPROVED

**Quick fixes applied (3):**
- Finding 2: `key={factor}` → index-based key in contributing factors list (MetricBar.tsx:55)
- Finding 3: Trailing space in className → `explanation ? "py-0.5 cursor-pointer" : "py-0.5"` (MetricBar.tsx:25)
- Finding 5: Added `vi.resetAllMocks()` guard to MetricBar test suite (MetricBar.test.tsx)

**Tech Debt Tracking:**

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| [td-4-1a](./td-4-1a-code-snippet-trust-boundary.md) | CodeSnippetViewer language allowlist + code size guard | LOW | CREATED |

**Tests post-fix:** 79/79 inspector unit tests pass.

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Moderate (UI + data enrichment, schema pre-built)
- Classification: STANDARD
- Agents consulted: planner (file exploration phase), architect (file exploration phase)
- Sizing: LARGE (17 files: 5 UI + 10 YAML + 2 test) — data files are low-complexity additive changes
- Note: Both agents spent turns on file reads; orchestrator synthesized analysis from direct codebase inspection
