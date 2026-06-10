import { describe, it, expect, beforeEach, vi } from "vitest"

// Typed multi-provider library so addNode's saved-default injection can be exercised:
// two providers share typeId "relational-db", postgresql has two variants.
const { testComponentMap } = vi.hoisted(() => {
  const map = new Map<string, unknown>()
  const mk = (o: Record<string, unknown>) => ({
    name: "T", category: "data-storage", description: "d", is: "i", gain: ["g"], cost: ["c"], tags: [],
    baseMetrics: [], ...o,
  })
  map.set("postgresql", mk({
    id: "postgresql", name: "PostgreSQL", typeId: "relational-db",
    configVariants: [{ id: "single-node", name: "Single Node", metrics: [] }, { id: "primary-replica", name: "Primary-Replica", metrics: [] }],
  }))
  map.set("mysql", mk({
    id: "mysql", name: "MySQL", typeId: "relational-db",
    configVariants: [{ id: "single", name: "Single", metrics: [] }],
  }))
  map.set("redis", mk({
    id: "redis", name: "Redis", category: "caching", typeId: "cache",
    configVariants: [{ id: "standalone", name: "Standalone", metrics: [] }],
  }))
  map.set("web-users", mk({
    id: "web-users", name: "Web Users", category: "traffic", typeId: "traffic-source",
    configVariants: [{ id: "steady", name: "Steady", metrics: [] }, { id: "heavy", name: "Heavy", metrics: [] }],
  }))
  map.set("mobile-users", mk({
    id: "mobile-users", name: "Mobile Users", category: "traffic", typeId: "traffic-source",
    configVariants: [{ id: "steady", name: "Steady", metrics: [] }],
  }))
  return { testComponentMap: map }
})

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => testComponentMap.get(id)),
    // The traffic add-gate (resolveTrafficSourceAdd) enumerates the traffic category.
    getComponentsByCategory: vi.fn((category: string) =>
      [...testComponentMap.values()].filter((c) => (c as { category: string }).category === category),
    ),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("sonner", () => ({ toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() } }))

let uuidCounter = 0
vi.stubGlobal("crypto", { randomUUID: () => `test-uuid-${++uuidCounter}` })

import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserBlockDefaultsStore } from "@/stores/userBlockDefaultsStore"

function lastNode() {
  const nodes = useArchitectureStore.getState().nodes
  return nodes[nodes.length - 1]
}

describe("architectureStore.addNode — saved per-type default injection", () => {
  beforeEach(() => {
    uuidCounter = 0
    useArchitectureStore.setState({ nodes: [], edges: [] })
    useUserBlockDefaultsStore.setState({ defaults: {} })
  })

  it("uses the requested provider + first variant when no default is saved", () => {
    useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("postgresql")
    expect(lastNode().data.activeConfigVariantId).toBe("single-node")
  })

  it("applies a saved VARIANT default for the same provider", () => {
    useUserBlockDefaultsStore.setState({ defaults: { "relational-db": { providerId: "postgresql", variantId: "primary-replica" } } })
    useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("postgresql")
    expect(lastNode().data.activeConfigVariantId).toBe("primary-replica")
  })

  it("applies a saved PROVIDER+variant default, overriding the requested provider of the same type", () => {
    useUserBlockDefaultsStore.setState({ defaults: { "relational-db": { providerId: "mysql", variantId: "single" } } })
    // Toolbox would request the type's default provider (postgresql); the saved default wins.
    useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("mysql")
    expect(lastNode().data.activeConfigVariantId).toBe("single")
    expect(lastNode().data.componentName).toBe("MySQL")
  })

  it("falls back to the requested block when the saved provider no longer exists", () => {
    useUserBlockDefaultsStore.setState({ defaults: { "relational-db": { providerId: "deleted-db", variantId: "x" } } })
    useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("postgresql")
    expect(lastNode().data.activeConfigVariantId).toBe("single-node")
  })

  it("falls back when the saved variant no longer exists on the saved provider", () => {
    useUserBlockDefaultsStore.setState({ defaults: { "relational-db": { providerId: "postgresql", variantId: "gone" } } })
    useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("postgresql")
    expect(lastNode().data.activeConfigVariantId).toBe("single-node")
  })

  it("does not apply another type's default", () => {
    useUserBlockDefaultsStore.setState({ defaults: { cache: { providerId: "redis", variantId: "standalone" } } })
    useArchitectureStore.getState().addNode("postgresql", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("postgresql")
    expect(lastNode().data.activeConfigVariantId).toBe("single-node")
  })

  // P1/T3: traffic sources are excluded from saved defaults — demand is per-challenge/experiment,
  // and a saved traffic default applied after the D63 one-per-type remap could duplicate a type.
  it("ignores a persisted traffic-source default (variant AND provider) when adding a traffic source", () => {
    useUserBlockDefaultsStore.setState({ defaults: { "traffic-source": { providerId: "web-users", variantId: "heavy" } } })
    useArchitectureStore.getState().addNode("web-users", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("web-users")
    expect(lastNode().data.activeConfigVariantId).toBe("steady") // first variant, NOT the saved "heavy"
  })

  it("a saved traffic default cannot override the D63 one-per-type remap (no duplicate traffic types)", () => {
    useUserBlockDefaultsStore.setState({ defaults: { "traffic-source": { providerId: "web-users", variantId: "steady" } } })
    // web-users already on canvas → requesting web-users again remaps to the next free traffic type.
    useArchitectureStore.getState().addNode("web-users", { x: 0, y: 0 })
    expect(lastNode().data.archieComponentId).toBe("web-users")
    useArchitectureStore.getState().addNode("web-users", { x: 100, y: 0 })
    // Without the shield, the saved default would swap the remapped provider back to web-users.
    expect(lastNode().data.archieComponentId).toBe("mobile-users")
  })
})
