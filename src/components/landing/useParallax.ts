import { useEffect, useRef } from "react"

/**
 * Subtle scroll parallax: translate an element vertically by (its distance from the viewport center ×
 * strength), so it drifts a little slower/faster than the page as you scroll — adds depth without a
 * library. Transform-only (compositor-cheap), rAF-throttled, passive scroll listener, and a no-op
 * under prefers-reduced-motion. Apply to a decorative/visual element, not a Reveal wrapper (their
 * transforms would otherwise fight).
 */
export function useParallax<T extends HTMLElement>(strength = 0.08) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const el = ref.current
    if (!el) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2
      el.style.transform = `translate3d(0, ${(-fromCenter * strength).toFixed(1)}px, 0)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength])

  return ref
}
