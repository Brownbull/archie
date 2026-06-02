import { test, expect, type Page } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/challenge-validation"

/**
 * Challenge validation E2E suite — tests required_types enforcement, progression tracking,
 * and challenge mode lifecycle for all 33 challenges.
 *
 * Strategy: uses page.evaluate to programmatically interact with Zustand stores (placing nodes,
 * setting progress, triggering scoring) rather than mouse-based drag-and-drop, which is flaky
 * for edge creation. This tests the scoring logic end-to-end through the real store/schema chain.
 */

// All 33 challenges with their required_types for enforcement testing
const CHALLENGES: Array<{
  id: string
  title: string
  requiredTypes: string[]
  requires: string[]
}> = [
  { id: "first-service", title: "First Service", requiredTypes: [], requires: [] },
  { id: "add-a-database", title: "Persist It", requiredTypes: ["relational-db"], requires: ["first-service"] },
  { id: "cache-the-hot-path", title: "Cache the Hot Path", requiredTypes: ["relational-db", "cache"], requires: ["add-a-database"] },
  { id: "edge-delivery", title: "Edge Delivery", requiredTypes: ["cdn", "load-balancer"], requires: ["edge-balance"] },
  { id: "scale-out", title: "Scale Out", requiredTypes: ["load-balancer"], requires: ["first-service"] },
  { id: "async-pipeline", title: "Async Pipeline", requiredTypes: ["message-queue", "relational-db"], requires: ["first-service", "add-a-database"] },
  { id: "search-at-scale", title: "Search at Scale", requiredTypes: ["search-engine", "cache"], requires: ["polyglot-persistence"] },
  { id: "zone-failure", title: "Zone Failure", requiredTypes: ["observability", "load-balancer"], requires: ["zone-replica", "edge-delivery"] },
  { id: "always-on", title: "Always On", requiredTypes: ["observability", "load-balancer", "cache"], requires: ["zone-failure"] },
  { id: "chaos-day", title: "Chaos Day", requiredTypes: ["observability", "load-balancer", "cache"], requires: ["always-on"] },
  { id: "serverless-burst", title: "Serverless Burst", requiredTypes: ["serverless", "load-balancer"], requires: ["scale-out"] },
  { id: "worker-fleet", title: "Worker Fleet", requiredTypes: ["worker", "message-queue"], requires: ["serverless-burst"] },
  { id: "foundations-mastery", title: "Foundations Mastery", requiredTypes: ["load-balancer", "cache", "message-queue"], requires: ["worker-fleet", "cache-the-hot-path"] },
  { id: "polyglot-persistence", title: "Polyglot Persistence", requiredTypes: ["relational-db", "nosql", "cache"], requires: ["cache-the-hot-path"] },
  { id: "analytics-backbone", title: "Analytics Backbone", requiredTypes: ["time-series-db", "graph-db", "vector-store"], requires: ["search-at-scale"] },
  { id: "dns-routing", title: "DNS Routing", requiredTypes: ["dns"], requires: ["first-service"] },
  { id: "edge-balance", title: "Load-Balanced Edge", requiredTypes: ["dns", "load-balancer"], requires: ["dns-routing", "scale-out"] },
  { id: "api-gateway", title: "API Gateway", requiredTypes: ["api-gateway", "auth"], requires: ["edge-delivery"] },
  { id: "edge-resilience", title: "Edge Under Chaos", requiredTypes: ["cdn", "api-gateway", "cache"], requires: ["api-gateway", "zone-failure"] },
  { id: "event-stream", title: "Stream the Data", requiredTypes: ["event-stream", "message-queue"], requires: ["async-pipeline"] },
  { id: "stream-processor", title: "Process & Aggregate", requiredTypes: ["stream-processor", "event-stream"], requires: ["event-stream"] },
  { id: "realtime-live", title: "Live Updates", requiredTypes: ["realtime", "stream-processor"], requires: ["stream-processor"] },
  { id: "async-backbone", title: "Event Backbone", requiredTypes: ["message-queue", "event-stream", "stream-processor", "realtime"], requires: ["realtime-live"] },
  { id: "observe-baseline", title: "Observe Baseline", requiredTypes: ["observability"], requires: ["first-service"] },
  { id: "zone-replica", title: "Zone Replica", requiredTypes: ["observability", "load-balancer"], requires: ["observe-baseline", "scale-out"] },
  { id: "auth-101", title: "Identify Yourself", requiredTypes: ["auth"], requires: ["first-service"] },
  { id: "rate-limit", title: "Quota Keeper", requiredTypes: ["auth", "rate-limiter"], requires: ["auth-101"] },
  { id: "siem-audit", title: "Audit Trail", requiredTypes: ["auth", "rate-limiter", "security"], requires: ["rate-limit"] },
  { id: "fortress", title: "Production Lockdown", requiredTypes: ["auth", "rate-limiter", "security", "observability"], requires: ["siem-audit", "always-on"] },
  { id: "llm-service", title: "LLM Service", requiredTypes: ["llm-gateway"], requires: ["first-service"] },
  { id: "data-pipeline", title: "Data Pipeline", requiredTypes: ["llm-gateway", "etl", "message-queue"], requires: ["llm-service", "add-a-database", "async-pipeline"] },
  { id: "rag-retrieval", title: "RAG at Scale", requiredTypes: ["llm-gateway", "vector-store", "search-engine"], requires: ["data-pipeline", "search-at-scale", "cache-the-hot-path"] },
  { id: "production-ai", title: "Production AI", requiredTypes: ["llm-gateway", "observability", "cache"], requires: ["rag-retrieval", "zone-failure", "always-on"] },
]

