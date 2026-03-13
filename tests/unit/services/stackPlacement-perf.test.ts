import { describe, it, expect, vi, beforeEach } from "vitest"
import type { StackDefinition } from "@/schemas/stackSchema"
import { MAX_STACK_COMPONENTS } from "@/lib/constants"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(),
  },
}))

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn(),
}))

import { resolveStackPlacement } from "@/services/stackPlacement"
import { componentLibrary } from "@/services/componentLibrary"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { makeComponent, makeConfigVariant } from "../../helpers/factories"

const mockGetComponent = vi.mocked(componentLibrary.getComponent)
const mockCheckCompatibility = vi.mocked(checkCompatibility)

function makeComponentForPerf(index: number) {
  return makeComponent({
    id: `comp-${index}`,
    name: `Component ${index}`,
    category: "compute",
    configVariants: [
      makeConfigVariant({ id: `variant-${index}`, name: `Variant ${index}` }),
    ],
  })
}

function makePerfStack(componentCount: number): StackDefinition {
  const components = Array.from({ length: componentCount }, (_, i) => ({
    componentId: `comp-${i}`,
    variantId: `variant-${i}`,
    relativePosition: { x: i * 200, y: 0 },
  }))

  // Chain connections: 0→1, 1→2, ..., (n-2)→(n-1)
  const connections = Array.from({ length: Math.max(0, componentCount - 1) }, (_, i) => ({
    sourceComponentIndex: i,
    targetComponentIndex: i + 1,
    connectionType: "data-flow",
  }))

  return {
    id: "perf-stack",
    name: "Performance Test Stack",
    description: "Stack for performance testing",
    components,
    connections,
    tradeOffProfile: [],
  }
}

describe("stackPlacement performance (NFR15)", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mockGetComponent.mockImplementation((id: string) => {
      const match = id.match(/^comp-(\d+)$/)
      if (match) return makeComponentForPerf(Number(match[1]))
      return undefined
    })

    mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
  })

  it("resolves a 6-component stack in under 500ms", () => {
    const stack = makePerfStack(6)

    const start = performance.now()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })
    const elapsed = performance.now() - start

    expect(result.nodes).toHaveLength(6)
    expect(result.edges).toHaveLength(5)
    expect(elapsed).toBeLessThan(500)
  })

  it("resolves a MAX_STACK_COMPONENTS stack in under 500ms", () => {
    const stack = makePerfStack(MAX_STACK_COMPONENTS)

    const start = performance.now()
    const result = resolveStackPlacement(stack, { x: 0, y: 0 })
    const elapsed = performance.now() - start

    expect(result.nodes).toHaveLength(MAX_STACK_COMPONENTS)
    expect(result.edges).toHaveLength(MAX_STACK_COMPONENTS - 1)
    expect(elapsed).toBeLessThan(500)
  })
})
