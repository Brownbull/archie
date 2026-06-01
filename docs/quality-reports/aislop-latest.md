# aislop Quality Report

**Date:** 20260601-154657
**Score:** 39/100 (Critical)
**Scan:** `aislop scan --staged`

## Engine Summary

| Engine | Issues | Time |
|--------|--------|------|
| lint | 27 | 1373ms |
| code-quality | 1 | 20023ms |
| ai-slop | 0 | 37ms |
| security | 10 | 5010ms |

## Findings

### code-quality (1)

- [!] `src/components/challenges/ChallengeSelector.tsx:38` — complexity/function-too-long: Function 'ChallengeSelector' has 116 lines (max: 80)

### lint (27)

- [!] `src/components/dashboard/DashboardOverlay.tsx:255` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/services/yamlImporter.ts:137` — eslint/no-unused-vars: Catch parameter '_err' is caught but never used.
- [!] `src/components/inspector/ConfigSelector.tsx:24` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/dashboard/CategoryBar.tsx:30` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/unit/components/canvas/ObjectActionToolbar.test.tsx:35` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `tests/unit/components/canvas/ObjectActionToolbar.test.tsx:35` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/unit/services/yamlImporter-v3-migration.test.ts:4` — eslint/no-unused-vars: Identifier 'setPortResolver' is imported but never used.
- [!] `src/components/canvas/ArchieNode.tsx:7` — import/no-duplicates: Module '@/lib/constants' is imported more than once in this file
- [!] `src/components/canvas/ArchieNode.tsx:304` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/ArchieNode.tsx:304` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/inspector/FitIndicator.tsx:55` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/canvas/NodeProviderSelect.tsx:59` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/NodeProviderSelect.tsx:59` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/layout/AppMenuBar.tsx:47` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/layout/AppMenuBar.tsx:47` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/e2e/status-dot-and-swap-popover.spec.ts:144` — eslint/no-unused-vars: Variable 'node' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/integration/data-context-flow.test.ts:4` — eslint/no-unused-vars: Type 'FitLevel' is imported but never used.
- [!] `tests/unit/stores/architectureStore.test.ts:1` — eslint/no-unused-vars: Identifier 'afterEach' is imported but never used.
- [!] `tests/unit/engine/simulationEngine.test.ts:3` — import/no-duplicates: Modules should not be imported multiple times in the same file
- [!] `tests/unit/schemas/challengeSchema.test.ts:31` — eslint/no-unused-vars: Variable 'scheduled_events' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/schemas/challengeSchema.test.ts:31` — eslint/no-unused-vars: Variable 'hints' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/schemas/portDefinition.test.ts:31` — eslint/no-unused-vars: Variable 'key' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/e2e/global-setup.ts:20` — unicorn/no-useless-fallback-in-spread: Empty fallbacks in spreads are unnecessary
- [!] `tests/e2e/export-report.spec.ts:5` — eslint/no-unused-vars: Identifier 'waitForBlueprints' is imported but never used.
- [!] `tests/e2e/port-handles.spec.ts:66` — eslint/no-unused-vars: Variable 'expressPortHandles' is declared but never used. Unused variables should start with a '_'.

### security (10)

- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/firestore (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/storage (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @vitest/coverage-v8 (critical)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): firebase-admin (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): gaxios (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): google-gax (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): retry-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): teeny-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): uuid (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): vitest (critical)

