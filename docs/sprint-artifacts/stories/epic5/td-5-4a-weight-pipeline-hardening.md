# Tech Debt Story TD-5-4a: Weight Pipeline Type Safety & Hardening

Status: review

> **Source:** KDBP Code Review (2026-03-06) on story 5-4
> **Priority:** LOW | **Estimated Effort:** SMALL (1 pt)

## Story
As a **developer**, I want **the weight profile pipeline to have tighter types and consistent data extraction**, so that **downstream consumers don't need unnecessary null checks and the public API has proper input guards**.

## Acceptance Criteria

**AC-1: HydratedArchitecture.weightProfile is required (not optional)**
Given the importer always assigns weightProfile before returning success,
When consuming HydratedArchitecture,
Then weightProfile is typed as `WeightProfile` (non-optional) and no `!` assertions are needed downstream.

**AC-2: importYamlString has a size guard**
Given importYamlString is a public export callable without file-level guards,
When text.length > MAX_FILE_SIZE,
Then return an error result (consistent with importYaml behavior).

**AC-3: BlueprintTab does not override user weight profile**
Given a user has custom slider positions,
When loading a blueprint,
Then weightProfile is passed as undefined to loadArchitecture (preserving user preferences).

**AC-4: ExportButton uses consistent data extraction**
Given ExportButton reads nodes/edges via getArchitectureSkeleton(),
When reading weightProfile,
Then it also comes from a consistent extraction helper (either extend getArchitectureSkeleton or create getExportData).

## Tasks / Subtasks

- [x] Task 1: Make HydratedArchitecture.weightProfile required
  - [x] 1.1 Change type from `weightProfile?: WeightProfile` to `weightProfile: WeightProfile`
  - [x] 1.2 Remove downstream `!` assertions or optional chaining on weightProfile
  - [x] 1.3 Ensure hydrateArchitectureSkeleton always provides a value (add DEFAULT fallback if data.weightProfile is undefined)

- [x] Task 2: Add size guard to importYamlString
  - [x] 2.1 Add `if (text.length > MAX_FILE_SIZE)` check at top of importYamlString
  - [x] 2.2 Return FILE_TOO_LARGE error result
  - [x] 2.3 Add unit test for oversized string input

- [x] Task 3: BlueprintTab weight profile pass-through
  - [x] 3.1 Change BlueprintTab doLoad to pass `undefined` instead of `result.architecture.weightProfile`
  - [x] 3.2 Add test confirming blueprint load preserves user weight preferences

- [x] Task 4: ExportButton extraction consistency
  - [x] 4.1 Extend getArchitectureSkeleton or create getExportData to include weightProfile
  - [x] 4.2 Update ExportButton to use the new extraction helper

## Dev Notes
- Source story: [5-4](./5-4.md)
- Review findings: #1, #2, #5, #6
- Files affected: yamlImporter.ts, ExportButton.tsx, BlueprintTab.tsx, architectureStore.ts
