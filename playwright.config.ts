import { defineConfig, devices } from "@playwright/test"

const AUTH_FILE = "tests/e2e/.auth/user.json"
const UNLOCKED_AUTH_FILE = "tests/e2e/.auth/unlocked-user.json"

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "playwright-artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5174",
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
      // Seeds the dedicated all-quests-complete replay account into unlocked-user.json (D72).
      name: "unlocked-setup",
      testMatch: /unlocked-setup\.ts/,
    },
    {
      // Normal specs: the primary test user. Excludes both setups + the unlocked replay specs.
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
      testIgnore: [/global-setup\.ts/, /unlocked-setup\.ts/, /\.unlocked\.spec\.ts$/],
      dependencies: ["setup"],
    },
    {
      // Replay specs (*.unlocked.spec.ts): the dedicated all-complete account, so any quest is replayable.
      name: "desktop-unlocked",
      use: {
        ...devices["Desktop Chrome"],
        storageState: UNLOCKED_AUTH_FILE,
      },
      testMatch: /\.unlocked\.spec\.ts$/,
      dependencies: ["unlocked-setup"],
    },
  ],
  webServer: {
    command: "bash -c 'unset ${!VITE_FIREBASE_*} 2>/dev/null; npx vite --port 5174'",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
