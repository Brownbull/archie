import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { toast } from "sonner"

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const {
  mockGenerateReport,
  mockDownloadMarkdown,
  mockSanitizeFilename,
  setMockNodeCount,
  mockUseArchitectureStore,
} = vi.hoisted(() => {
  const mockGenerateReport = vi.fn().mockReturnValue("# Report")
  const mockDownloadMarkdown = vi.fn()
  const mockSanitizeFilename = vi.fn((s: string) => s)
  let mockNodeCount = 5

  // Build a realistic mock store state
  const mockStoreState = {
    nodes: [] as Array<{ id: string; data: { componentName: string; componentCategory: string; activeConfigVariantId: string } }>,
    edges: [] as Array<{ id: string }>,
    computedMetrics: new Map(),
    heatmapColors: new Map(),
    currentTier: { tierName: "Foundation" },
    weightProfile: { performance: 1, reliability: 1, scalability: 1, security: 1, "operational-complexity": 1, "cost-efficiency": 1, "developer-experience": 1 },
    constraintViolations: [],
    constraints: [],
    activeScenarioId: null,
    activeFailureScenarioId: null,
  }

  const mockUseArchitectureStore = Object.assign(
    (selector: (s: typeof mockStoreState) => unknown) => {
      mockStoreState.nodes = Array.from({ length: mockNodeCount }, (_, i) => ({
        id: `node-${i}`,
        data: {
          componentName: `Component ${i}`,
          componentCategory: "compute",
          activeConfigVariantId: `variant-${i}`,
        },
      }))
      return selector(mockStoreState)
    },
    { getState: () => {
      mockStoreState.nodes = Array.from({ length: mockNodeCount }, (_, i) => ({
        id: `node-${i}`,
        data: {
          componentName: `Component ${i}`,
          componentCategory: "compute",
          activeConfigVariantId: `variant-${i}`,
        },
      }))
      return mockStoreState
    } },
  )

  return {
    mockGenerateReport,
    mockDownloadMarkdown,
    mockSanitizeFilename,
    setMockNodeCount: (n: number) => { mockNodeCount = n },
    mockStoreState,
    mockUseArchitectureStore,
  }
})

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: mockUseArchitectureStore,
}))

vi.mock("@/services/reportGenerator", () => ({
  generateArchitectureReport: (...args: unknown[]) => mockGenerateReport(...args),
}))

vi.mock("@/lib/downloadUtils", () => ({
  downloadMarkdown: (...args: unknown[]) => mockDownloadMarkdown(...args),
  sanitizeFilename: (...args: unknown[]) => mockSanitizeFilename(...args),
}))

vi.mock("@/services/scenarioLoader", () => ({
  getScenarioPreset: () => undefined,
}))

vi.mock("@/services/failureLoader", () => ({
  getFailurePreset: () => undefined,
}))

vi.mock("@/engine/dashboardCalculator", () => ({
  computeCategoryScores: () => [],
  computeWeightedAggregateScore: () => 6.5,
}))

// Dynamic import after mocks
import { ExportReportButton } from "@/components/toolbar/ExportReportButton"

describe("ExportReportButton", () => {
  beforeEach(() => {
    setMockNodeCount(5)
    mockGenerateReport.mockReturnValue("# Report")
    mockDownloadMarkdown.mockReset()
    mockSanitizeFilename.mockImplementation((s: string) => s)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it("renders button with correct testid", () => {
    render(<ExportReportButton />)
    expect(screen.getByTestId("export-report-button")).toBeInTheDocument()
  })

  it("is disabled when fewer than 3 components", () => {
    setMockNodeCount(2)
    render(<ExportReportButton />)
    expect(screen.getByTestId("export-report-button")).toBeDisabled()
  })

  it("is disabled when canvas has 0 components", () => {
    setMockNodeCount(0)
    render(<ExportReportButton />)
    expect(screen.getByTestId("export-report-button")).toBeDisabled()
  })

  it("is enabled when 3+ components exist", () => {
    setMockNodeCount(3)
    render(<ExportReportButton />)
    expect(screen.getByTestId("export-report-button")).not.toBeDisabled()
  })

  it("calls generateArchitectureReport on click", () => {
    render(<ExportReportButton />)
    fireEvent.click(screen.getByTestId("export-report-button"))
    expect(mockGenerateReport).toHaveBeenCalledOnce()
  })

  it("calls downloadMarkdown with generated report", () => {
    mockGenerateReport.mockReturnValue("# My Report Content")
    render(<ExportReportButton />)
    fireEvent.click(screen.getByTestId("export-report-button"))
    expect(mockDownloadMarkdown).toHaveBeenCalledOnce()
    expect(mockDownloadMarkdown.mock.calls[0][0]).toBe("# My Report Content")
    // filename should end with .md
    expect(mockDownloadMarkdown.mock.calls[0][1]).toMatch(/-report\.md$/)
  })

  it("shows toast.error on generator failure", () => {
    mockGenerateReport.mockImplementation(() => { throw new Error("generation failed") })
    render(<ExportReportButton />)
    fireEvent.click(screen.getByTestId("export-report-button"))
    expect(toast.error).toHaveBeenCalledWith("Report generation failed", {
      description: "generation failed",
    })
    expect(mockDownloadMarkdown).not.toHaveBeenCalled()
  })

  it("does not trigger download when click with < 3 nodes (programmatic guard)", () => {
    setMockNodeCount(1)
    render(<ExportReportButton />)
    // Button is disabled, but let's also verify the handler guards
    fireEvent.click(screen.getByTestId("export-report-button"))
    expect(mockGenerateReport).not.toHaveBeenCalled()
  })
})
