# Tech Debt Story TD-4-6a: Overlay Scroll Target Scoping

Status: done

> **Source:** ECC Code Review (2026-02-26) on story 4-6
> **Priority:** LOW | **Estimated Effort:** SMALL (1-2 files, ~30min)

## Story
As a **developer**, I want **section anchor scrollIntoView calls scoped to the nearest scrollable container instead of querying global document**, so that **scroll targets resolve correctly when the overlay renders a second InspectorPanel with duplicate data-section attributes**.

## Context
AppLayout renders `<InspectorOverlay><InspectorPanel /></InspectorOverlay>`, which means two InspectorPanel instances exist when overlay is open. Both contain `data-section="code"`, `data-section="details"`, `data-section="metrics"` attributes (via ComponentDetail). The section anchor buttons use `document.querySelector('[data-section="X"]')` which returns the first match in DOM order — potentially the wrong panel.

In practice, the aside panel has `width: 0` when overlay is active, so the duplicate sections are visually hidden. But the DOM query is still ambiguous.

## Acceptance Criteria
- AC-1: Section anchor buttons use a React ref to scope querySelector to the nearest scrollable parent
- AC-2: scrollIntoView targets the correct data-section element within the current panel context
- AC-3: Existing section anchor tests updated to verify scoped query

## Tasks / Subtasks
- [x] 1.1 Add a `useRef` to the InspectorPanel scrollable container
- [x] 1.2 Change `document.querySelector` to `ref.current.querySelector` in section nav click handler
- [x] 1.3 Update InspectorPanel.test.tsx section anchor test to verify scoped query
- [x] 1.4 Run test:quick — all tests pass

## Senior Developer Review (ECC)
- **Date:** 2026-02-27
- **Classification:** TRIVIAL
- **Agents:** code-reviewer (sonnet)
- **Score:** 10/10
- **Outcome:** APPROVE — surgical 4-line fix, scoped querySelector via useRef, test correctly validates scoped behavior
- **Quick Fixes Applied:** 0
- **TD Stories Created:** 0

## Dev Notes
- Source story: [4-6](./story-4-6.md)
- Review finding: #7
- Files affected: `src/components/inspector/InspectorPanel.tsx`, `tests/unit/components/inspector/InspectorPanel.test.tsx`
