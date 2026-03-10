import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConstraintPanel } from "@/components/dashboard/ConstraintPanel"
import type { Constraint } from "@/lib/constants"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"

// Mock architectureStore -- selector pattern
vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

// Mock uiStore for click-to-navigate
const mockSetPendingNavNodeId = vi.fn()
vi.mock("@/stores/uiStore", () => ({
  useUiStore: {
    getState: () => ({ setPendingNavNodeId: mockSetPendingNavNodeId }),
  },
}))

// Mock categoryIcons to avoid importing Lucide in test env
vi.mock("@/lib/categoryIcons", () => {
  const makeIcon = (key: string) => {
    const IconMock = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
      <span data-testid={`icon-${key}`} className={className} style={style} />
    )
    IconMock.displayName = key
    return IconMock
  }
  const proxy = new Proxy({}, { get: (_, key) => makeIcon(String(key)) })
  return {
    CATEGORY_ICONS: proxy,
    getCategoryIcon: (name: string) => (proxy as Record<string, unknown>)[name],
  }
})

import { useArchitectureStore } from "@/stores/architectureStore"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)

// --- Store mock helpers ---

const mockAddConstraint = vi.fn()
const mockUpdateConstraint = vi.fn()
const mockRemoveConstraint = vi.fn()

function makeConstraint(overrides: Partial<Constraint> & { id: string }): Constraint {
  return {
    categoryId: "performance",
    operator: "lte",
    threshold: 5,
    label: "Test constraint",
    ...overrides,
  }
}

interface MockStoreOptions {
  constraints?: Constraint[]
  constraintViolations?: ConstraintViolation[]
  nodes?: Array<{ id: string; data: { componentName: string } }>
}

function mockStore(options: MockStoreOptions = {}) {
  const {
    constraints = [],
    constraintViolations = [],
    nodes = [],
  } = options

  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = {
      constraints,
      constraintViolations,
      nodes,
      addConstraint: mockAddConstraint,
      updateConstraint: mockUpdateConstraint,
      removeConstraint: mockRemoveConstraint,
    }
    return (selector as (s: typeof state) => unknown)(state)
  })
}

