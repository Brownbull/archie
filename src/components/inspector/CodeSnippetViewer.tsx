import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light"
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript"
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml"
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql"
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash"
import python from "react-syntax-highlighter/dist/esm/languages/prism/python"
import type { CodeSnippet } from "@/types"

const LANGUAGE_MAP: Record<string, typeof typescript> = {
  typescript,
  javascript,
  yaml,
  sql,
  bash,
  python,
}

Object.entries(LANGUAGE_MAP).forEach(([name, grammar]) => {
  SyntaxHighlighter.registerLanguage(name, grammar)
})

const ALLOWED_LANGUAGES = Object.keys(LANGUAGE_MAP) as readonly string[]
const MAX_CODE_SNIPPET_CHARS = 10_000

// Strip RTL overrides (U+202A-202E), zero-width chars (U+200B-200F),
// isolate chars (U+2066-2069), and BOM (U+FEFF) from display labels
const UNSAFE_DISPLAY_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

function sanitizeDisplayLabel(label: string): string {
  return label.replace(UNSAFE_DISPLAY_CHARS, "")
}

function getSafeLanguage(lang: string): string | undefined {
  return ALLOWED_LANGUAGES.includes(lang) ? lang : undefined
}

interface CodeSnippetViewerProps {
  codeSnippet?: CodeSnippet
}

export function CodeSnippetViewer({ codeSnippet }: CodeSnippetViewerProps) {
  if (!codeSnippet) return null

  // getSafeLanguage receives the raw string — crafted strings with invisible
  // chars fail the allowlist and fall back to plain text (safe default).
  // sanitizeDisplayLabel cleans only the visible label above the code block.
  const safeLanguage = getSafeLanguage(codeSnippet.language)
  const isTooLarge = codeSnippet.code.length > MAX_CODE_SNIPPET_CHARS

  return (
    <div data-testid="code-snippet-section" className="space-y-1 text-xs">
      <span className="text-text-secondary">{sanitizeDisplayLabel(codeSnippet.language)}</span>
      <div className="overflow-hidden rounded-md">
        {isTooLarge ? (
          <p
            data-testid="code-snippet-too-large"
            className="text-text-secondary italic"
          >
            Code snippet too large to display
          </p>
        ) : (
          <SyntaxHighlighter
            language={safeLanguage}
            style={vscDarkPlus}
            showLineNumbers={false}
            wrapLongLines
            // The prism theme sets `white-space: pre` on <pre>/<code>, so `wrapLongLines`
            // alone leaves long lines clipped by the narrow inspector panel. Force wrap on
            // both elements (and break long identifiers) so the full snippet stays readable.
            customStyle={{
              margin: 0,
              fontSize: "0.7rem",
              maxWidth: "100%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
            codeTagProps={{
              style: {
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              },
            }}
          >
            {codeSnippet.code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  )
}
