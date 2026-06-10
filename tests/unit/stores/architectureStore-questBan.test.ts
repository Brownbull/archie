import { describe, it, expect, beforeEach, vi } from "vitest"

// Minimal typed library: a banned-able relational-db, a safe cache, plus a traffic source.
const { testComponentMap } = vi.hoisted(() => {
  const map = new Map<string, unknown>()
  const mk = (o: Record<string, unknown>) => ({
    name: "T", category: "data-storage", description: "d", is: "i", gain: ["g"], cost: ["c"], tags: [],
    baseMetrics: [], ...o,
  })
  map.set("postgresql", mk({
    id: "postgresql", name: "PostgreSQL", typeId: "relational-db",
    configVariants: [{ id: "single-node", name: "Single Node", metrics: [] }],
  }))
  map.set("aws-s3", mk({
    id: "aws-s3", name: "S3", typeId: "object-storage",
    configVariants: [{ id: "standard", name: "Standard", metrics: [] }],
  }))
  map.set("redis", mk({
    id: "redis", name: "Redis", category: "caching", typeId: "cache",
    configVariants: [{ id: "standalone", name: "Standalone", metrics: [] }],
  }))
  return { testComponentMap: map }
})

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => testComponentMap.get(id)),
    getComponentsByCategory: vi.fn((category: string) =>
      [...testComponentMap.values()].filter((c) => (c as { category: string }).category === category),
    ),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("sonner", () => ({ toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() } }))

let uuidCounter = 0
vi.stubGlobal("crypto", { randomUUID: () => `test-uuid-${++uuidCounter}` })

import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { toast } from "sonner"
import type { Challenge } from "@/lib/challengeTypes"

const banChallenge = {
  id: "c-ban", title: "No SQL", brief: "b", difficulty: "beginner",
  budgetCap: 100, durationSeconds: 60, trafficCurve: [{ t: 0, rps: 0 }],
  requiredComponents: [], targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 },
  scheduledEvents: [], hints: [], forbiddenTypes: ["relational-db"],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
} as Challenge

const s = () => useArchitectureStore.getState()

/**
 * Phase 2 review follow-up (the Swap/ghost bypass findings): no canvas-MUTATING path may place a
 * quest-banned type — the toolbox card lock only covers the palette. The store chokepoint covers
 * Quick-Swap, ghost place, radial add, and smart add, with a toast as the player-facing lesson.
 */
describe("architectureStore — quest forbidden-type chokepoint", () => {
  beforeEach(() => {
    useArchitectureStore.setState({ nodes: [], edges: [] })
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle" })
    vi.mocked(toast.warning).mockClear()
  })

  it("addNode blocks a banned type in quest mode (the ghost/radial/smart-add paths)", () => {
    useChallengeStore.setState({ activeChallenge: banChallenge })
    s().addNode("postgresql", { x: 0, y: 0 })
    expect(s().nodes).toHaveLength(0)
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("banned in this quest"))
  })

  it("addNode allows the same type in free build", () => {
    s().addNode("postgresql", { x: 0, y: 0 })
    expect(s().nodes).toHaveLength(1)
  })

  it("addNode allows non-banned types in quest mode", () => {
    useChallengeStore.setState({ activeChallenge: banChallenge })
    s().addNode("redis", { x: 0, y: 0 })
    expect(s().nodes).toHaveLength(1)
  })

  it("swapNodeComponent blocks swapping INTO a banned type (the Quick-Replace bypass)", () => {
    useChallengeStore.setState({ activeChallenge: banChallenge })
    s().addNode("aws-s3", { x: 0, y: 0 }) // same category (data-storage), allowed
    const nodeId = s().nodes[0].id
    s().swapNodeComponent(nodeId, "postgresql")
    expect(s().nodes[0].data.archieComponentId).toBe("aws-s3") // unchanged
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("banned in this quest"))
  })

  it("swapNodeComponent still swaps freely outside a quest", () => {
    s().addNode("aws-s3", { x: 0, y: 0 })
    const nodeId = s().nodes[0].id
    s().swapNodeComponent(nodeId, "postgresql")
    expect(s().nodes[0].data.archieComponentId).toBe("postgresql")
  })
})
