# Testing Conventions

## Test Tiers - Use the Right Command

| Command | Duration | When |
|---------|----------|------|
| `npm run test:quick` | ~30s | After each task during development |
| `npm run test:story` | ~2min | Before marking story as "review" |
| `npm run test:sprint` | ~5min | End of epic, before release |

Always run the lightest sufficient tier. Prefer `npx vitest run <path>` for a single file.

## CI-Enforced Coverage Thresholds

Lines: 45% | Branches: 30% | Functions: 25% | Statements: 40%

New code should meet or exceed these. Do not lower thresholds.

## File Layout

- Unit: `tests/unit/**/*.test.ts(x)` — mirrors `src/` structure
- Integration: `tests/integration/**/*.test.ts(x)` — cross-module interactions
- E2E: `tests/e2e/**/*.spec.ts` — full user journeys via Playwright

## Testing Priority by Domain

### YAML Schema & Data Layer (Critical)
- Validate all YAML schemas against spec (component, stack, blueprint)
- Test configuration variant switching and metric recalculation
- Test malformed YAML gracefully rejects with clear errors
- Test import/export round-trip (load YAML → modify → save → reload = identical)

### Canvas Interactions (React Flow)
- Test drag-and-drop placement of components
- Test connection creation between compatible ports
- Test WARN behavior on incompatible connections
- Test configuration dropdown changes trigger metric updates
- Test canvas state serialization to/from YAML

### Metric Calculations (Deterministic)
- All metric recalculations must be deterministic — same inputs = same outputs
- Test boundary values for each metric category
- Test multi-component recalculation chains (A connects to B, B metrics affect C)
- Test priority slider weight changes propagate correctly

## E2E Testing

**Run command:** `npm run test:e2e` (auto-unsets conflicting shell env vars)

**Playwright project:** `desktop` only (Archie is a desktop web application)

### Auth Pattern
- `global-setup.ts` authenticates via the dev-only test login button, saves storageState to `tests/e2e/.auth/user.json`
- The `desktop` project depends on `setup` and injects the saved storageState automatically
- Authenticated tests use the `page` fixture directly (auth is pre-loaded)
- Unauthenticated tests override with `test.use({ storageState: { cookies: [], origins: [] } })` inside a `test.describe` block — do NOT use `browser.newContext()`

### Screenshot Persistence
- Save screenshots at key steps: `fullPage: true`, to `test-results/{spec-name}/` (e.g. `test-results/auth-and-app-shell/`)
- Define `const SCREENSHOT_DIR = "test-results/{spec-name}"` at the top of each spec file
- Use descriptive numbered filenames: `01-app-shell-authenticated.png`, `02-all-regions-visible.png`
- Screenshots persist across runs — only overwritten when the same test re-runs
- `test-results/INDEX.md` is tracked in git; all other `test-results/*` content is gitignored
- Playwright auto-artifacts (traces, failure screenshots, videos) go to `playwright-artifacts/` (fully gitignored)

### New Spec File Template
```typescript
import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/{spec-name}"

test.describe("Feature E2E", () => {
  test("authenticated scenario", async ({ page }) => {
    // page has auth pre-loaded from storageState
    await page.goto("/")
    // ... assertions ...
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-description.png`, fullPage: true })
  })

  test.describe("unauthenticated", () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test("unauthenticated scenario", async ({ page }) => {
      // page has NO auth — clean context
      await page.goto("/")
      // ... assertions ...
    })
  })
})
```

### E2E Selector Priority
Always use this priority order: `data-testid` > `getByRole` > scoped locator > bare text (last resort)

### E2E Wait Strategy
- Use `element.waitFor({ state: 'hidden/visible' })` for state changes
- Use `waitForTimeout` ONLY for settling (< 1000ms)
- NEVER use `waitForTimeout(2000+)` for async operations

## What NOT to Test

- React rendering alone (React tests itself)
- TypeScript compilation (tsc handles this)
- Constants and trivial values
- Implementation details — prefer `toHaveBeenCalledWith(expected)` over bare `toHaveBeenCalled`
- Third-party library internals (React Flow, js-yaml)

## Common Test Pitfalls

- Default array/object params as hook dependencies cause infinite loops (`[] !== []` on each render)
- `setTimeout` in components: use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`
- Canvas position-dependent tests are flaky — assert on data state, not pixel coordinates
- YAML parsing tests: always test both valid and malformed input
- Vitest module state contamination: always reset mocks between tests with `vi.resetAllMocks()`
