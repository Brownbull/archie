import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { BlockConceptLoop } from "@/components/common/BlockConceptLoop"

describe("BlockConceptLoop", () => {
  it("renders an svg labeled by type id with that type's motion class", () => {
    const { getByTestId } = render(<BlockConceptLoop typeId="compute" animate />)
    const svg = getByTestId("block-loop-compute")
    expect(svg.tagName.toLowerCase()).toBe("svg")
    expect(svg.querySelector(".bl-flow")).toBeTruthy()
    expect(svg.getAttribute("data-animate")).toBe("true")
  })

  it("renders a distinct loop per type", () => {
    const { getByTestId } = render(<BlockConceptLoop typeId="load-balancer" animate />)
    expect(getByTestId("block-loop-load-balancer").querySelector(".bl-fan-mid")).toBeTruthy()
    const { getByTestId: get2 } = render(<BlockConceptLoop typeId="message-queue" animate />)
    expect(get2("block-loop-message-queue").querySelector(".bl-queue")).toBeTruthy()
  })

  it("falls back to a generic flow loop for unknown types", () => {
    const { getByTestId } = render(<BlockConceptLoop typeId="totally-unknown" animate />)
    expect(getByTestId("block-loop-totally-unknown").querySelector(".bl-flow")).toBeTruthy()
  })

  it("freezes to a static frame when motion is off", () => {
    const { getByTestId } = render(<BlockConceptLoop typeId="cache" animate={false} />)
    const svg = getByTestId("block-loop-cache")
    expect(svg.classList.contains("block-loop--static")).toBe(true)
    expect(svg.getAttribute("data-animate")).toBeNull()
  })

  it("scales the SVG height by the size prop", () => {
    const { getByTestId } = render(<BlockConceptLoop typeId="compute" size="lg" animate />)
    expect(getByTestId("block-loop-compute").getAttribute("height")).toBe("44")
  })

  it("themes via the color prop", () => {
    const { getByTestId } = render(<BlockConceptLoop typeId="cdn" color="rgb(1, 2, 3)" animate />)
    expect(getByTestId("block-loop-cdn").style.color).toBe("rgb(1, 2, 3)")
  })
})
