import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ExportButton, BLOB_REVOKE_DELAY_MS } from "@/components/import-export/ExportButton"

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const mockGetArchitectureSkeleton = vi.fn()
const mockExportArchitecture = vi.fn()
let mockNodeCount = 1

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ nodes: Array.from({ length: mockNodeCount }) }),
  ),
  getArchitectureSkeleton: () => mockGetArchitectureSkeleton(),
}))

vi.mock("@/services/yamlExporter", () => ({
  exportArchitecture: (...args: unknown[]) => mockExportArchitecture(...args),
}))

describe("ExportButton", () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockNodeCount = 1
    mockGetArchitectureSkeleton.mockReturnValue({ nodes: [{}], edges: [] })
    mockExportArchitecture.mockReturnValue("yaml: content")
    mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url")
    mockRevokeObjectURL = vi.fn()
    Object.defineProperty(URL, "createObjectURL", {
      value: mockCreateObjectURL,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      value: mockRevokeObjectURL,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it("renders the export button", () => {
    render(<ExportButton />)
    expect(screen.getByTestId("export-button")).toBeInTheDocument()
  })

  it("is disabled when canvas is empty", () => {
    mockNodeCount = 0
    render(<ExportButton />)
    expect(screen.getByTestId("export-button")).toBeDisabled()
  })

  it("is enabled when canvas has nodes", () => {
    render(<ExportButton />)
    expect(screen.getByTestId("export-button")).not.toBeDisabled()
  })

  describe("Blob URL revoke timing (AC-2, AC-3)", () => {
    it("revokes the Blob URL after BLOB_REVOKE_DELAY_MS when component stays mounted", () => {
      render(<ExportButton />)
      fireEvent.click(screen.getByTestId("export-button"))

      expect(mockRevokeObjectURL).not.toHaveBeenCalled()

      vi.advanceTimersByTime(BLOB_REVOKE_DELAY_MS)

      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
    })

    it("does not revoke Blob URL before the delay has elapsed", () => {
      render(<ExportButton />)
      fireEvent.click(screen.getByTestId("export-button"))

      vi.advanceTimersByTime(BLOB_REVOKE_DELAY_MS - 1)

      expect(mockRevokeObjectURL).not.toHaveBeenCalled()
    })
  })

  describe("Cleanup on unmount (AC-1)", () => {
    it("revokes the Blob URL immediately when component unmounts before timer fires", () => {
      const { unmount } = render(<ExportButton />)

      fireEvent.click(screen.getByTestId("export-button"))
      expect(mockRevokeObjectURL).not.toHaveBeenCalled()

      // Unmount before the delay elapses — cleanup cancels the timer and revokes the URL
      unmount()

      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")

      // Timer was cleared — advancing past the delay must not double-revoke
      vi.advanceTimersByTime(BLOB_REVOKE_DELAY_MS)
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
    })
  })
})
