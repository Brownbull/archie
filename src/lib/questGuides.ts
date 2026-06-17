import type { TourStep } from "@/components/onboarding/SpotlightTour"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { ComponentCategoryId } from "@/lib/constants"

function hasCategory(cat: ComponentCategoryId): boolean {
  return useArchitectureStore.getState().nodes.some((n) => n.data.componentCategory === cat)
}

function hasEdgeBetween(sourceCat: ComponentCategoryId, targetCat: ComponentCategoryId): boolean {
  const { nodes, edges } = useArchitectureStore.getState()
  const sourceIds = new Set(nodes.filter((n) => n.data.componentCategory === sourceCat).map((n) => n.id))
  const targetIds = new Set(nodes.filter((n) => n.data.componentCategory === targetCat).map((n) => n.id))
  return edges.some((e) =>
    (sourceIds.has(e.source) && targetIds.has(e.target)) ||
    (sourceIds.has(e.target) && targetIds.has(e.source)),
  )
}

function edgeCount(): number {
  return useArchitectureStore.getState().edges.length
}

function isRunning(): boolean {
  return useChallengeStore.getState().attemptState === "running"
}

const FIRST_SERVICE: TourStep[] = [
  {
    title: "Welcome to your first quest",
    body: "Dave's dashboard needs a real home. Your job: place a compute block, wire it to the traffic source, and keep it running under budget. Let's walk through it.",
  },
  {
    title: "Open the component toolbox",
    body: "The left sidebar is your toolbox. The \"Components\" tab has all the building blocks you can use. For this quest, you need a Compute block.",
    selector: '[data-testid="toolbox-panel"]',
  },
  {
    title: "Drag a Compute block onto the canvas",
    body: "Find a Compute block in the toolbox and drag it onto the canvas area. This is the server that will handle incoming traffic.",
    selector: ['[data-testid="category-group-compute"]', '[data-testid="canvas-panel"]'],
    gate: () => hasCategory("compute"),
  },
  {
    title: "Wire traffic to your server",
    body: "Drag from the traffic source's right handle to your Compute block's left handle. This creates a connection so requests flow to your server.",
    selector: '[data-testid="canvas-panel"]',
    gate: () => hasEdgeBetween("traffic", "compute"),
  },
  {
    title: "Configure your server",
    body: "Click your Compute block to open the inspector on the right. Pick a provider and variant that handles 120 RPS without overloading — check the cost stays under $80.",
    selector: ['[data-testid="inspector-panel"]', '[data-testid="challenge-budget-bar"]'],
  },
  {
    title: "Start the challenge",
    body: "When your architecture is ready, hit the green \"Start Challenge\" button at the bottom. The simulation will run for 60 seconds — watch your uptime and latency.",
    selector: '[data-testid="start-challenge"]',
    gate: () => isRunning(),
  },
]

const ADD_A_DATABASE: TourStep[] = [
  {
    title: "Time to add persistence",
    body: "Your service has amnesia — everything disappears on restart. You need to wire a database downstream from your compute block so data survives reboots.",
  },
  {
    title: "Your starting architecture",
    body: "This quest continues from your previous build. You already have traffic and compute. Now you need to add a data-storage block.",
    selector: '[data-testid="canvas-panel"]',
  },
  {
    title: "Drag a Database block from the toolbox",
    body: "Look for a Data Storage block in the Components tab. Drag it onto the canvas to the right of your compute block.",
    selector: ['[data-testid="category-group-data-storage"]', '[data-testid="canvas-panel"]'],
    gate: () => hasCategory("data-storage"),
  },
  {
    title: "Wire compute to the database",
    body: "Drag from your Compute block's right handle to the Database's left handle. Requests flow left-to-right: traffic → compute → database.",
    selector: '[data-testid="canvas-panel"]',
    gate: () => hasEdgeBetween("compute", "data-storage"),
  },
  {
    title: "Size both for peak load",
    body: "Click each block to configure it in the inspector on the right. At 150 RPS, both compute and database need enough capacity. The budget is $160 — watch the budget bar.",
    selector: ['[data-testid="inspector-panel"]', '[data-testid="challenge-budget-bar"]'],
  },
  {
    title: "Run the simulation",
    body: "Hit \"Start Challenge\" when ready. Both blocks need to handle peak traffic together — the database adds latency, so pick variants with enough headroom.",
    selector: '[data-testid="start-challenge"]',
    gate: () => isRunning(),
  },
]

