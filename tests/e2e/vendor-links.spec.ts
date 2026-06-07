import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, selectNodeOnCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/vendor-links"

interface VendorCheck {
  typeId: string
  vendorId: string
  vendorName: string
  vendorUrl: string
  isNew: boolean
}

const VENDORS_TO_TEST: VendorCheck[] = [
  { typeId: "load-balancer", vendorId: "traefik", vendorName: "Traefik", vendorUrl: "https://traefik.io/traefik/", isNew: true },
  { typeId: "cdn", vendorId: "azure-cdn", vendorName: "Azure CDN", vendorUrl: "https://azure.microsoft.com/en-us/products/cdn", isNew: true },
  { typeId: "object-storage", vendorId: "cloudflare-r2", vendorName: "Cloudflare R2", vendorUrl: "https://www.cloudflare.com/developer-platform/products/r2/", isNew: true },
  { typeId: "relational-db", vendorId: "postgresql", vendorName: "PostgreSQL", vendorUrl: "https://www.postgresql.org/", isNew: false },
  { typeId: "cache", vendorId: "redis", vendorName: "Redis", vendorUrl: "https://redis.io/", isNew: false },
]

async function swapVendorViaDOM(page: import("@playwright/test").Page, vendorName: string): Promise<void> {
  // Fluidity P1: the provider picker is on the canvas block now — `archie-node-provider` IS the Radix
  // combobox trigger. A native Playwright click opens it reliably (the node isn't behind an overlay, so
  // the old DOM-event hack is unnecessary and silently no-op'd on Radix).
  const trigger = page.locator('[data-testid="archie-node-provider"]')
  await expect(trigger).toBeVisible({ timeout: 3_000 })
  await trigger.click()

  const listbox = page.locator("[role='listbox']")
  await expect(listbox).toBeVisible({ timeout: 3_000 })
  await listbox.locator('[role="option"]').filter({ hasText: vendorName }).first().click()
  await page.waitForTimeout(300)
}

test.describe("Vendor source links — 3 new + 2 existing vendors", () => {
  for (const vendor of VENDORS_TO_TEST) {
    test(`${vendor.isNew ? "NEW" : "EXISTING"}: ${vendor.vendorName} shows correct info and vendor link`, async ({ page }) => {
      await page.goto("/")
      const hasComponents = await waitForComponentLibrary(page)
      test.skip(!hasComponents, "Skipped: no seeded data")
      await page.waitForTimeout(1000)

      // Dismiss the Welcome tour if it appears
      const skipBtn = page.getByRole("button", { name: "Skip" })
      if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await skipBtn.click()
        await page.waitForTimeout(500)
      }

      // Add the type block to canvas
      const addBtn = page.locator(`[data-testid="add-type-${vendor.typeId}"]`)
      await addBtn.scrollIntoViewIfNeeded()
      await expect(addBtn).toBeVisible({ timeout: 5_000 })
      await addBtn.click()
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

      // Select the node to open inspector
      await selectNodeOnCanvas(page, 0)
      const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
      await expect(inspectorPanel).toBeVisible({ timeout: 5_000 })

      // Check if we need to swap to the target vendor
      const currentProvider = await inspectorPanel
        .locator('[data-testid="inspector-summary-provider"]')
        .textContent()
        .catch(() => "")

      if (currentProvider !== vendor.vendorName) {
        await swapVendorViaDOM(page, vendor.vendorName)
      }

      // Verify vendor name
      const provider = inspectorPanel.locator('[data-testid="inspector-summary-provider"]')
      await expect(provider).toHaveText(vendor.vendorName)

      // Verify vendor source link
      const vendorLink = inspectorPanel.locator('[data-testid="inspector-vendor-link"]')
      await expect(vendorLink).toBeVisible()
      await expect(vendorLink).toHaveAttribute("href", vendor.vendorUrl)
      await expect(vendorLink).toHaveAttribute("target", "_blank")

      // Verify cost
      const cost = inspectorPanel.locator('[data-testid="inspector-summary-cost"]')
      await expect(cost).toBeVisible()
      const costText = await cost.textContent()
      expect(costText).toBeTruthy()

      // Verify description
      const headline = inspectorPanel.locator('[data-testid="inspector-headline"]')
      await expect(headline).toBeVisible()
      const headlineText = await headline.textContent()
      expect(headlineText!.length).toBeGreaterThan(10)

      const label = vendor.isNew ? "new" : "existing"
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${vendor.vendorId}-${label}.png`,
        fullPage: true,
      })
    })
  }
})
