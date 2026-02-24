import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light"
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript"
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml"
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql"
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash"
import type { CodeSnippet } from "@/types"

SyntaxHighlighter.registerLanguage("typescript", typescript)
SyntaxHighlighter.registerLanguage("javascript", javascript)
SyntaxHighlighter.registerLanguage("yaml", yaml)
SyntaxHighlighter.registerLanguage("sql", sql)
SyntaxHighlighter.registerLanguage("bash", bash)

interface CodeSnippetViewerProps {
  codeSnippet?: CodeSnippet
}

export function CodeSnippetViewer({ codeSnippet }: CodeSnippetViewerProps) {
  if (!codeSnippet) return null

  return (
    <div data-testid="code-snippet-section" className="space-y-1 text-xs">
      <span className="text-text-secondary">{codeSnippet.language}</span>
      <div className="overflow-hidden rounded-md">
        <SyntaxHighlighter
          language={codeSnippet.language}
          style={vscDarkPlus}
          showLineNumbers={false}
          wrapLongLines
          customStyle={{ margin: 0, fontSize: "0.7rem" }}
        >
          {codeSnippet.code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