const CACHE_THE_HOT_PATH: TourStep[] = [
  {
    title: "Stop answering the same question twice",
    body: "Your database is recomputing every read from scratch — thousands of identical requests per minute. A cache layer will absorb the repeated reads and keep latency tight.",
  },
  {
    title: "Your inherited architecture",
    body: "You're starting with the build from \"Persist It\". The challenge now: insert a cache between compute and the database to absorb read traffic.",
    selector: '[data-testid="canvas-panel"]',
  },
  {
    title: "Add a Cache block",
    body: "Drag a Cache block from the toolbox. This is the new middle layer — it sits between compute and the database.",
    selector: ['[data-testid="category-group-caching"]', '[data-testid="canvas-panel"]'],
    gate: () => hasCategory("caching"),
  },
  {
    title: "Rewire: compute → cache → database",
    body: "Delete the direct compute→database edge, then wire compute → cache and cache → database. Read hits bypass the database entirely; only cache misses flow downstream.",
    selector: '[data-testid="canvas-panel"]',
    gate: () => hasEdgeBetween("compute", "caching") && hasEdgeBetween("caching", "data-storage"),
  },
  {
    title: "Size for the read-heavy workload",
    body: "Click each block to configure it in the inspector. The cache absorbs most traffic — the database only handles misses. Keep the total under $220.",
    selector: ['[data-testid="inspector-panel"]', '[data-testid="challenge-budget-bar"]'],
  },
  {
    title: "Tighter targets this time",
    body: "p99 ≤ 250ms and 97% uptime — the bar is higher. Hit \"Start Challenge\" when your wiring looks right. The cache should keep your latency in check.",
    selector: '[data-testid="start-challenge"]',
    gate: () => isRunning(),
  },
]

const EDGE_DELIVERY: TourStep[] = [
  {
    title: "Traffic is climbing — edge delivery needed",
    body: "800 RPS is bottlenecking at the entrance. You need a CDN / edge delivery layer to handle the load before it hits your compute tier.",
  },
  {
    title: "Add a CDN / Delivery Network block",
    body: "Drag a Delivery Network (CDN) block from the toolbox. This sits at the very front of your architecture — between traffic and everything else.",
    selector: ['[data-testid="category-group-delivery-network"]', '[data-testid="canvas-panel"]'],
    gate: () => hasCategory("delivery-network"),
  },
  {
    title: "Wire traffic through the edge first",
    body: "Route traffic → CDN → load balancer → compute. The CDN absorbs cacheable requests at the edge; the rest flows through to your backend.",
    selector: '[data-testid="canvas-panel"]',
    gate: () => hasEdgeBetween("traffic", "delivery-network") && edgeCount() >= 3,
  },
  {
    title: "Size compute for full peak",
    body: "Click each block to configure it in the inspector. Even with a CDN, compute sees the full 800 RPS. Budget is $350 — more room, but tighter latency (p99 ≤ 200ms).",
    selector: ['[data-testid="inspector-panel"]', '[data-testid="challenge-budget-bar"]'],
  },
  {
    title: "Tight latency bar",
    body: "p99 ≤ 200ms, p95 ≤ 140ms, 98% uptime. Every hop adds latency — keep your edge layer lean. Hit \"Start Challenge\" when ready.",
    selector: '[data-testid="start-challenge"]',
    gate: () => isRunning(),
  },
]

const QUEST_GUIDES: Record<string, TourStep[]> = {
  "first-service": FIRST_SERVICE,
  "add-a-database": ADD_A_DATABASE,
  "cache-the-hot-path": CACHE_THE_HOT_PATH,
  "edge-delivery": EDGE_DELIVERY,
}

export function getQuestGuide(challengeId: string): TourStep[] | undefined {
  return QUEST_GUIDES[challengeId]
}
