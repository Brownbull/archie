import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sanitizeFilename, downloadMarkdown, BLOB_REVOKE_DELAY_MS } from "@/lib/downloadUtils"

describe("sanitizeFilename", () => {
  it("replaces spaces with hyphens", () => {
    expect(sanitizeFilename("my architecture")).toBe("my-architecture")
  })

  it("strips special characters", () => {
    expect(sanitizeFilename("arch@#$%^&*()ture")).toBe("archture")
  })

  it("handles path traversal attempts", () => {
    const result = sanitizeFilename("../../etc/passwd")
    expect(result).not.toContain("..")
    expect(result).not.toContain("/")
    expect(result).not.toContain("\\")
  })

  it("collapses multiple consecutive hyphens", () => {
    expect(sanitizeFilename("my---arch---ture")).toBe("my-arch-ture")
  })

  it("lowercases the output", () => {
    expect(sanitizeFilename("My Architecture")).toBe("my-architecture")
  })

  it("truncates to 100 characters", () => {
    const long = "a".repeat(150)
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(100)
  })

  it("returns fallback for empty input", () => {
    expect(sanitizeFilename("")).toBe("untitled-architecture")
  })

  it("returns fallback for whitespace-only input", () => {
    expect(sanitizeFilename("   ")).toBe("untitled-architecture")
  })

  it("returns fallback when all characters are stripped", () => {
    expect(sanitizeFilename("@#$%^&*()")).toBe("untitled-architecture")
  })

  it("strips backslashes", () => {
    expect(sanitizeFilename("my\\path\\file")).not.toContain("\\")
  })

  it("preserves underscores", () => {
    expect(sanitizeFilename("my_architecture")).toBe("my_architecture")
  })

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeFilename("-my-arch-")).toBe("my-arch")
  })
})

describe("downloadMarkdown", () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let removeChildSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue("blob:test-url")
    revokeObjectURLMock = vi.fn()
    Object.defineProperty(globalThis, "URL", {
      value: {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      },
      writable: true,
      configurable: true,
    })

    clickSpy = vi.fn()
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLAnchorElement)

    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node)
    removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node)

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("creates a Blob with text/markdown MIME type", () => {
    const BlobSpy = vi.spyOn(globalThis, "Blob")
    downloadMarkdown("# Report", "test-report.md")
    expect(BlobSpy).toHaveBeenCalledWith(["# Report"], { type: "text/markdown" })
  })

  it("sets anchor download attribute with the provided filename", () => {
    const anchor = { href: "", download: "", click: vi.fn() } as unknown as HTMLAnchorElement
    vi.spyOn(document, "createElement").mockReturnValue(anchor)
    downloadMarkdown("# Report", "my-report.md")
    expect(anchor.download).toBe("my-report.md")
  })

  it("clicks the anchor to trigger download", () => {
    downloadMarkdown("# Report", "test.md")
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it("appends and removes anchor from document body", () => {
    downloadMarkdown("# Report", "test.md")
    expect(appendChildSpy).toHaveBeenCalledOnce()
    expect(removeChildSpy).toHaveBeenCalledOnce()
  })

  it("revokes the Blob URL after delay", () => {
    downloadMarkdown("# Report", "test.md")
    expect(revokeObjectURLMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(BLOB_REVOKE_DELAY_MS)
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-url")
  })
})
