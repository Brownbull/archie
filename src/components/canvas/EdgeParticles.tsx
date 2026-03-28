import { useEffect, useRef } from "react"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import { PARTICLE_RADIUS, PARTICLE_SPEED, HEATMAP_COLORS } from "@/lib/constants"

interface EdgeParticlesProps {
  edgePath: string
  density: number
  status: HeatmapStatus
  edgeId: string
}

const STATUS_COLORS: Record<HeatmapStatus, string> = {
  healthy: HEATMAP_COLORS.healthy,
  warning: HEATMAP_COLORS.warning,
  bottleneck: HEATMAP_COLORS.bottleneck,
}

export function EdgeParticles({ edgePath, density, status, edgeId }: EdgeParticlesProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const cleanup = () => { cancelAnimationFrame(rafRef.current) }

    if (density <= 0) return cleanup

    const path = pathRef.current
    if (!path || typeof path.getTotalLength !== "function") return cleanup

    const totalLength = path.getTotalLength()
    if (totalLength <= 0) return cleanup

    // Trim stale refs when density decreases (prevents detached DOM node leaks)
    circleRefs.current.length = density

    startTimeRef.current = 0 // Reset on re-mount — animate() handles first-run via === 0 check

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) startTimeRef.current = timestamp
      const elapsed = (timestamp - startTimeRef.current) / 1000

      for (let i = 0; i < density; i++) {
        const circle = circleRefs.current[i]
        if (!circle) continue

        const offset = ((i / density) + elapsed * PARTICLE_SPEED) % 1.0
        const point = path.getPointAtLength(offset * totalLength)
        circle.setAttribute("cx", String(point.x))
        circle.setAttribute("cy", String(point.y))
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return cleanup
  }, [density, edgePath])

  const fillColor = STATUS_COLORS[status]

  return (
    <g data-testid={`edge-particles-${edgeId}`} pointerEvents="none">
      <path ref={pathRef} d={edgePath} fill="none" stroke="none" />
      {Array.from({ length: density }, (_, i) => (
        <circle
          key={i}
          ref={(el) => { circleRefs.current[i] = el }}
          r={PARTICLE_RADIUS}
          fill={fillColor}
          opacity={0.8}
        />
      ))}
    </g>
  )
}