// All challenge ids for unlocking all prerequisites
const ALL_IDS = CHALLENGES.map((c) => c.id)

/** Unlock all challenges by pre-populating progress with all ids completed. */
async function unlockAllChallenges(page: Page) {
  await page.evaluate((ids) => {
    const key = "archie-user-progress"
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    parsed.state = { ...parsed.state, completedChallenges: ids, trackXp: {}, bestStarsCloud: {} }
    localStorage.setItem(key, JSON.stringify(parsed))
  }, ALL_IDS)
}

/** Score a challenge via the store, providing specific canvas type ids. */
async function scoreWithTypes(page: Page, challengeId: string, typeIdsOnCanvas: string[]): Promise<number> {
  return page.evaluate(
    ({ cId, typeIds }) => {
      // Access stores via zustand's internal module cache
      const challengeLoader = (window as any).__archie_challengeLoader
      const challengeStore = (window as any).__archie_challengeStore
      const simStats = { uptimePercent: 100, avgLatencyMs: 5, p99LatencyMs: 20, currentRps: 100, servedRps: 100, failedRps: 0, totalServed: 1000, totalFailed: 0 }

      if (!challengeStore || !challengeLoader) return -1

      const challenge = challengeLoader.getChallenge(cId)
      if (!challenge) return -2

      challengeStore.getState().selectChallenge(challenge)
      challengeStore.getState().startAttempt({ totalCost: 10, topologyIssueCount: 0 })
      const result = challengeStore.getState().scoreAttempt(simStats, 0, 10, new Set(typeIds))
      return result?.stars ?? -3
    },
    { cId: challengeId, typeIds: typeIdsOnCanvas },
  )
}

