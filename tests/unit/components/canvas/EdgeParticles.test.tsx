import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"
import { PARTICLE_RADIUS, HEATMAP_COLORS } from "@/lib/constants"
import { EdgeParticles } from "@/components/canvas/EdgeParticles"

// Mock requestAnimationFrame / cancelAnimationFrame for jsdom
let rafCallbacks: Array<FrameRequestCallback> = []
let rafIdCounter = 0
const mockCancelAnimationFrame = vi.fn()

beforeEach(() => {
  rafCallbacks = []
  rafIdCounter = 0
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return ++rafIdCounter
  })
  vi.stubGlobal("cancelAnimationFrame", mockCancelAnimationFrame)
  mockCancelAnimationFrame.mockClear()

  // jsdom doesn't implement SVG path methods — patch on Element.prototype
  // so that <path> elements have them at render time
  Element.prototype.getTotalLength = vi.fn().mockReturnValue(200) as unknown as () => number
  Element.prototype.getPointAtLength = vi.fn().mockReturnValue({ x: 50, y: 50 }) as unknown as (distance: number) => DOMPoint
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete (Element.prototype as Record<string, unknown>).getTotalLength
  delete (Element.prototype as Record<string, unknown>).getPointAtLength
})

describe("EdgeParticles", () => {
  it("renders correct number of circle elements for given density", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 200 200" density={6} status="healthy" edgeId="e1" />
      </svg>,
    )

    const circles = container.querySelectorAll("circle")
    expect(circles).toHaveLength(6)
  })

  it("renders particles with correct radius", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={3} status="healthy" edgeId="e1" />
      </svg>,
    )

    const circle = container.querySelector("circle")
    expect(circle?.getAttribute("r")).toBe(String(PARTICLE_RADIUS))
  })

  it("does not intercept pointer events on parent group", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={3} status="healthy" edgeId="e1" />
      </svg>,
    )

    const group = container.querySelector("g")
    expect(group?.getAttribute("pointer-events")).toBe("none")
  })

  it("uses green fill for healthy status", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={2} status="healthy" edgeId="e1" />
      </svg>,
    )

    const circle = container.querySelector("circle")
    expect(circle?.getAttribute("fill")).toBe(HEATMAP_COLORS.healthy)
  })

  it("uses yellow fill for warning status", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={2} status="warning" edgeId="e1" />
      </svg>,
    )

    const circle = container.querySelector("circle")
    expect(circle?.getAttribute("fill")).toBe(HEATMAP_COLORS.warning)
  })

  it("uses red fill for bottleneck status", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={2} status="bottleneck" edgeId="e1" />
      </svg>,
    )

    const circle = container.querySelector("circle")
    expect(circle?.getAttribute("fill")).toBe(HEATMAP_COLORS.bottleneck)
  })

  it("starts exactly one requestAnimationFrame on mount", () => {
    render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={3} status="healthy" edgeId="e1" />
      </svg>,
    )

    expect(rafCallbacks).toHaveLength(1)
  })

  it("cancels animation frame on unmount", () => {
    const { unmount } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={3} status="healthy" edgeId="e1" />
      </svg>,
    )

    unmount()
    expect(mockCancelAnimationFrame).toHaveBeenCalledWith(rafIdCounter)
  })

  it("renders no circles when density is 0", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={0} status="healthy" edgeId="e1" />
      </svg>,
    )

    const circles = container.querySelectorAll("circle")
    expect(circles).toHaveLength(0)
  })

  it("has data-testid with edgeId", () => {
    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 100 100" density={2} status="healthy" edgeId="edge-42" />
      </svg>,
    )

    expect(container.querySelector("[data-testid='edge-particles-edge-42']")).toBeInTheDocument()
  })

  it("advances particle positions along path on RAF frame (AC-3 directional flow)", () => {
    // Return position proportional to distance along path
    ;(Element.prototype.getPointAtLength as ReturnType<typeof vi.fn>).mockImplementation(
      (distance: number) => ({ x: distance, y: distance / 2 }),
    )

    const { container } = render(
      <svg>
        <EdgeParticles edgePath="M 0 0 L 200 100" density={2} status="healthy" edgeId="e1" />
      </svg>,
    )

    // Fire the first RAF callback (startTime initialised, elapsed=0)
    expect(rafCallbacks).toHaveLength(1)
    rafCallbacks[0](1000)

    const circles = container.querySelectorAll("circle")
    const cx1 = circles[0]?.getAttribute("cx")

    // Fire a second frame 1 second later (elapsed=1, offset shifts by PARTICLE_SPEED=0.3)
    rafCallbacks[rafCallbacks.length - 1](2000)

    const cx2 = circles[0]?.getAttribute("cx")

    // Positions should differ between frames (particles moved along path)
    expect(cx1).not.toBe(cx2)
  })

  it("handles getTotalLength returning 0 without crashing", () => {
    ;(Element.prototype.getTotalLength as ReturnType<typeof vi.fn>).mockReturnValue(0)

    const { container } = render(
      <svg>
        <EdgeParticles edgePath="" density={3} status="healthy" edgeId="e1" />
      </svg>,
    )

    // Should render circles but not start animation (totalLength <= 0 guard)
    const circles = container.querySelectorAll("circle")
    expect(circles).toHaveLength(3)
  })
})
