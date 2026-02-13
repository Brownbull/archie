# Story: TD-1-4b Sanitizer Hardening & Constant Consolidation

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story TD-1-4a (2026-02-13)

## Overview

Low-severity improvements identified during TD-1-4a review. Three items that harden the sanitization utility before Epic 3 YAML import integration, plus a minor constant consolidation.

## Items

### 1. ReDoS Guard (Finding #3 — LOW)

**Problem:** `sanitizeDisplayString` processes regex patterns before truncation. Deeply nested or malformed HTML in a 500-char input could cause regex backtracking.

**Fix:** Add early length guard before regex processing: truncate to `maxLength * 2` before running regex layers. This bounds worst-case regex execution while preserving sanitization accuracy.

**Files:** `src/lib/sanitize.ts`, `tests/unit/lib/sanitize.test.ts`

### 2. Unicode Normalization (Finding #4 — LOW)

**Problem:** Homoglyph attacks could bypass tag detection (e.g., Cyrillic 's' in `<ѕcript>`). The sanitizer operates on raw bytes without Unicode normalization.

**Fix:** Add `input.normalize('NFC')` as the first sanitization step. This collapses look-alike Unicode sequences before regex matching.

**Files:** `src/lib/sanitize.ts`, `tests/unit/lib/sanitize.test.ts`

### 3. POSITION_EPSILON Consolidation (Finding #2 — LOW)

**Problem:** `POSITION_EPSILON = 1` is defined locally in `architectureStore.ts`. Other spatial constants (`NODE_WIDTH`, `CANVAS_GRID_SIZE`, `NODE_GAP`) live in `src/lib/constants.ts`.

**Fix:** Move `POSITION_EPSILON` to `src/lib/constants.ts` alongside related spatial constants for discoverability and consistency.

**Files:** `src/lib/constants.ts`, `src/stores/architectureStore.ts`

## Acceptance Criteria

- AC-1: `sanitizeDisplayString` truncates input to `maxLength * 2` before regex processing
- AC-2: `sanitizeDisplayString` normalizes Unicode (NFC) before tag detection
- AC-3: `POSITION_EPSILON` exported from `src/lib/constants.ts`, imported in architectureStore
- AC-4: Existing sanitize tests still pass, new tests added for ReDoS and Unicode edge cases

## Priority

LOW — All items are defense-in-depth improvements. Items 1-2 should be completed before Epic 3 YAML import integration. Item 3 is pure cleanup.

## Senior Developer Review (ECC)

**Date:** 2026-02-13
**Classification:** SIMPLE | **Agents:** code-reviewer, tdd-guide
**Score:** 8.5/10 | **Status:** APPROVED

### Findings

| # | Sev | Agent | Finding | Resolution |
|---|------|-------|---------|------------|
| 1 | LOW | code-reviewer | Layer comment order (1c/1d) didn't match execution order | Fixed — comments clarified |
| 2 | INFO | code-reviewer | Test comment said "homoglyph bypass" but NFC prevents combining-character bypass | Fixed — comment corrected |
| 3 | INFO | tdd-guide | No test for AC-3 (constant move) — correct per testing conventions | N/A |

### AC Verification

- AC-1: PASS — Pre-truncation to `maxLength * 2` before regex (sanitize.ts:46-48)
- AC-2: PASS — Unicode NFC normalization before tag detection (sanitize.ts:44)
- AC-3: PASS — POSITION_EPSILON exported from constants.ts, imported in architectureStore
- AC-4: PASS — 25 sanitize tests green, 3 ReDoS + 3 Unicode tests added
