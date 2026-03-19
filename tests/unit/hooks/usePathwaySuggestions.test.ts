import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { DEFAULT_WEIGHT_PROFILE } from "@/lib/constants"
import type { WeightProfile, Constraint, DataContextItem } from "@/lib/constants"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { Component } from "@/schemas/componentSchema"
import type { MetricValue } from "@/schemas/metricSchema"
import type { TierResult } from "@/lib/tierDefinitions"

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getAllComponents: vi.fn(),
    isInitialized: vi.fn(),
  },
}))

import { useArchitectureStore } from "@/stores/architectureStore"
import { componentLibrary } from "@/services/componentLibrary"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)
const mockGetAllComponents = vi.mocked(componentLibrary.getAllComponents)

// --- Test Helpers ---

function makeMetric(
  category: string,
  numericValue: number,
  id?: string,
): MetricValue {
  return {
    id: id ?? `${category}-metric`,
    name: `${category} metric`,
    value: numericValue >= 7 ? "high" : numericValue >= 4 ? "medium" : "low",
    numericValue,
    category,
  }
}

function makeComponent(overrides?: Partial<Component> & { metrics?: MetricValue[] }): Component {
  const metrics = overrides?.metrics ?? [
    makeMetric("performance", 7),
    makeMetric("reliability", 6),
    makeMetric("scalability", 5),
  ]
  const { metrics: _metrics, ...rest } = overrides ?? {}
  return {
    id: "comp-1",
    name: "Test Component",
    category: "compute",
    description: "A test component",
    is: "A compute unit",
    gain: ["Fast processing"],
    cost: ["Resource intensive"],
    tags: ["test"],
    baseMetrics: metrics,
    configVariants: [{ id: "default", name: "Default", metrics }],
    ...rest,
  }
}

function makeNodeMetrics(
  nodeId: string,
  metrics: Array<{ id: string; category: string; numericValue: number }>,
): RecalculatedMetrics {
  const metricValues = metrics.map((m) => ({
    id: m.id,
    value: "medium" as const,
    numericValue: m.numericValue,
    category: m.category,
  }))
  const overallScore =
    metricValues.length > 0
      ? metricValues.reduce((sum, m) => sum + m.numericValue, 0) / metricValues.length
      : 0
  return { nodeId, metrics: metricValues, overallScore }
}

function makeTierResult(overrides?: Partial<TierResult>): TierResult {
  return {
    tierId: "foundation",
    tierName: "Foundation",
    tierIndex: 0,
    totalTiers: 3,
    tierColor: "bg-amber-700",
    tierTextColor: "text-amber-100",
    nextTierGaps: [],
    isMaxTier: false,
    ...overrides,
  }
}

interface MockStoreState {
  currentTier: TierResult | null
  weightProfile: WeightProfile
  constraints: Constraint[]
  dataContextItems: Map<string, DataContextItem[]>
  nodes: Array<{ id: string; data: { archieComponentId: string; componentCategory: string } }>
  computedMetrics: Map<string, RecalculatedMetrics>
}

function mockStore(overrides: Partial<MockStoreState> = {}) {
  const state: MockStoreState = {
    currentTier: null,
    weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
    constraints: [],
    dataContextItems: new Map(),
    nodes: [],
    computedMetrics: new Map(),
    ...overrides,
  }
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    return (selector as (s: MockStoreState) => unknown)(state)
  })
}

// --- Tests ---

