import { defineConfig, devices } from "@playwright/test"

const AUTH_FILE = "tests/e2e/.auth/user.json"

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "playwright-artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
      testIgnore: /global-setup\.ts/,
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
