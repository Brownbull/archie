import { test as setup } from "@playwright/test"
import { loginWithTestCredentials } from "./helpers/auth"

const AUTH_FILE = "tests/e2e/.auth/user.json"

setup("authenticate with test credentials", async ({ page }) => {
  await loginWithTestCredentials(page)

  // Save authenticated state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE })
})
