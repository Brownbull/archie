# Tech Debt Story TD-4-1b: CodeSnippetViewer Display Safety

Status: review

> **Source:** ECC Code Review (2026-02-24) on story td-4-1a
> **Priority:** LOW | **Estimated Effort:** 1–2 tasks

## Story

As a **developer**, I want the `CodeSnippetViewer` language registration and allowlist to be derived from a single source of truth, and the language label to be sanitized before rendering, so that the component is resilient to drift between registered and allowed languages and safe against future untrusted data sources.

## Acceptance Criteria

**AC-1:** Given the language registration block and the `ALLOWED_LANGUAGES` constant, when the component initializes, then both are derived from a single `LANGUAGE_MAP` object — eliminating the possibility of registering a language without allowlisting it (or vice versa).

**AC-2:** Given `codeSnippet.language` contains a crafted string (e.g., RTL overrides, zero-width characters), when the language label renders in the `<span>`, then the string is sanitized or constrained to safe display characters.

## Tasks / Subtasks

- [x] Task 1: Consolidate language registration and allowlist
  - [x] 1.1 Create `LANGUAGE_MAP` object mapping language names to grammar modules
  - [x] 1.2 Derive `ALLOWED_LANGUAGES` from `Object.keys(LANGUAGE_MAP)`
  - [x] 1.3 Use `Object.entries(LANGUAGE_MAP).forEach(...)` for `registerLanguage` calls
  - [x] 1.4 Verify existing tests still pass

- [x] Task 2: Sanitize language label display
  - [x] 2.1 Determine project sanitization approach (existing utility or new constrained display)
  - [x] 2.2 Apply sanitization to `{codeSnippet.language}` in the label span
  - [x] 2.3 Add test for crafted language string rendering safely

## Dev Notes
- Source story: [td-4-1a-code-snippet-trust-boundary.md](./td-4-1a-code-snippet-trust-boundary.md)
- Review findings: #1 (WARN — drift risk), #2 (WARN — unsanitized label)
- Files affected: `src/components/inspector/CodeSnippetViewer.tsx`, `tests/unit/components/inspector/CodeSnippetViewer.test.tsx`
- **Note on finding #1:** Current risk is LOW — registration and allowlist are 3 lines apart in the same file. But a single-source pattern eliminates the category of error entirely.
- **Note on finding #2:** React JSX escapes `<`, `>`, `&` by default. Risk is limited to visual confusion (RTL overrides, zero-width chars) not XSS. Becomes relevant when community library data flows through `CodeSnippet.language`.
