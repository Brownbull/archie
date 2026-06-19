import { useEffect, useState } from "react"

interface WordRevealProps {
  /** The full heading text. Split on spaces; each word animates in sequence. */
  text: string
  /** Word index (0-based) from which the accent gradient is applied (e.g. the product phrase). */
  gradientFrom?: number
  className?: string
  /** Delay before the first word starts (ms). */
  startDelay?: number
  /** Gap between consecutive words (ms). */
  stagger?: number
}

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * Reveals a heading one word at a time on mount: each word rises + fades in, staggered by
 * `stagger` ms. Pure CSS transition-delay per word (compositor-cheap, no per-frame JS). Under
 * prefers-reduced-motion the whole heading is shown immediately. Pair with a delayed <Reveal> for the
 * following content so it "appears suddenly" once the words finish.
 */
export function WordReveal({ text, gradientFrom, className = "", startDelay = 120, stagger = 95 }: WordRevealProps) {
  const words = text.split(" ")
  const [shown, setShown] = useState(prefersReducedMotion)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <span className={className}>
      {words.flatMap((word, i) => {
        const isGradient = gradientFrom !== undefined && i >= gradientFrom
        const wordSpan = (
          <span
            key={`w-${i}`}
            className="inline-block"
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translateY(0.4em)",
              transition: `opacity 520ms cubic-bezier(0.16,1,0.3,1) ${startDelay + i * stagger}ms, transform 520ms cubic-bezier(0.16,1,0.3,1) ${startDelay + i * stagger}ms`,
              willChange: "opacity, transform",
            }}
          >
            <span className={isGradient ? "bg-gradient-to-r from-archie-accent to-archie-accent-hover bg-clip-text text-transparent" : undefined}>
              {word}
            </span>
          </span>
        )
        // Emit the inter-word space as a real sibling text node — not inside the inline-block, where
        // the browser collapses trailing whitespace — so the rendered text and text matchers keep the
        // gaps between words.
        return i < words.length - 1 ? [wordSpan, " "] : [wordSpan]
      })}
    </span>
  )
}
