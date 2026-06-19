import type { Page } from "@playwright/test"

/**
 * Warm the reference-data (catalog) cache before a setup saves its storageState.
 *
 * The componentLibrary writes the catalog to localStorage (`archie-refdata-*`, see refDataCache.ts)
 * the first time it loads. Capturing that in the saved auth state lets EVERY test reuse it instead of
 * cold-loading the whole catalog (~150 Firestore `getDocs` reads) on each fresh browser context — the
 * dominant Firestore cost (the full desktop suite cold-loaded ~150 reads × ~287 tests = ~43k reads per
 * run). With the cache warmed, a test's `isCacheValid()` costs 1 read (the `_metadata/seed` version
 * check) and then serves the catalog from localStorage — a ~99% cut on test reads.
 *
 * `component-tab` renders only once the library is ready (`libraryReady`), so its visibility is the
 * signal that the catalog has been fetched and written to localStorage. Best-effort: if it can't load
 * here, tests simply cold-load as before — no worse than today.
 */
export async function warmCatalogCache(page: Page): Promise<void> {
  await page.goto("/")
  await page
    .locator('[data-testid="component-tab"]')
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(() => {})
  // Let writeCache flush to localStorage before storageState() snapshots it.
  await page.waitForTimeout(300)
}
