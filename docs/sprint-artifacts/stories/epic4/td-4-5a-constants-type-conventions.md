# Tech Debt Story TD-4-5a: Constants & Type Conventions Cleanup

Status: ready-for-dev

> **Source:** ECC Code Review (2026-02-25) on story 4-5
> **Priority:** LOW | **Estimated Effort:** Small (2 tasks)

## Story
As a **developer**, I want **unused particle speed constants removed (or wired to CSS generation) and Z_INDEX string format convention documented with type narrowing**, so that **constants stay in sync with their CSS counterparts and the Tailwind class interpolation pattern is explicit**.

## Acceptance Criteria

**AC-1 (PARTICLE_SPEED constants sync):**
Given `PARTICLE_SPEED_HEALTHY_MS`, `PARTICLE_SPEED_WARNING_MS`, `PARTICLE_SPEED_BOTTLENECK_MS` are declared in `constants.ts` but never imported
When the canonical animation durations live in `src/index.css` CSS classes
Then either: (a) remove the TS constants and document CSS as the source of truth, or (b) wire the constants to CSS custom properties so they stay in sync
Preference: option (a) unless a TS consumer is identified

**AC-2 (Z_INDEX string format convention):**
Given `Z_INDEX` values are Tailwind class strings (`"z-10"`, `"z-40"`, etc.) interpolated into `className` props
When a value is changed to a non-Tailwind format (e.g., numeric), components using string interpolation would silently break
Then add a JSDoc comment on the `Z_INDEX` constant documenting the string-class convention
And optionally narrow the type to template literal types (e.g., `z-${number}` | `z-[${number}]`)

## Tasks / Subtasks

- [ ] **Task 1: Resolve PARTICLE_SPEED_*_MS constants**
  - [ ] 1a. Search codebase for any imports of `PARTICLE_SPEED_*_MS`
  - [ ] 1b. If no consumers: remove the 3 constants from `constants.ts`
  - [ ] 1c. Add a comment in `index.css` particle section noting CSS is the canonical source for animation durations

- [ ] **Task 2: Document Z_INDEX convention**
  - [ ] 2a. Add JSDoc on `Z_INDEX` constant explaining values are Tailwind class strings for `className` interpolation
  - [ ] 2b. Optionally add template literal type narrowing

## Dev Notes
- Source story: [4-5](./story-4-5.md)
- Review findings: #1, #5
- Files affected: `src/lib/constants.ts`, `src/index.css`
- Finding #6 (protocol allowlist) deferred to YAML import story — covered by TD-4-3b AC-3 documentation for current rendering
