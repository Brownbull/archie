import { StrictMode } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { toast } from "sonner"
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

    it("does not revoke Blob URL when unmounted without a prior export", () => {
      const { unmount } = render(<ExportButton />)
      unmount()
      expect(mockRevokeObjectURL).not.toHaveBeenCalled()
    })
  })

  describe("Rapid-click guard", () => {
    it("revokes previous Blob URL immediately when export is triggered again before timer fires", () => {
      mockCreateObjectURL.mockReturnValueOnce("blob:url-1").mockReturnValueOnce("blob:url-2")

      render(<ExportButton />)
      fireEvent.click(screen.getByTestId("export-button"))
      expect(mockRevokeObjectURL).not.toHaveBeenCalled()

      // Second export before timer fires — previous URL must be revoked immediately
      fireEvent.click(screen.getByTestId("export-button"))
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url-1")
    })
  })

  describe("Error handling", () => {
    it("calls toast.error and does not create a Blob URL when export fails", () => {
      mockExportArchitecture.mockImplementation(() => {
        throw new Error("yaml serialization failed")
      })

      render(<ExportButton />)
      fireEvent.click(screen.getByTestId("export-button"))

      expect(toast.error).toHaveBeenCalledWith("Export failed", {
        description: "yaml serialization failed",
      })
      expect(mockCreateObjectURL).not.toHaveBeenCalled()
    })
  })

  describe("Programmatic guard", () => {
    it("does not create a Blob URL when skeleton returns empty nodes", () => {
      mockGetArchitectureSkeleton.mockReturnValue({ nodes: [], edges: [] })

      render(<ExportButton />)
      fireEvent.click(screen.getByTestId("export-button"))

      expect(mockCreateObjectURL).not.toHaveBeenCalled()
    })
  })

  describe("Strict Mode double-invocation (AC-2, AC-3)", () => {
    it("calls anchor.click() exactly once and revokeObjectURL exactly once under React Strict Mode", () => {
      // Spy on prototype so all anchor instances created inside handleExport are intercepted.
      // React Strict Mode mounts → unmounts → remounts in dev, which re-runs the useEffect cleanup.
      // The cleanup only clears the timer (no download has happened yet), so the re-mount is harmless —
      // this test confirms empirically that neither anchor.click() nor revokeObjectURL fires twice.
      const anchorClickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {})
      try {
        render(
          <StrictMode>
            <ExportButton />
          </StrictMode>,
        )

        fireEvent.click(screen.getByTestId("export-button"))

        // AC-2: anchor.click() fires exactly once — Strict Mode effect re-run does not trigger a second download
        expect(anchorClickSpy).toHaveBeenCalledTimes(1)

        // revokeObjectURL not triggered yet — timer still pending
        expect(mockRevokeObjectURL).not.toHaveBeenCalled()

        vi.advanceTimersByTime(BLOB_REVOKE_DELAY_MS)

        // AC-3: revokeObjectURL fires exactly once — Strict Mode cleanup does not double-revoke
        expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
        expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
      } finally {
        anchorClickSpy.mockRestore()
      }
    })
  })
})
