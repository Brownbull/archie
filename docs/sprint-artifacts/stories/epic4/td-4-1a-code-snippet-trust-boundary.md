# Tech Debt Story TD-4-1a: CodeSnippetViewer Input Trust Boundary Hardening

Status: done

> **Source:** ECC Code Review (2026-02-24) on story 4-1
> **Priority:** LOW | **Estimated Effort:** 1–2 tasks

## Story

As a **developer**, I want the `CodeSnippetViewer` to validate its inputs at the Firestore-to-render boundary, so that unknown languages and oversized code blocks degrade gracefully and the trust boundary is explicit for future data sources (community library, YAML import).

## Acceptance Criteria

**AC-1:** Given `codeSnippet.language` contains an unknown value (not one of the 5 registered: typescript, javascript, yaml, sql, bash), when `CodeSnippetViewer` renders, then it falls back to plain-text rendering instead of silently passing an unregistered language to PrismLight.

**AC-2:** Given `codeSnippet.code` exceeds a reasonable size threshold (10KB), when `CodeSnippetViewer` renders, then it either truncates with a visible indicator or renders a "snippet too large" placeholder — preventing DOM performance issues from corrupted or abnormally large seed data.

**AC-3:** Given either validation path fires, when the component renders, then no error is thrown and the rest of the inspector remains usable.

## Tasks / Subtasks

- [x] Task 1: Language allowlist validation
  - [x] 1.1 Define `ALLOWED_LANGUAGES` constant (`const ALLOWED_LANGUAGES = ["typescript", "javascript", "yaml", "sql", "bash"] as const`)
  - [x] 1.2 Add `getSafeLanguage(lang: string): AllowedLanguage | undefined` helper — returns undefined for unknown values
  - [x] 1.3 Pass `getSafeLanguage(codeSnippet.language)` to `SyntaxHighlighter language=` prop — undefined falls back to plain text
  - [x] 1.4 Update language label span to show `codeSnippet.language` (original, for display) regardless of allowlist result

- [x] Task 2: Code size guard
  - [x] 2.1 Define `MAX_CODE_SNIPPET_BYTES = 10_000` constant
  - [x] 2.2 In `CodeSnippetViewer`, check `codeSnippet.code.length > MAX_CODE_SNIPPET_BYTES`
  - [x] 2.3 If over limit, render a placeholder: "Code snippet too large to display" instead of passing to SyntaxHighlighter

- [x] Task 3: Unit tests
  - [x] 3.1 Test: unknown language → SyntaxHighlighter receives no language prop (plain text fallback)
  - [x] 3.2 Test: known language → SyntaxHighlighter receives correct language prop (covered by existing test line 76)
  - [x] 3.3 Test: code over 10KB → placeholder text rendered, SyntaxHighlighter not rendered
  - [x] 3.4 Test: code exactly at limit → renders normally

## Dev Notes

- Source story: [story-4-1.md](./story-4-1.md)
- Review findings: #1 (MEDIUM — language allowlist), #4 (LOW — code length guard)
- Files affected: `src/components/inspector/CodeSnippetViewer.tsx`, `tests/unit/components/inspector/CodeSnippetViewer.test.tsx`
- **Note on finding #1:** Current risk is LOW (admin-seeded data, controlled language values). Becomes MEDIUM if/when community library or YAML import routes component data through the same type path.
- **Note on finding #4:** PrismLight renders code as DOM text nodes — 10KB of code will not crash but may cause visible jank in the inspector panel. A render-side guard is a performance safety net.
- **Do NOT** sanitize the code string itself — per AC-ARCH-NO-4, `<`, `>`, `{`, `}` must be preserved.

## Deferred Items (from code review 2026-02-24)

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| td-4-1b | Language registration/allowlist consolidation + label sanitization | LOW | CREATED |

## Senior Developer Review (ECC)

- **Date:** 2026-02-24
- **Classification:** SIMPLE
- **Agents:** code-reviewer (sonnet), tdd-guide (sonnet)
- **Overall Score:** 8.0/10
- **Outcome:** APPROVED — 7 quick fixes applied, 2 items deferred to td-4-1b
- **Quick fixes applied:** renamed `MAX_CODE_SNIPPET_BYTES` → `MAX_CODE_SNIPPET_CHARS`, improved test assertion idiom, added empty-string language test, added combined guard test, added `toHaveTextContent` assertion, added `afterEach(vi.resetAllMocks)`
- **Schema note:** `CodeSnippetSchema.language` is `z.string()` (unconstrained). Component guard is the only defense. Acceptable for admin-seeded data; revisit when community data flows through.
