import { useEffect, useRef, useState, type ReactNode } from "react"

type RevealDirection = "up" | "left" | "right" | "scale"

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger the reveal (ms) for sequenced lists. */
  delay?: number
  /** Which way the element travels in from. Defaults to "up". */
  direction?: RevealDirection
}

const HIDDEN_TRANSFORM: Record<RevealDirection, string> = {
  up: "translateY(28px)",
  left: "translateX(-36px)",
  right: "translateX(36px)",
  scale: "scale(0.94)",
}

// Resolve reduced-motion at module/render time (client-only SPA) so we never call setState
// synchronously inside the effect — reduced-motion just starts revealed via the initial state.
const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * Animate a block into view when it scrolls on screen — fade plus a directional travel (rise, slide
 * in from a side, or scale up). Pure CSS transition driven by an IntersectionObserver, no animation
 * library. Honors prefers-reduced-motion (shows immediately). Kept tiny so the landing stays light.
 */
export function Reveal({ children, className = "", delay = 0, direction = "up" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(prefersReducedMotion)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : HIDDEN_TRANSFORM[direction],
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  )
}
