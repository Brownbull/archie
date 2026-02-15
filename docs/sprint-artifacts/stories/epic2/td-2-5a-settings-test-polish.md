# Story: TD-2-5a Settings Test & Polish

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization
## Source: Code Review of Story 2-5 (2026-02-14)

## Overview

Tech debt from Story 2-5 code review. Addresses test coverage gaps and minor infrastructure improvements for the Settings & Preferences feature.

## Findings Addressed

| # | Sev | Finding | Source |
|---|-----|---------|--------|
| 2 | MEDIUM | No test for dropdown close-on-outside-click (AC-2) | TDD Guide |
| 3 | MEDIUM | No integration test for usePreferencesEffect hook | TDD Guide |
| 6 | LOW | Missing Content-Security-Policy meta tag in index.html | Security Reviewer |
| 7 | LOW | usePreferencesEffect could be extracted to src/hooks/ | Code Reviewer |

## Tasks / Subtasks

### Task 1: Extract usePreferencesEffect Hook
- [x] 1.1 Move `usePreferencesEffect` from `src/App.tsx` to `src/hooks/usePreferencesEffect.ts`
- [x] 1.2 Update `src/App.tsx` to import from new location
- [x] 1.3 Verify existing tests pass

### Task 2: Integration Test for usePreferencesEffect
- [x] 2.1 Create `tests/unit/hooks/usePreferencesEffect.test.ts`
- [x] 2.2 Test theme class toggled on `<html>` element when store changes
- [x] 2.3 Test `--archie-font-size` CSS property set on `<html>` element
- [x] 2.4 Test `--archie-font-family` CSS property set on `<html>` element
- [x] 2.5 Test initial mount applies current store values

### Task 3: Dropdown Close Behavior Test (Optional)
- [x] 3.1 Evaluate if close-on-outside-click is testable without testing Radix UI internals
- [ ] 3.2 If testable, add test to `SettingsMenu.test.tsx` for clicking outside closes dropdown
- [x] 3.3 If not unit-testable, document as E2E coverage item

### Task 4: CSP Meta Tag (Optional)
- [ ] 4.1 Add `Content-Security-Policy` meta tag to `index.html` with `'unsafe-inline'` for anti-flicker script
- [ ] 4.2 Verify Vite dev mode works with CSP
- [x] 4.3 Note: Production CSP should use nonce-based approach via Firebase Hosting headers

### Task 5: Verification
- [x] 5.1 Run `npx tsc --noEmit` — no type errors
- [x] 5.2 Run `npm run test:quick` — all tests pass
- [ ] 5.3 Verify coverage meets thresholds

## Dev Notes

- Tasks 3 and 4 are optional — dropdown close is Radix UI behavior (third-party), CSP is infrastructure
- Hook extraction (Task 1) is straightforward: move 8 lines, update one import
- Integration test (Task 2) should use `renderHook` from `@testing-library/react`

## Senior Developer Review (ECC)

- **Date:** 2026-02-15
- **Classification:** STANDARD (2 agents)
- **Agents:** code-reviewer, security-reviewer
- **Score:** 9/10
- **Status:** APPROVED

### Quick Fixes Applied
1. Anti-flicker script: explicit theme value validation (`'dark'` / `'light'` whitelist) [index.html:19]
2. Runtime key validation on `FONT_SIZE_PRESETS`/`FONT_FAMILY_PRESETS` before `setProperty()` [usePreferencesEffect.ts:18-19]

### Notes
- CSP meta tag (Task 4) intentionally deferred — production CSP via Firebase Hosting headers is the correct approach
- Dropdown close test (Task 3.2) deferred to E2E — Radix UI behavior is third-party internals per testing conventions
- Code reviewer incorrectly flagged inspector `width: "0px"` assertion as bug — verified correct in AppLayout.tsx:38-40
