import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { CodeSnippetViewer } from "@/components/inspector/CodeSnippetViewer"
import type { CodeSnippet } from "@/types"

// Mock react-syntax-highlighter — the default export must have registerLanguage as a static method
vi.mock("react-syntax-highlighter/dist/esm/prism-light", async () => {
  const React = (await import("react")).default
  function MockHighlighter({
    children,
    language,
  }: {
    children: string
    language: string
    style?: unknown
    showLineNumbers?: boolean
    wrapLongLines?: boolean
    customStyle?: unknown
  }) {
    return React.createElement(
      "pre",
      { "data-testid": "syntax-highlighter", "data-language": language },
      children,
    )
  }
  MockHighlighter.registerLanguage = vi.fn()
  return { default: MockHighlighter }
})

vi.mock("react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus", () => ({
  default: {},
}))

vi.mock("react-syntax-highlighter/dist/esm/languages/prism/typescript", () => ({ default: {} }))
vi.mock("react-syntax-highlighter/dist/esm/languages/prism/javascript", () => ({ default: {} }))
vi.mock("react-syntax-highlighter/dist/esm/languages/prism/yaml", () => ({ default: {} }))
vi.mock("react-syntax-highlighter/dist/esm/languages/prism/sql", () => ({ default: {} }))
vi.mock("react-syntax-highlighter/dist/esm/languages/prism/bash", () => ({ default: {} }))

const typescriptSnippet: CodeSnippet = {
  language: "typescript",
  code: "const x: number = 42",
}

const yamlSnippet: CodeSnippet = {
  language: "yaml",
  code: "key: value",
}

describe("CodeSnippetViewer", () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it("renders nothing when codeSnippet is undefined", () => {
    const { container } = render(<CodeSnippetViewer codeSnippet={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders code-snippet-section wrapper when codeSnippet is provided", () => {
    render(<CodeSnippetViewer codeSnippet={typescriptSnippet} />)
    expect(screen.getByTestId("code-snippet-section")).toBeInTheDocument()
  })

  it("renders the language label above the code block", () => {
    render(<CodeSnippetViewer codeSnippet={typescriptSnippet} />)
    expect(screen.getByText("typescript")).toBeInTheDocument()
  })

  it("renders the language label for yaml snippet", () => {
    render(<CodeSnippetViewer codeSnippet={yamlSnippet} />)
    expect(screen.getByText("yaml")).toBeInTheDocument()
  })

  it("renders the code content inside the highlighter", () => {
    render(<CodeSnippetViewer codeSnippet={typescriptSnippet} />)
    expect(screen.getByText("const x: number = 42")).toBeInTheDocument()
  })

  it("passes language to syntax highlighter", () => {
    render(<CodeSnippetViewer codeSnippet={typescriptSnippet} />)
    const highlighter = screen.getByTestId("syntax-highlighter")
    expect(highlighter.getAttribute("data-language")).toBe("typescript")
  })

  it("does not use dangerouslySetInnerHTML — code is passed as children", () => {
    const { container } = render(<CodeSnippetViewer codeSnippet={typescriptSnippet} />)
    const pre = container.querySelector("pre")
    expect(pre?.textContent).toContain("const x: number = 42")
  })

  // TD-4-1a: Trust boundary hardening tests

  it("falls back to plain text for unknown languages", () => {
    const unknownSnippet: CodeSnippet = { language: "cobol", code: "DISPLAY 'Hello'" }
    render(<CodeSnippetViewer codeSnippet={unknownSnippet} />)
    const highlighter = screen.getByTestId("syntax-highlighter")
    expect(highlighter).not.toHaveAttribute("data-language")
  })

  it("falls back to plain text for empty string language", () => {
    const emptyLangSnippet: CodeSnippet = { language: "", code: "some code" }
    render(<CodeSnippetViewer codeSnippet={emptyLangSnippet} />)
    const highlighter = screen.getByTestId("syntax-highlighter")
    expect(highlighter).not.toHaveAttribute("data-language")
  })

  it("renders placeholder when code exceeds 10KB", () => {
    const largeSnippet: CodeSnippet = {
      language: "typescript",
      code: "x".repeat(10_001),
    }
    render(<CodeSnippetViewer codeSnippet={largeSnippet} />)
    expect(screen.getByTestId("code-snippet-too-large")).toHaveTextContent(
      "Code snippet too large to display",
    )
    expect(screen.queryByTestId("syntax-highlighter")).not.toBeInTheDocument()
  })

  // TD-4-1b: Display safety tests

  it("strips RTL overrides and zero-width characters from language label", () => {
    const craftedSnippet: CodeSnippet = {
      language: "type\u200Bscr\u202Eipt\uFEFF",
      code: "const x = 1",
    }
    render(<CodeSnippetViewer codeSnippet={craftedSnippet} />)
    const label = screen.getByTestId("code-snippet-section").querySelector("span")
    expect(label?.textContent).toBe("typescript")
  })

  it("strips control characters from language label", () => {
    const controlSnippet: CodeSnippet = {
      language: "java\u200Fscript\u202B",
      code: "let x = 1",
    }
    render(<CodeSnippetViewer codeSnippet={controlSnippet} />)
    const label = screen.getByTestId("code-snippet-section").querySelector("span")
    expect(label?.textContent).toBe("javascript")
  })

  it("renders too-large placeholder even when language is also unknown", () => {
    const combinedSnippet: CodeSnippet = {
      language: "cobol",
      code: "x".repeat(10_001),
    }
    render(<CodeSnippetViewer codeSnippet={combinedSnippet} />)
    expect(screen.getByTestId("code-snippet-too-large")).toBeInTheDocument()
    expect(screen.queryByTestId("syntax-highlighter")).not.toBeInTheDocument()
  })

  it("renders syntax highlighter when code is exactly at 10KB limit", () => {
    const boundarySnippet: CodeSnippet = {
      language: "typescript",
      code: "x".repeat(10_000),
    }
    render(<CodeSnippetViewer codeSnippet={boundarySnippet} />)
    expect(screen.getByTestId("syntax-highlighter")).toBeInTheDocument()
    expect(screen.queryByTestId("code-snippet-too-large")).not.toBeInTheDocument()
  })
})
