import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/guest-mode"

/**
 * Guest ("try without login") journey: an unauthenticated visitor enters from the login page, lands
 * straight in the First Service quest, and plays/simulates with ZERO Firestore writes — nothing is
 * persisted. Runs unauthenticated (empty storageState).
 *
 * NOTE: the guest catalog load requires the PUBLIC-read firestore.rules (components/stacks/blueprints/
 * metricCategories/_metadata `allow read: if true`). Until those rules are deployed, the catalog
 * read is denied for an unauthenticated client and the library can't load — so this spec is
 * deploy-gated and will skip if the library never populates.
 */
test.describe("Guest mode", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("guest enters from login, lands in the first quest, writes nothing to Firestore", async ({ page }) => {
    test.setTimeout(60_000)

    // Record any Firestore WRITE (commit/write) the page attempts — the security guarantee is zero.
    const firestoreWrites: string[] = []
    page.on("request", (req) => {
      const url = req.url()
      if (url.includes("firestore.googleapis.com") && /\/(commit|write|Write)\b/i.test(url)) {
        firestoreWrites.push(`${req.method()} ${url.slice(0, 120)}`)
      }
    })

    await page.goto("/login")
    await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 15_000 })

    // The "try without login" CTA.
    const guestBtn = page.getByTestId("guest-try-button")
    await expect(guestBtn).toBeVisible()
    await guestBtn.click()

    // Lands on the canvas (AuthGuard passthrough) — toolbar visible.
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 15_000 })

    // Deploy gate: if the public-read rules aren't live yet, the catalog can't load for a guest.
    const libraryLoaded = await page
      .locator('[data-testid="component-tab"]')
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!libraryLoaded, "Guest catalog read needs the public-read firestore.rules deployed")

    // The First Service quest auto-launched — the challenge HUD is up.
    await expect(page.getByTestId("challenge-hud")).toBeVisible({ timeout: 10_000 })

    // The mode toggle is hidden for guests (quest-scoped).
    await expect(page.getByTestId("mode-toggle")).toHaveCount(0)

    // The account chip shows the guest "sign in to save" affordance.
    await page.getByTestId("account-menu-trigger").click()
    await expect(page.getByTestId("guest-sign-in")).toBeVisible()
    await page.keyboard.press("Escape")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-guest-first-quest.png`, fullPage: true })

    // The core guarantee: nothing was written to Firestore for this guest.
    expect(firestoreWrites, `unexpected Firestore writes:\n${firestoreWrites.join("\n")}`).toHaveLength(0)
  })
})