describe("usePathwaySuggestions", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetAllComponents.mockReturnValue([])
  })

  // Dynamic import required: vi.mock hoists above static imports, but the mock
  // must be registered before the module under test resolves its own imports.
  // Static import would resolve before vi.mock takes effect in some isolation modes.
  async function importHook() {
    const mod = await import("@/hooks/usePathwaySuggestions")
    return mod.usePathwaySuggestions
  }

  it("returns empty when no components on canvas (currentTier is null)", async () => {
    mockStore({ currentTier: null })
    mockGetAllComponents.mockReturnValue([makeComponent()])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    expect(result.current.suggestions).toEqual([])
    expect(result.current.hasGaps).toBe(false)
    expect(result.current.nextTierName).toBeNull()
  })

  it("returns empty at max tier", async () => {
    mockStore({
      currentTier: makeTierResult({ tierIndex: 2, isMaxTier: true }),
    })
    mockGetAllComponents.mockReturnValue([makeComponent()])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    expect(result.current.suggestions).toEqual([])
    expect(result.current.hasGaps).toBe(false)
    expect(result.current.nextTierName).toBeNull()
  })

  it("returns empty when componentLibrary has no components", async () => {
    mockStore({
      currentTier: makeTierResult({ tierIndex: 0, isMaxTier: false }),
      nodes: [{ id: "n1", data: { archieComponentId: "comp-1", componentCategory: "compute" } }],
    })
    mockGetAllComponents.mockReturnValue([])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    expect(result.current.suggestions).toEqual([])
    expect(result.current.hasGaps).toBe(false)
  })

  it("returns suggestions when tier gaps exist", async () => {
    // Foundation tier (index 0) — next tier is Production-Ready (index 1)
    // Production-Ready requires: 5 components, 3 categories, performance >= 5, reliability >= 5
    // Current state: 1 compute node — multiple gaps exist
    const computeComp = makeComponent({
      id: "comp-compute-1",
      name: "App Server",
      category: "compute",
      metrics: [makeMetric("performance", 8), makeMetric("reliability", 7)],
    })
    const dbComp = makeComponent({
      id: "comp-db-1",
      name: "PostgreSQL",
      category: "data-storage",
      metrics: [makeMetric("performance", 6), makeMetric("reliability", 8)],
    })
    const cacheComp = makeComponent({
      id: "comp-cache-1",
      name: "Redis",
      category: "caching",
      metrics: [makeMetric("performance", 9), makeMetric("reliability", 7)],
    })

    mockStore({
      currentTier: makeTierResult({ tierIndex: 0, isMaxTier: false }),
      nodes: [{ id: "n1", data: { archieComponentId: "comp-compute-1", componentCategory: "compute" } }],
      computedMetrics: new Map([
        ["n1", makeNodeMetrics("n1", [
          { id: "perf", category: "performance", numericValue: 8 },
          { id: "rel", category: "reliability", numericValue: 7 },
        ])],
      ]),
    })
    mockGetAllComponents.mockReturnValue([computeComp, dbComp, cacheComp])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    expect(result.current.suggestions.length).toBeGreaterThan(0)
    expect(result.current.hasGaps).toBe(true)
    expect(result.current.nextTierName).toBe("Production-Ready")
    // Verify suggestion structure (not just count)
    const first = result.current.suggestions[0]
    expect(first.componentId).toBeDefined()
    expect(first.category).toBeDefined()
    expect(first.reason).toContain("Production-Ready")
    expect(first.weightedScore).toBeGreaterThan(0)
  })

  it("suggestions update when weight profile changes", async () => {
    const dbComp = makeComponent({
      id: "comp-db-1",
      name: "PostgreSQL",
      category: "data-storage",
      metrics: [makeMetric("performance", 6), makeMetric("reliability", 8)],
    })
    const cacheComp = makeComponent({
      id: "comp-cache-1",
      name: "Redis",
      category: "caching",
      metrics: [makeMetric("performance", 9), makeMetric("reliability", 3)],
    })

    const baseState = {
      currentTier: makeTierResult({ tierIndex: 0, isMaxTier: false }),
      nodes: [{ id: "n1", data: { archieComponentId: "comp-x", componentCategory: "compute" } }],
      computedMetrics: new Map([
        ["n1", makeNodeMetrics("n1", [
          { id: "perf", category: "performance", numericValue: 5 },
        ])],
      ]),
    }

    // Render with default weights
    mockStore({ ...baseState, weightProfile: { ...DEFAULT_WEIGHT_PROFILE } })
    mockGetAllComponents.mockReturnValue([dbComp, cacheComp])
    const usePathwaySuggestions = await importHook()

    const { result: r1 } = renderHook(() => usePathwaySuggestions())
    const scoresDefault = r1.current.suggestions.map((s) => ({
      id: s.componentId,
      score: s.weightedScore,
    }))

    // Render with performance heavily weighted
    mockStore({
      ...baseState,
      weightProfile: { ...DEFAULT_WEIGHT_PROFILE, performance: 3.0, reliability: 0.1 },
    })
    const { result: r2 } = renderHook(() => usePathwaySuggestions())
    const scoresWeighted = r2.current.suggestions.map((s) => ({
      id: s.componentId,
      score: s.weightedScore,
    }))

    // Both should have suggestions
    expect(scoresDefault.length).toBeGreaterThan(0)
    expect(scoresWeighted.length).toBeGreaterThan(0)

    // When performance is heavily weighted, Redis (perf=9) should score higher than PostgreSQL (perf=6)
    const redisWeighted = scoresWeighted.find((s) => s.id === "comp-cache-1")
    const pgWeighted = scoresWeighted.find((s) => s.id === "comp-db-1")
    expect(redisWeighted).toBeDefined()
    expect(pgWeighted).toBeDefined()
    expect(redisWeighted!.score).toBeGreaterThan(pgWeighted!.score)
  })

  it("suggestions reflect constraint safety", async () => {
    const dbComp = makeComponent({
      id: "comp-db-1",
      name: "PostgreSQL",
      category: "data-storage",
      metrics: [
        makeMetric("performance", 6),
        makeMetric("cost-efficiency", 8),
      ],
    })

    const baseNodes = [{ id: "n1", data: { archieComponentId: "comp-x", componentCategory: "compute" } }]
    const baseTier = makeTierResult({ tierIndex: 0, isMaxTier: false })

    // Without constraints — all safe
    mockStore({ currentTier: baseTier, nodes: baseNodes, constraints: [] })
    mockGetAllComponents.mockReturnValue([dbComp])
    const usePathwaySuggestions = await importHook()

    const { result: r1 } = renderHook(() => usePathwaySuggestions())
    const noCostConstraint = r1.current.suggestions.find((s) => s.componentId === "comp-db-1")
    expect(noCostConstraint?.isConstraintSafe).toBe(true)

    // With constraint: cost-efficiency must be <= 5 — dbComp has 8, so unsafe
    const constraint: Constraint = {
      id: "c1",
      categoryId: "cost-efficiency",
      operator: "lte",
      threshold: 5,
      label: "Cost must stay low",
    }
    mockStore({ currentTier: baseTier, nodes: baseNodes, constraints: [constraint] })
    const { result: r2 } = renderHook(() => usePathwaySuggestions())
    const withConstraint = r2.current.suggestions.find((s) => s.componentId === "comp-db-1")
    expect(withConstraint?.isConstraintSafe).toBe(false)
  })

  it("returns empty when tierIndex beyond definitions range (no nextTierDef)", async () => {
    mockStore({
      currentTier: makeTierResult({ tierIndex: 99, isMaxTier: false }),
      nodes: [{ id: "n1", data: { archieComponentId: "comp-1", componentCategory: "compute" } }],
    })
    mockGetAllComponents.mockReturnValue([makeComponent()])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    expect(result.current.suggestions).toEqual([])
    expect(result.current.hasGaps).toBe(false)
    expect(result.current.nextTierName).toBeNull()
  })

  it("fitLevel appears on suggestion when dataContextItems contain fit-relevant data", async () => {
    // Component with dataFitProfile on default variant — all dimensions "great" → great-fit
    const dbComp = makeComponent({
      id: "comp-db-fit",
      name: "FitDB",
      category: "data-storage",
      configVariants: [{
        id: "default",
        name: "Default",
        metrics: [makeMetric("performance", 7), makeMetric("reliability", 6)],
        dataFitProfile: {
          "read-heavy": "great",
          "small": "great",
          "relational": "great",
        },
      }],
    })

    const dataContextItem: DataContextItem = {
      id: "dci-1",
      name: "User Sessions",
      accessPattern: "read-heavy",
      averageSize: "small",
      structureType: "relational",
    }

    mockStore({
      currentTier: makeTierResult({ tierIndex: 0, isMaxTier: false }),
      nodes: [{ id: "n1", data: { archieComponentId: "comp-x", componentCategory: "compute" } }],
      dataContextItems: new Map([["n1", [dataContextItem]]]),
    })
    mockGetAllComponents.mockReturnValue([dbComp])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    expect(result.current.suggestions.length).toBeGreaterThan(0)
    const dbSuggestion = result.current.suggestions.find((s) => s.componentId === "comp-db-fit")
    expect(dbSuggestion).toBeDefined()
    expect(dbSuggestion!.fitLevel).toBe("great-fit")
    expect(dbSuggestion!.fitExplanation).toContain("great fit")
  })

  it("suggestions target deficient category when min_category_score requirement is unmet", async () => {
    // tierIndex 0 → next tier is Production-Ready (index 1)
    // Production-Ready requires: min_category_score performance >= 5
    // Current state: one node with performance = 2 → below threshold → gap detected
    const perfComp = makeComponent({
      id: "comp-perf-booster",
      name: "Perf Booster",
      category: "compute",
      metrics: [makeMetric("performance", 9)],
    })

    mockStore({
      currentTier: makeTierResult({ tierIndex: 0, isMaxTier: false }),
      nodes: [{ id: "n1", data: { archieComponentId: "comp-existing", componentCategory: "compute" } }],
      computedMetrics: new Map([
        ["n1", makeNodeMetrics("n1", [
          { id: "perf-1", category: "performance", numericValue: 2 },
        ])],
      ]),
    })
    mockGetAllComponents.mockReturnValue([perfComp])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    expect(result.current.suggestions.length).toBeGreaterThan(0)
    expect(result.current.nextTierName).toBe("Production-Ready")
    const perfSuggestion = result.current.suggestions.find((s) => s.componentId === "comp-perf-booster")
    expect(perfSuggestion).toBeDefined()
    expect(perfSuggestion!.reason).toContain("performance")
    expect(perfSuggestion!.reason).toContain("Production-Ready")
  })

  it("excludes components already placed on canvas from suggestions", async () => {
    const dbComp = makeComponent({
      id: "comp-db-1",
      name: "PostgreSQL",
      category: "data-storage",
      metrics: [makeMetric("performance", 6), makeMetric("reliability", 8)],
    })

    mockStore({
      currentTier: makeTierResult({ tierIndex: 0, isMaxTier: false }),
      nodes: [{ id: "n1", data: { archieComponentId: "comp-db-1", componentCategory: "data-storage" } }],
    })
    mockGetAllComponents.mockReturnValue([dbComp])
    const usePathwaySuggestions = await importHook()

    const { result } = renderHook(() => usePathwaySuggestions())

    const dbSuggestion = result.current.suggestions.find((s) => s.componentId === "comp-db-1")
    expect(dbSuggestion).toBeUndefined()
  })
})
