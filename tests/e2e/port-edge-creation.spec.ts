import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/port-edge-creation"

/**
 * Port-compatible edge RENDERING (Epic 12, Phase 3).
 *
 * D23: React Flow's connection handle-drag (mouse-down on a source port handle, drag to a target
 * handle, mouse-up) does not reliably create an edge under headless Playwright — the synthetic
 * pointer stream never triggers RF's onConnect. So the drag GESTURE that computes port
 * compatibility is exercised at the store level instead:
 *   - tests/unit/stores/architectureStore-ports.test.ts
 *       · "detects port type mismatch between http-out and db-in"      (mismatch path)
 *       · "marks compatible port connection (db-out → db-in) ...".     (compatible path)
 *       · "stores null handle IDs when no handles provided"            (generic-handle path)
 *   - tests/unit/engine/portCompatibilityChecker.test.ts               (the rule itself)
 *
 * What E2E uniquely owns is the import → hydrate → RENDER pipeline: yamlImporter recomputes
 * isPortMismatch from the stored handle IDs (yamlImporter.ts:412-423) and ArchieEdge renders the
 * ConnectionWarning from edge data. We drive that with authored fixtures (the same reliable path
 * the CI-gated specs use) rather than a drag we can't perform.
 */

const COMPATIBLE_FIXTURE = "tests/e2e/fixtures/connection/compatible-port-edge.architecture.yaml"
const MISMATCH_FIXTURE = "tests/e2e/fixtures/connection/mismatched-port-edge.architecture.yaml"
const PLAIN_FIXTURE = "tests/e2e/fixtures/connection/two-node-edge.architecture.yaml"

test.describe("Port-Compatible Edge Creation (Epic 12, Phase 3)", () => {
  test("compatible port connection (db-out → db-in) renders an edge without a warning", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await page.locator('[data-testid="import-file-input"]').setInputFiles(COMPATIBLE_FIXTURE)

    const edges = page.locator('[data-testid="archie-edge"]')
    await expect(edges).toHaveCount(1, { timeout: 15_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-compatible-edge-created.png`,
      fullPage: true,
    })

    // Compatible database port pair → no mismatch, no incompatibility warning.
    const warning = page.locator('[data-testid="connection-warning"]')
    await expect(warning).toHaveCount(0)
  })

  test("mismatched port connection (http-out → db-in) renders a port mismatch warning", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await page.locator('[data-testid="import-file-input"]').setInputFiles(MISMATCH_FIXTURE)

    const edges = page.locator('[data-testid="archie-edge"]')
    await expect(edges).toHaveCount(1, { timeout: 15_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-mismatched-edge-warning.png`,
      fullPage: true,
    })

    const warning = page.locator('[data-testid="connection-warning"]')
    await expect(warning).toHaveCount(1, { timeout: 3_000 })

    const portMismatch = page.locator('[data-testid="connection-warning"][data-port-mismatch]')
    await expect(portMismatch).toHaveCount(1)
  })

  test("edge with no port handles still renders (generic/legacy connection)", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // The plain fixture omits handle IDs entirely. The importer resolves a default port pair; the
    // null-handle-storage path (when no ports resolve) is asserted in architectureStore-ports.test.ts.
    await page.locator('[data-testid="import-file-input"]').setInputFiles(PLAIN_FIXTURE)

    const edges = page.locator('[data-testid="archie-edge"]')
    await expect(edges).toHaveCount(1, { timeout: 15_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-edge-created-generic-handles.png`,
      fullPage: true,
    })
  })
})
