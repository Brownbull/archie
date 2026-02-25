# Tech Debt Story TD-4-4a: Dashboard Component Test Coverage

Status: in-progress

> **Source:** ECC Code Review (2026-02-25) on story 4-4
> **Priority:** MEDIUM | **Estimated Effort:** Small (2 tasks, 2 new files)

## Story
As a **developer**, I want **dedicated unit tests for CategoryInfoPopup and CategoryBar**, so that **future changes to these components have a safety net and AC-FUNC-4/5/6 are directly tested**.

## Acceptance Criteria

- [x] `tests/unit/components/dashboard/CategoryInfoPopup.test.tsx` exists with tests for:
  - Renders category name, description, whyItMatters, score interpretation (AC-FUNC-5)
  - Returns children passthrough when `category` is undefined
  - Closes on outside-click or Escape (AC-FUNC-6)
  - Score interpretation clamp works for boundary values
- [x] `tests/unit/components/dashboard/CategoryBar.test.tsx` exists with tests for:
  - Renders score, shortName, icon, fill bar
  - onClick handler fires when clicked (AC-FUNC-4)
  - Keyboard accessibility (Enter/Space triggers onClick)
  - Has aria-label on role="meter"

## Tasks / Subtasks

- [x] **Task 1:** Create `tests/unit/components/dashboard/CategoryInfoPopup.test.tsx`
  - [x] 1a. Test rendering with valid category data
  - [x] 1b. Test undefined category passthrough
  - [x] 1c. Test score interpretation lookup including boundary clamp
  - [x] 1d. Test Escape/outside-click closure

- [x] **Task 2:** Create `tests/unit/components/dashboard/CategoryBar.test.tsx`
  - [x] 2a. Test renders correct score, fill width, color
  - [x] 2b. Test onClick prop fires on click
  - [x] 2c. Test keyboard Enter/Space triggers onClick
  - [x] 2d. Test aria-label matches shortName

## Dev Notes
- Source story: [story-4-4](./story-4-4.md)
- Review findings: #10, #11
- Files affected: `tests/unit/components/dashboard/CategoryInfoPopup.test.tsx` (CREATE), `tests/unit/components/dashboard/CategoryBar.test.tsx` (CREATE+EXTEND)