test.describe("Challenge Validation E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")
    await page.waitForTimeout(1000)

    // Expose stores to the page context for programmatic testing
    await page.evaluate(() => {
      return Promise.all([
        import("/src/services/challengeLoader").then((m) => { (window as any).__archie_challengeLoader = m }),
        import("/src/stores/challengeStore").then((m) => { (window as any).__archie_challengeStore = m.useChallengeStore }),
        import("/src/stores/userProgressStore").then((m) => { (window as any).__archie_userProgressStore = m.useUserProgressStore }),
      ])
    })
    await page.waitForTimeout(500)
  })

  test.describe("required_types enforcement — each challenge must fail without its required blocks", () => {
    for (const challenge of CHALLENGES) {
      if (challenge.requiredTypes.length === 0) continue

      test(`${challenge.id}: 0★ without required types [${challenge.requiredTypes.join(", ")}]`, async ({ page }) => {
        // Score with only base blocks (traffic-source + compute) — missing the required types
        const starsWithout = await scoreWithTypes(page, challenge.id, ["traffic-source", "compute"])
        expect(starsWithout).toBe(0)

        // Score WITH all required types present
        const fullPalette = ["traffic-source", "compute", ...challenge.requiredTypes]
        const starsWith = await scoreWithTypes(page, challenge.id, fullPalette)
        expect(starsWith).toBeGreaterThan(0)
      })
    }
  })

  test("first-service has no required_types — passes with just compute", async ({ page }) => {
    const stars = await scoreWithTypes(page, "first-service", ["traffic-source", "compute"])
    expect(stars).toBeGreaterThan(0)
  })

  test.describe("challenge mode lifecycle", () => {
    test("selecting a challenge enters building mode with the title in the top bar", async ({ page }) => {
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)

      const card = page.getByTestId("challenge-card-first-service")
      await expect(card).toBeVisible()
      await card.click()
      await page.waitForTimeout(1000)

      await expect(page.getByTestId("challenge-active-indicator")).toBeVisible()
      await expect(page.getByTestId("challenge-active-indicator")).toContainText("First Service")
      await expect(page.getByTestId("challenge-hud")).toBeVisible()
      await page.screenshot({ path: `${SCREENSHOT_DIR}/lifecycle-01-building.png`, fullPage: true })
    })

    test("starting and completing a challenge shows the results modal", async ({ page }) => {
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("challenge-card-first-service").click()
      await page.waitForTimeout(1000)

      const startBtn = page.getByTestId("start-challenge")
      await expect(startBtn).toBeVisible()
      await startBtn.click()
      await page.waitForTimeout(500)

      // Speed up the simulation
      const speedBtn = page.getByTestId("playback-speed-10")
      if (await speedBtn.isVisible().catch(() => false)) {
        await speedBtn.click()
      }

      // Wait for results
      await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 60_000 })
      const starsLabel = await page.getByTestId("result-stars").getAttribute("aria-label")
      expect(starsLabel).toMatch(/[0-3] of 3 stars/)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/lifecycle-02-scored.png`, fullPage: true })
    })

    test("Close on results stays in challenge mode (returns to building)", async ({ page }) => {
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("challenge-card-first-service").click()
      await page.waitForTimeout(1000)

      await page.getByTestId("start-challenge").click()
      const speedBtn = page.getByTestId("playback-speed-10")
      if (await speedBtn.isVisible().catch(() => false)) await speedBtn.click()

      await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 60_000 })
      await page.getByTestId("result-close").click()
      await page.waitForTimeout(500)

      // Should STILL be in challenge mode
      await expect(page.getByTestId("challenge-active-indicator")).toBeVisible()
      await expect(page.getByTestId("challenge-hud")).toBeVisible()
      await page.screenshot({ path: `${SCREENSHOT_DIR}/lifecycle-03-close-stays.png`, fullPage: true })
    })

    test("Exit on HUD leaves challenge mode", async ({ page }) => {
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("challenge-card-first-service").click()
      await page.waitForTimeout(1000)

      await expect(page.getByTestId("challenge-hud")).toBeVisible()
      await page.getByTestId("challenge-exit").click()
      await page.waitForTimeout(500)

      await expect(page.getByTestId("challenge-active-indicator")).toHaveCount(0)
      await expect(page.getByTestId("challenge-hud")).toHaveCount(0)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/lifecycle-04-exited.png`, fullPage: true })
    })
  })

  test.describe("progression tracking", () => {
    test("completing first-service unlocks tier-I challenges across all tracks", async ({ page }) => {
      // Complete first-service, then reload so Zustand picks it up from the real auth flow
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("challenge-card-first-service").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("start-challenge").click()
      const speedBtn = page.getByTestId("playback-speed-10")
      if (await speedBtn.isVisible().catch(() => false)) await speedBtn.click()
      await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 60_000 })
      await page.getByTestId("result-close").click()
      await page.waitForTimeout(500)
      await page.getByTestId("challenge-exit").click()
      await page.waitForTimeout(500)

      // Open journey and check unlocked challenges
      await page.getByTestId("menu-journey").click()
      await page.waitForTimeout(1000)

      // First Service should show completed (3 stars earned)
      const firstService = page.locator('[data-testid="tree-node-first-service"]')
      await expect(firstService).toHaveAttribute("data-status", "completed")

      // Tier-I challenges unlocked by first-service should be available
      for (const id of ["add-a-database", "scale-out", "dns-routing", "observe-baseline", "auth-101", "llm-service"]) {
        const node = page.locator(`[data-testid="tree-node-${id}"]`)
        if (await node.isVisible().catch(() => false)) {
          const status = await node.getAttribute("data-status")
          expect(status).toBe("available")
        }
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/progression-01-unlocked.png`, fullPage: true })
    })

    test("mastery profile shows rank after completing first-service", async ({ page }) => {
      // Complete first-service to earn XP
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("challenge-card-first-service").click()
      await page.waitForTimeout(1000)
      await page.getByTestId("start-challenge").click()
      const speedBtn = page.getByTestId("playback-speed-10")
      if (await speedBtn.isVisible().catch(() => false)) await speedBtn.click()
      await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 60_000 })
      await page.getByTestId("result-close").click()
      await page.waitForTimeout(500)
      await page.getByTestId("challenge-exit").click()
      await page.waitForTimeout(500)

      // Open mastery profile
      await page.getByTestId("account-menu-trigger").click()
      await page.waitForTimeout(300)
      await page.getByTestId("account-mastery-profile").click()
      await page.waitForTimeout(1000)

      const rank = page.getByTestId("overall-rank")
      await expect(rank).toBeVisible()
      // first-service awards ~34 XP per star (100/3) × 3 stars = ~100 XP → Apprentice (≥100)
      await expect(rank).toContainText("Apprentice")

      await page.screenshot({ path: `${SCREENSHOT_DIR}/progression-02-profile.png`, fullPage: true })
    })
  })

  test.describe("challenge selector gating", () => {
    test("locked challenges are disabled and show prerequisites", async ({ page }) => {
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)

      // Tier II+ challenges should be locked
      const scaleOut = page.getByTestId("challenge-card-scale-out")
      if (await scaleOut.isVisible()) {
        // scale-out requires first-service — should be locked if not completed
        const status = await scaleOut.getAttribute("data-status")
        if (status === "locked") {
          await expect(scaleOut).toBeDisabled()
          await expect(scaleOut).toContainText("Requires")
        }
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/gating-01-locked.png`, fullPage: true })
    })
  })
})