describe("ConstraintPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // --- Empty state ---

  describe("empty state", () => {
    it("renders with data-testid constraint-panel", () => {
      mockStore()
      render(<ConstraintPanel />)
      expect(screen.getByTestId("constraint-panel")).toBeInTheDocument()
    })

    it("shows 'No constraints defined' when constraints array is empty", () => {
      mockStore()
      render(<ConstraintPanel />)
      expect(screen.getByText("No constraints defined")).toBeInTheDocument()
    })

    it("shows Add Constraint button", () => {
      mockStore()
      render(<ConstraintPanel />)
      expect(screen.getByTestId("constraint-add-button")).toBeInTheDocument()
    })
  })

  // --- Constraint list ---

  describe("constraint list", () => {
    const constraints = [
      makeConstraint({ id: "c1", categoryId: "performance", operator: "lte", threshold: 5, label: "Perf cap" }),
      makeConstraint({ id: "c2", categoryId: "security", operator: "gte", threshold: 7, label: "Sec floor" }),
    ]

    it("renders constraint items with data-testid", () => {
      mockStore({ constraints })
      render(<ConstraintPanel />)
      expect(screen.getByTestId("constraint-item-c1")).toBeInTheDocument()
      expect(screen.getByTestId("constraint-item-c2")).toBeInTheDocument()
    })

    it("shows operator label 'at most' for lte", () => {
      mockStore({ constraints: [constraints[0]] })
      render(<ConstraintPanel />)
      expect(screen.getByText(/at most/)).toBeInTheDocument()
    })

    it("shows operator label 'at least' for gte", () => {
      mockStore({ constraints: [constraints[1]] })
      render(<ConstraintPanel />)
      expect(screen.getByText(/at least/)).toBeInTheDocument()
    })

    it("shows constraint label", () => {
      mockStore({ constraints: [constraints[0]] })
      render(<ConstraintPanel />)
      expect(screen.getByText("Perf cap")).toBeInTheDocument()
    })

    it("shows threshold value", () => {
      mockStore({ constraints: [constraints[0]] })
      render(<ConstraintPanel />)
      expect(screen.getByText("5")).toBeInTheDocument()
    })
  })

  // --- Add constraint ---

  describe("add constraint", () => {
    it("shows inline form when Add Constraint is clicked", async () => {
      mockStore()
      const user = userEvent.setup()
      render(<ConstraintPanel />)

      await user.click(screen.getByTestId("constraint-add-button"))
      expect(screen.getByTestId("constraint-form")).toBeInTheDocument()
    })

    it("dispatches addConstraint on form submit", async () => {
      mockStore()
      const user = userEvent.setup()
      render(<ConstraintPanel />)

      await user.click(screen.getByTestId("constraint-add-button"))

      // Fill threshold
      const thresholdInput = screen.getByTestId("constraint-threshold-input")
      await user.clear(thresholdInput)
      await user.type(thresholdInput, "6")

      // Submit
      await user.click(screen.getByTestId("constraint-save-button"))

      expect(mockAddConstraint).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: "performance", // default first category
          operator: "lte", // default operator
          threshold: 6,
        }),
      )
    })

    it("generates default label when label is empty", async () => {
      mockStore()
      const user = userEvent.setup()
      render(<ConstraintPanel />)

      await user.click(screen.getByTestId("constraint-add-button"))

      const thresholdInput = screen.getByTestId("constraint-threshold-input")
      await user.clear(thresholdInput)
      await user.type(thresholdInput, "5")

      await user.click(screen.getByTestId("constraint-save-button"))

      expect(mockAddConstraint).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Performance at most 5",
        }),
      )
    })

    it("hides form after successful add", async () => {
      mockStore()
      const user = userEvent.setup()
      render(<ConstraintPanel />)

      await user.click(screen.getByTestId("constraint-add-button"))
      await user.click(screen.getByTestId("constraint-save-button"))

      expect(screen.queryByTestId("constraint-form")).not.toBeInTheDocument()
    })
  })

  // --- Delete constraint ---

  describe("delete constraint", () => {
    it("dispatches removeConstraint when delete is clicked", async () => {
      const constraints = [makeConstraint({ id: "c1" })]
      mockStore({ constraints })
      const user = userEvent.setup()
      render(<ConstraintPanel />)

      const item = screen.getByTestId("constraint-item-c1")
      const deleteBtn = within(item).getByTestId("constraint-delete-c1")
      await user.click(deleteBtn)

      expect(mockRemoveConstraint).toHaveBeenCalledWith("c1")
    })
  })

  // --- Constraint status ---

  describe("constraint status", () => {
    it("shows constraint-status with violation counts", () => {
      const constraints = [makeConstraint({ id: "c1" }), makeConstraint({ id: "c2" })]
      const constraintViolations: ConstraintViolation[] = [
        { constraintId: "c1", nodeId: "n1", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" },
      ]
      mockStore({ constraints, constraintViolations })
      render(<ConstraintPanel />)

      const status = screen.getByTestId("constraint-status")
      expect(status).toHaveTextContent("2 active")
      expect(status).toHaveTextContent("1 violation")
    })

    it("shows 'All clear' when no violations", () => {
      const constraints = [makeConstraint({ id: "c1" })]
      mockStore({ constraints, constraintViolations: [] })
      render(<ConstraintPanel />)

      const status = screen.getByTestId("constraint-status")
      expect(status).toHaveTextContent("All clear")
    })

    it("shows 'No constraints defined' when no constraints", () => {
      mockStore()
      render(<ConstraintPanel />)
      expect(screen.getByText("No constraints defined")).toBeInTheDocument()
    })
  })

  // --- Violation list ---

  describe("violation list", () => {
    it("shows violation list when violations exist", () => {
      const constraints = [makeConstraint({ id: "c1", label: "Perf cap" })]
      const constraintViolations: ConstraintViolation[] = [
        { constraintId: "c1", nodeId: "n1", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" },
      ]
      const nodes = [{ id: "n1", data: { componentName: "PostgreSQL" } }]
      mockStore({ constraints, constraintViolations, nodes })
      render(<ConstraintPanel />)

      expect(screen.getByTestId("constraint-violation-list")).toBeInTheDocument()
    })

    it("shows node name in violation entry", () => {
      const constraints = [makeConstraint({ id: "c1", label: "Perf cap" })]
      const constraintViolations: ConstraintViolation[] = [
        { constraintId: "c1", nodeId: "n1", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" },
      ]
      const nodes = [{ id: "n1", data: { componentName: "PostgreSQL" } }]
      mockStore({ constraints, constraintViolations, nodes })
      render(<ConstraintPanel />)

      expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
    })

    it("navigates to node when violation is clicked", async () => {
      const constraints = [makeConstraint({ id: "c1", label: "Perf cap" })]
      const constraintViolations: ConstraintViolation[] = [
        { constraintId: "c1", nodeId: "n1", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" },
      ]
      const nodes = [{ id: "n1", data: { componentName: "PostgreSQL" } }]
      const onCloseOverlay = vi.fn()
      mockStore({ constraints, constraintViolations, nodes })
      const user = userEvent.setup()
      render(<ConstraintPanel onCloseOverlay={onCloseOverlay} />)

      const violationList = screen.getByTestId("constraint-violation-list")
      const violationEntry = within(violationList).getByText("PostgreSQL")
      await user.click(violationEntry)

      expect(mockSetPendingNavNodeId).toHaveBeenCalledWith("n1")
      expect(onCloseOverlay).toHaveBeenCalled()
    })

    it("does not show violation list when no violations", () => {
      const constraints = [makeConstraint({ id: "c1" })]
      mockStore({ constraints, constraintViolations: [] })
      render(<ConstraintPanel />)

      expect(screen.queryByTestId("constraint-violation-list")).not.toBeInTheDocument()
    })
  })
})
