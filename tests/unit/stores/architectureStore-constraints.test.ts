import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { Constraint, MetricCategoryId } from "@/lib/constants"

// Mock dependencies — constraint tests don't need component library or recalculation service
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(() => undefined),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

const mockRecalcService = vi.fn()
vi.mock("@/services/recalculationService", () => ({
  recalculationService: {
    run: (...args: unknown[]) => mockRecalcService(...args),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("sonner", () => ({
  toast: { warning: vi.fn() },
}))

// --- Test Helpers ---

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: `c-${Date.now()}-${Math.random()}`,
    categoryId: "performance" as MetricCategoryId,
    operator: "lte",
    threshold: 5,
    label: "Test Constraint",
    ...overrides,
  }
}

function makeMetrics(nodeScores: Record<string, Array<{ category: string; value: number }>>): Map<string, RecalculatedMetrics> {
  const map = new Map<string, RecalculatedMetrics>()
  for (const [nodeId, metrics] of Object.entries(nodeScores)) {
    const metricValues = metrics.map((m, i) => ({
      id: `metric-${i}`,
      name: `Metric ${i}`,
      category: m.category,
      value: (m.value >= 7 ? "high" : m.value >= 4 ? "medium" : "low") as "high" | "medium" | "low",
      numericValue: m.value,
      description: "",
    }))
    const overall = metricValues.reduce((s, m) => s + m.numericValue, 0) / metricValues.length
    map.set(nodeId, { nodeId, metrics: metricValues, overallScore: overall })
  }
  return map
}

function setupStoreWithMetrics(
  nodeScores: Record<string, Array<{ category: string; value: number }>>,
  constraints: Constraint[] = [],
) {
  const nodeEntries = Object.keys(nodeScores)
  const nodes = nodeEntries.map((id) => ({
    id,
    type: "archie-component" as const,
    position: { x: 0, y: 0 },
    data: {
      archieComponentId: "test-comp",
      activeConfigVariantId: "default",
      componentName: "Test",
      componentCategory: "compute" as const,
    },
  }))

  useArchitectureStore.setState({
    nodes,
    edges: [],
    computedMetrics: makeMetrics(nodeScores),
    constraints,
    constraintViolations: [],
    weightProfile: {
      performance: 1.0,
      reliability: 1.0,
      scalability: 1.0,
      security: 1.0,
      "operational-complexity": 1.0,
      "cost-efficiency": 1.0,
      "developer-experience": 1.0,
    },
  })
}

describe("architectureStore - constraints", () => {
  beforeEach(() => {
    mockRecalcService.mockReset()
    useArchitectureStore.setState({
      nodes: [],
      edges: [],
      computedMetrics: new Map(),
      previousMetrics: new Map(),
      heatmapColors: new Map(),
      edgeHeatmapColors: new Map(),
      rippleActiveNodeIds: new Set(),
      recalcGeneration: 0,
      currentTier: null,
      constraints: [],
      constraintViolations: [],
      weightProfile: {
        performance: 1.0,
        reliability: 1.0,
        scalability: 1.0,
        security: 1.0,
        "operational-complexity": 1.0,
        "cost-efficiency": 1.0,
        "developer-experience": 1.0,
      },
    })
  })

  describe("default state", () => {
    it("has empty constraints array", () => {
      expect(useArchitectureStore.getState().constraints).toEqual([])
    })

    it("has empty constraintViolations array", () => {
      expect(useArchitectureStore.getState().constraintViolations).toEqual([])
    })
  })

  describe("addConstraint", () => {
    it("adds constraint to the constraints array", () => {
      const constraint = makeConstraint({ id: "c-1" })
      useArchitectureStore.getState().addConstraint(constraint)

      expect(useArchitectureStore.getState().constraints).toHaveLength(1)
      expect(useArchitectureStore.getState().constraints[0].id).toBe("c-1")
    })

    it("triggers re-evaluation and finds violations (5.7)", () => {
      setupStoreWithMetrics({
        "node-1": [{ category: "performance", value: 7 }],
      })

      const constraint = makeConstraint({
        id: "c-perf",
        categoryId: "performance",
        operator: "lte",
        threshold: 5,
      })
      useArchitectureStore.getState().addConstraint(constraint)

      const violations = useArchitectureStore.getState().constraintViolations
      expect(violations).toHaveLength(1)
      expect(violations[0]).toMatchObject({
        constraintId: "c-perf",
        nodeId: "node-1",
        categoryId: "performance",
        actualScore: 7,
        threshold: 5,
        operator: "lte",
      })
    })

    it("does NOT call recalculationService (AC-ARCH-NO-3)", () => {
      setupStoreWithMetrics({
        "node-1": [{ category: "performance", value: 7 }],
      })

      const constraint = makeConstraint()
      useArchitectureStore.getState().addConstraint(constraint)

      expect(mockRecalcService).not.toHaveBeenCalled()
    })
  })

  describe("updateConstraint", () => {
    it("updates specific constraint by id", () => {
      const constraint = makeConstraint({ id: "c-update", threshold: 5 })
      setupStoreWithMetrics(
        { "node-1": [{ category: "performance", value: 7 }] },
        [constraint],
      )

      useArchitectureStore.getState().updateConstraint("c-update", { threshold: 3 })

      const updated = useArchitectureStore.getState().constraints.find((c) => c.id === "c-update")
      expect(updated?.threshold).toBe(3)
    })

    it("triggers re-evaluation after update", () => {
      const constraint = makeConstraint({
        id: "c-update",
        categoryId: "performance",
        operator: "lte",
        threshold: 10, // score 7 passes threshold 10
      })
      setupStoreWithMetrics(
        { "node-1": [{ category: "performance", value: 7 }] },
        [constraint],
      )
      // Initially no violations
      expect(useArchitectureStore.getState().constraintViolations).toHaveLength(0)

      // Lower threshold to create violation
      useArchitectureStore.getState().updateConstraint("c-update", { threshold: 5 })

      expect(useArchitectureStore.getState().constraintViolations).toHaveLength(1)
    })
  })

  describe("removeConstraint", () => {
    it("removes constraint by id (5.8)", () => {
      const c1 = makeConstraint({ id: "c-keep" })
      const c2 = makeConstraint({ id: "c-remove" })
      setupStoreWithMetrics(
        { "node-1": [{ category: "performance", value: 7 }] },
        [c1, c2],
      )

      useArchitectureStore.getState().removeConstraint("c-remove")

      const remaining = useArchitectureStore.getState().constraints
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe("c-keep")
    })

    it("clears violations for removed constraint (5.8)", () => {
      const constraint = makeConstraint({
        id: "c-gone",
        categoryId: "performance",
        operator: "lte",
        threshold: 5,
      })
      setupStoreWithMetrics(
        { "node-1": [{ category: "performance", value: 7 }] },
        [constraint],
      )
      // Trigger initial evaluation
      useArchitectureStore.getState().addConstraint(makeConstraint({ id: "c-dummy", threshold: 10 }))
      useArchitectureStore.getState().removeConstraint("c-dummy")
      // Re-evaluate with just c-gone
      useArchitectureStore.getState().removeConstraint("c-gone")

      expect(useArchitectureStore.getState().constraintViolations).toHaveLength(0)
    })
  })

  describe("setConstraints", () => {
    it("bulk sets constraints and re-evaluates", () => {
      setupStoreWithMetrics({
        "node-1": [{ category: "performance", value: 7 }],
      })

      const constraints = [
        makeConstraint({ id: "c-bulk-1", categoryId: "performance", operator: "lte", threshold: 5 }),
        makeConstraint({ id: "c-bulk-2", categoryId: "reliability", operator: "gte", threshold: 8 }),
      ]
      useArchitectureStore.getState().setConstraints(constraints)

      expect(useArchitectureStore.getState().constraints).toHaveLength(2)
      // Only performance has data and is violated
      const violations = useArchitectureStore.getState().constraintViolations
      expect(violations.some((v) => v.constraintId === "c-bulk-1")).toBe(true)
    })
  })

  describe("weight change interaction (5.9)", () => {
    it("weight change resolves constraint violation", () => {
      // Performance score 7, constraint lte 5 → violated at weight 1.0
      const constraint = makeConstraint({
        id: "c-weight",
        categoryId: "performance",
        operator: "lte",
        threshold: 5,
      })
      setupStoreWithMetrics(
        { "node-1": [{ category: "performance", value: 7 }] },
        [constraint],
      )

      // Force initial evaluation via CRUD
      useArchitectureStore.getState().setConstraints([constraint])
      expect(useArchitectureStore.getState().constraintViolations).toHaveLength(1)

      // Lower weight to 0.5 → weighted score = 7 * 0.5 = 3.5 ≤ 5 → passes
      useArchitectureStore.getState().setWeightAndRecalculate({
        performance: 0.5,
        reliability: 1.0,
        scalability: 1.0,
        security: 1.0,
        "operational-complexity": 1.0,
        "cost-efficiency": 1.0,
        "developer-experience": 1.0,
      })

      expect(useArchitectureStore.getState().constraintViolations).toHaveLength(0)
    })

    it("weight change creates constraint violation", () => {
      // Performance score 6, constraint gte 5 → passes at weight 1.0 (6 ≥ 5)
      const constraint = makeConstraint({
        id: "c-weight-create",
        categoryId: "performance",
        operator: "gte",
        threshold: 5,
      })
      setupStoreWithMetrics(
        { "node-1": [{ category: "performance", value: 6 }] },
        [constraint],
      )

      useArchitectureStore.getState().setConstraints([constraint])
      expect(useArchitectureStore.getState().constraintViolations).toHaveLength(0)

      // Lower weight to 0.5 → weighted score = 6 * 0.5 = 3.0 < 5 → violated
      useArchitectureStore.getState().setWeightAndRecalculate({
        performance: 0.5,
        reliability: 1.0,
        scalability: 1.0,
        security: 1.0,
        "operational-complexity": 1.0,
        "cost-efficiency": 1.0,
        "developer-experience": 1.0,
      })

      expect(useArchitectureStore.getState().constraintViolations).toHaveLength(1)
      expect(useArchitectureStore.getState().constraintViolations[0].operator).toBe("gte")
    })
  })

  describe("loadArchitecture with constraints", () => {
    it("loads constraints and clears violations", () => {
      const constraints = [
        makeConstraint({ id: "c-load-1" }),
        makeConstraint({ id: "c-load-2" }),
      ]

      useArchitectureStore.getState().loadArchitecture([], [], undefined, constraints)

      expect(useArchitectureStore.getState().constraints).toHaveLength(2)
      // No nodes → no violations
      expect(useArchitectureStore.getState().constraintViolations).toEqual([])
    })

    it("loads architecture without constraints defaults to empty", () => {
      useArchitectureStore.getState().loadArchitecture([], [])

      expect(useArchitectureStore.getState().constraints).toEqual([])
    })
  })

  describe("no constraints → no violations", () => {
    it("produces no violations when constraints array is empty", () => {
      setupStoreWithMetrics({
        "node-1": [{ category: "performance", value: 9 }],
      })

      // Trigger re-evaluation by setting empty constraints
      useArchitectureStore.getState().setConstraints([])

      expect(useArchitectureStore.getState().constraintViolations).toEqual([])
    })
  })

  describe("empty architecture → no violations (5.10)", () => {
    it("produces no violations when no nodes exist", () => {
      const constraint = makeConstraint({
        categoryId: "performance",
        operator: "lte",
        threshold: 3,
      })

      useArchitectureStore.getState().addConstraint(constraint)

      expect(useArchitectureStore.getState().constraintViolations).toEqual([])
    })
  })
})
