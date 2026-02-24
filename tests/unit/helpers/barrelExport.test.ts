import { describe, it, expect } from "vitest"

// Verify barrel export re-exports everything
import {
  // factories
  makeMetric,
  makeConfigVariant,
  makeComponent,
  makeNode,
  makeEdge,
  // mockComponentLibrary
  createMockComponentLibrary,
  STANDARD_TEST_COMPONENTS,
  // fixtures
  emptyArchitecture,
  singleNodeArchitecture,
  connectedPairArchitecture,
  fullArchitecture,
} from "../../helpers"

describe("barrel export (tests/helpers/index.ts)", () => {
  it("exports all factory functions", () => {
    expect(typeof makeMetric).toBe("function")
    expect(typeof makeConfigVariant).toBe("function")
    expect(typeof makeComponent).toBe("function")
    expect(typeof makeNode).toBe("function")
    expect(typeof makeEdge).toBe("function")
  })

  it("exports mock component library utilities", () => {
    expect(typeof createMockComponentLibrary).toBe("function")
    expect(Array.isArray(STANDARD_TEST_COMPONENTS)).toBe(true)
  })

  it("exports fixture functions", () => {
    expect(typeof emptyArchitecture).toBe("function")
    expect(typeof singleNodeArchitecture).toBe("function")
    expect(typeof connectedPairArchitecture).toBe("function")
    expect(typeof fullArchitecture).toBe("function")
  })

  it("barrel exports produce working results", () => {
    // Verify functions actually work when imported via barrel
    const metric = makeMetric()
    expect(metric.id).toBeDefined()

    const component = makeComponent()
    expect(component.name).toBeDefined()

    const mock = createMockComponentLibrary()
    expect(mock.getComponent("postgresql")).toBeDefined()

    const arch = singleNodeArchitecture()
    expect(arch.nodes).toHaveLength(1)
  })
})
