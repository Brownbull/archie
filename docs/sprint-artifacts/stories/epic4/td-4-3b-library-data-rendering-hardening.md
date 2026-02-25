# Tech Debt Story TD-4-3b: Library-Sourced Data Rendering Hardening

Status: review

> **Source:** ECC Code Review (2026-02-24) on story 4-3-connection-inspection-system
> **Priority:** LOW | **Estimated Effort:** Small (3-4 tasks)

## Story
As a **developer**, I want **library-sourced data rendered in edge/connection components to use consistent reactivity patterns and have explicit validation awareness**, so that **data stays fresh after library reloads and unbounded strings don't cause UI overflow**.

## Acceptance Criteria

**AC-1 (ArchieEdge reactivity consistency):**
Given `ArchieEdge` currently calls `componentLibrary.getComponent()` directly in the render body
When the component library refreshes (e.g., after re-initialization)
Then the protocol label should update reactively
Solution: use `useLibrary()` hook (same pattern as `ConnectionDetail.tsx`) instead of direct service import

**AC-2 (incompatibilityReason max-length):**
Given `incompatibilityReason` is typed `string | null` with no max-length validation
When a compatibility check produces an extremely long reason string
Then the string should be bounded (e.g., truncated at 500 chars or clamped at assignment)
And the UI should not overflow

**AC-3 (MUST CHECK #7 documentation):**
Given library-sourced strings (protocol, typicalLatency, communicationPatterns) are rendered in JSX
When reviewing for MUST CHECK #7 (DB-sourced value injection)
Then React JSX auto-escaping is confirmed as the defense layer
And a code comment documents this decision at the rendering boundary (acknowledges the pattern)

## Tasks / Subtasks
- [x] 1.1 Replace `componentLibrary.getComponent()` in `ArchieEdge.tsx` with `useLibrary()` hook
- [x] 1.2 Update ArchieEdge test mocks to use `useLibrary` instead of `componentLibrary`
- [x] 2.1 Add max-length clamping for `incompatibilityReason` in `checkCompatibility` return value
- [x] 3.1 Add MUST CHECK #7 acknowledgement comments at rendering boundaries in `ConnectionDetail.tsx` and `ArchieEdge.tsx`
- [x] 3.2 Run `npm run test:quick` — all tests pass

## Dev Notes
- Source story: [4-3-connection-inspection-system](./story-4-3.md)
- Review findings: #2 (MUST CHECK #7), #3 (reactivity model), #5 (incompatibilityReason length)
- Files affected: `src/components/canvas/ArchieEdge.tsx`, `src/components/inspector/ConnectionDetail.tsx`, `src/engine/compatibilityChecker.ts`, `tests/unit/components/canvas/ArchieEdge.test.tsx`
