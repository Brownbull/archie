/** Vite raw import — returns file contents as a string at build time */
declare module "*.md?raw" {
  const content: string
  export default content
}

/** react-syntax-highlighter ESM subpath declarations (not covered by @types package) */
declare module "react-syntax-highlighter/dist/esm/prism-light" {
  import type { ComponentType } from "react"
  interface SyntaxHighlighterProps {
    language?: string
    style?: Record<string, React.CSSProperties>
    children: string
    showLineNumbers?: boolean
    wrapLongLines?: boolean
    customStyle?: React.CSSProperties
    [key: string]: unknown
  }
  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps> & {
    registerLanguage: (name: string, language: unknown) => void
  }
  export default SyntaxHighlighter
}

declare module "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus" {
  const style: Record<string, React.CSSProperties>
  export default style
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/typescript" {
  const language: unknown
  export default language
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/javascript" {
  const language: unknown
  export default language
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/yaml" {
  const language: unknown
  export default language
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/sql" {
  const language: unknown
  export default language
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/bash" {
  const language: unknown
  export default language
}
