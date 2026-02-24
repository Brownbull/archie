import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"

vi.mock("@/data/prompt-template.md?raw", () => ({
  default: "# Archie AI Prompt Template\n\nThis is the template content.",
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

const mockWriteText = vi.fn()
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  configurable: true,
})

import { PromptTemplateDialog } from "@/components/import-export/PromptTemplateDialog"

describe("PromptTemplateDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    mockWriteText.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the dialog with correct testid when open", () => {
    render(<PromptTemplateDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByTestId("prompt-template-dialog")).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    render(<PromptTemplateDialog open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByTestId("prompt-template-dialog")).not.toBeInTheDocument()
  })

  it("renders template content inside dialog", () => {
    render(<PromptTemplateDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByText(/Archie AI Prompt Template/i)).toBeInTheDocument()
  })

  it("renders copy button with correct testid", () => {
    render(<PromptTemplateDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByTestId("prompt-template-copy")).toBeInTheDocument()
  })

  it("copies template content to clipboard when copy button clicked", async () => {
    render(<PromptTemplateDialog open onOpenChange={vi.fn()} />)
    const copyButton = screen.getByTestId("prompt-template-copy")
    fireEvent.click(copyButton)
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("Archie AI Prompt Template"))
  })

  it("copy button reverts from Copied back to Copy after 2000ms", async () => {
    render(<PromptTemplateDialog open onOpenChange={vi.fn()} />)
    const copyButton = screen.getByTestId("prompt-template-copy")

    await act(async () => {
      fireEvent.click(copyButton)
      await Promise.resolve() // flush microtask (clipboard .then)
    })
    expect(copyButton).toHaveTextContent("Copied")

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(copyButton).toHaveTextContent("Copy")
  })

  it("does not update state when clipboard write fails", async () => {
    mockWriteText.mockRejectedValue(new Error("Permission denied"))
    render(<PromptTemplateDialog open onOpenChange={vi.fn()} />)
    const copyButton = screen.getByTestId("prompt-template-copy")

    await act(async () => {
      fireEvent.click(copyButton)
      await Promise.resolve() // flush rejection
    })
    // Should stay in "Copy" state — no Copied transition on failure
    expect(copyButton).toHaveTextContent("Copy")
  })
})
