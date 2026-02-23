import { describe, it, expect, vi, beforeEach } from "vitest"
import "./seed-mocks"
import { validateBlueprintReferences } from "../../../scripts/seed-firestore"
import { makeComponent, makeBlueprintFull } from "./seed-helpers"
import type { BlueprintFull } from "@/schemas/blueprintSchema"
import type { Component } from "@/schemas/componentSchema"

function createSpyLogger() {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("validateBlueprintReferences", () => {
  it("returns 0 warnings when all component references are valid", () => {
    // Blueprint references "nginx" with variant "load-balancer"
    const components: Component[] = [
      {
        ...makeComponent("nginx"),
        configVariants: [{ id: "load-balancer", name: "Load Balancer", metrics: [] }],
      },
    ]
    const blueprints: BlueprintFull[] = [makeBlueprintFull("test-bp")]
    // makeBlueprintFull uses componentId: "nginx", configVariantId: "load-balancer"

    const logger = createSpyLogger()
    const result = validateBlueprintReferences(blueprints, components, logger)

    expect(result).toBe(0)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("warns and returns 1 when blueprint references unknown component ID", () => {
    const components: Component[] = [makeComponent("postgresql")]
    const blueprint: BlueprintFull = {
      id: "bp-unknown",
      name: "Unknown Comp Blueprint",
      description: "Has unknown component",
      skeleton: {
        schemaVersion: "1.0.0",
        nodes: [{ id: "n1", componentId: "unknown-component", configVariantId: "default", position: { x: 0, y: 0 } }],
        edges: [],
      },
    }

    const logger = createSpyLogger()
    const result = validateBlueprintReferences([blueprint], components, logger)

    expect(result).toBe(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("unknown-component"),
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("bp-unknown"),
    )
  })

  it("warns and returns 1 when blueprint references unknown config variant", () => {
    const components: Component[] = [
      {
        ...makeComponent("nginx"),
        configVariants: [{ id: "reverse-proxy", name: "Reverse Proxy", metrics: [] }],
      },
    ]
    const blueprint: BlueprintFull = {
      id: "bp-bad-variant",
      name: "Bad Variant Blueprint",
      description: "Has unknown variant",
      skeleton: {
        schemaVersion: "1.0.0",
        nodes: [{ id: "n1", componentId: "nginx", configVariantId: "unknown-variant", position: { x: 0, y: 0 } }],
        edges: [],
      },
    }

    const logger = createSpyLogger()
    const result = validateBlueprintReferences([blueprint], components, logger)

    expect(result).toBe(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("unknown-variant"),
    )
  })

  it("counts multiple warnings across multiple blueprints", () => {
    const components: Component[] = [makeComponent("postgresql")]
    const blueprints: BlueprintFull[] = [
      {
        id: "bp-1",
        name: "Blueprint 1",
        description: "Test",
        skeleton: {
          schemaVersion: "1.0.0",
          nodes: [
            { id: "n1", componentId: "redis", configVariantId: "default", position: { x: 0, y: 0 } },
            { id: "n2", componentId: "kafka", configVariantId: "default", position: { x: 100, y: 0 } },
          ],
          edges: [],
        },
      },
    ]

    const logger = createSpyLogger()
    const result = validateBlueprintReferences(blueprints, components, logger)

    expect(result).toBe(2) // redis + kafka both unknown
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })

  it("returns 0 for empty blueprints array", () => {
    const logger = createSpyLogger()
    const result = validateBlueprintReferences([], [makeComponent("postgresql")], logger)
    expect(result).toBe(0)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("nodes without configVariantId do not trigger a variant warning", () => {
    const components: Component[] = [
      {
        ...makeComponent("nginx"),
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      },
    ]
    const blueprint: BlueprintFull = {
      id: "bp-no-variant",
      name: "No Variant Blueprint",
      description: "No variant specified",
      skeleton: {
        schemaVersion: "1.0.0",
        nodes: [{ id: "n1", componentId: "nginx", configVariantId: undefined, position: { x: 0, y: 0 } }],
        edges: [],
      },
    }

    const logger = createSpyLogger()
    const result = validateBlueprintReferences([blueprint], components, logger)

    expect(result).toBe(0)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
