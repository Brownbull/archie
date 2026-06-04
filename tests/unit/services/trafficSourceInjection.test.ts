import { describe, it, expect, vi } from "vitest"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponentsByCategory: (cat: string) =>
      cat === "traffic"
        ? [
            { id: "web-users", name: "Web Users", configVariants: [{ id: "moderate", maxRPS: 3000 }, { id: "heavy", maxRPS: 30000 }] },
            { id: "iot-sensors", name: "IoT Sensors", configVariants: [{ id: "fleet", maxRPS: 5000 }, { id: "large-fleet", maxRPS: 50000 }] },
          ]
        : [],
    getComponent: (id: string) =>
      ({
        "web-users": { id: "web-users", name: "Web Users", category: "traffic", configVariants: [{ id: "moderate" }], ports: [{ id: "http-out", type: "http", direction: "out" }] },
        "iot-sensors": { id: "iot-sensors", name: "IoT Sensors", category: "traffic", configVariants: [{ id: "fleet" }], ports: [{ id: "http-out", type: "http", direction: "out" }] },
        dns: { id: "dns", name: "DNS", ports: [{ id: "http-in", type: "http", direction: "in" }] },
      })[id],
  },
}))

import {
  pickTrafficSource,
  curvePeakRps,
  hasTrafficSource,
  withEntryTrafficSource,
  makeTrafficSourceNode,
  makeChallengeTrafficNodes,
  resolveTrafficSourceAdd,
  wouldDuplicateTrafficType,
  isTrafficProvider,
} from "@/services/trafficSourceInjection"

const dnsNode = () => ({
  id: "n-dns",
  type: "archie-component" as const,
  position: { x: 300, y: 200 },
  data: { archieComponentId: "dns", activeConfigVariantId: "standard", componentName: "DNS", componentCategory: "delivery-network" as const, replicaCount: 1 },
})

describe("trafficSourceInjection", () => {
  it("picks the source tier closest to the target RPS", () => {
    expect(pickTrafficSource(50000)).toEqual({ componentId: "iot-sensors", variantId: "large-fleet" })
    expect(pickTrafficSource(3000)).toEqual({ componentId: "web-users", variantId: "moderate" })
  })

  it("defaults to the lowest Web Users tier when no target", () => {
    expect(pickTrafficSource()).toEqual({ componentId: "web-users", variantId: "moderate" })
  })

  it("curvePeakRps returns the max rps in the curve", () => {
    expect(curvePeakRps([{ t: 0, rps: 0 }, { t: 30, rps: 50000 }, { t: 60, rps: 20000 }])).toBe(50000)
  })

  it("prepends a source wired to the entry when none exists", () => {
    const { nodes, edges } = withEntryTrafficSource([dnsNode()] as never, [])
    expect(nodes).toHaveLength(2)
    expect(nodes[0].data.componentCategory).toBe("traffic") // source prepended
    expect(hasTrafficSource(nodes)).toBe(true)
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe(nodes[0].id) // source → dns
    expect(edges[0].target).toBe("n-dns")
    expect(edges[0].targetHandle).toBe("http-in") // wired to DNS's http input
  })

  it("is a no-op when a traffic source is already present", () => {
    const existing = { ...dnsNode(), id: "src", data: { ...dnsNode().data, archieComponentId: "web-users", componentCategory: "traffic" as const } }
    const result = withEntryTrafficSource([existing] as never, [])
    expect(result.nodes).toHaveLength(1)
    expect(result.edges).toHaveLength(0)
  })

  it("makeTrafficSourceNode stamps trafficRps + kind/workload/origin from config + uses the explicit type", () => {
    const node = makeTrafficSourceNode(60000, { x: 0, y: 0 }, { type: "iot-sensors", kind: "search", workload: "write", origin: "multi-region" })
    expect(node).not.toBeNull()
    expect(node!.data.archieComponentId).toBe("iot-sensors") // explicit source type → provider
    expect(node!.data.trafficRps).toBe(60000) // peak set explicitly so the normalizer won't override it
    expect(node!.data.trafficKind).toBe("search")
    expect(node!.data.trafficWorkload).toBe("write")
    expect(node!.data.trafficOrigin).toBe("multi-region")
  })

  it("makeTrafficSourceNode without config still sets trafficRps from targetRps", () => {
    expect(makeTrafficSourceNode(9000, { x: 0, y: 0 })!.data.trafficRps).toBe(9000)
  })

  it("makeChallengeTrafficNodes injects one typed node per trafficSources entry", () => {
    const nodes = makeChallengeTrafficNodes({
      trafficCurve: [{ rps: 1000 }],
      trafficSources: [
        { type: "web-users", rps: 5000, kind: "realistic", workload: "read", origin: "one-region" },
        { type: "iot-sensors", rps: 12000, kind: "periodic", workload: "write", origin: "multi-region" },
      ],
    })
    expect(nodes).toHaveLength(2)
    expect(nodes.map((n) => n.data.archieComponentId)).toEqual(["web-users", "iot-sensors"])
    expect(nodes.map((n) => n.data.trafficRps)).toEqual([5000, 12000])
    expect(nodes[1].data.trafficKind).toBe("periodic")
  })

  it("makeChallengeTrafficNodes falls back to a single curve-peak source when no trafficSources", () => {
    const nodes = makeChallengeTrafficNodes({ trafficCurve: [{ rps: 0 }, { rps: 50000 }] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].data.trafficRps).toBe(50000) // sized to the curve peak
  })

  // --- one-per-type / max-4 hard-gate (D63) — mock universe has 2 traffic types: web-users, iot-sensors ---

  it("isTrafficProvider distinguishes traffic providers from other components", () => {
    expect(isTrafficProvider("web-users")).toBe(true)
    expect(isTrafficProvider("dns")).toBe(false)
  })

  it("resolveTrafficSourceAdd allows the requested type when free", () => {
    expect(resolveTrafficSourceAdd([], "web-users")).toEqual({ providerId: "web-users" })
  })

  it("resolveTrafficSourceAdd remaps to the next free type when the requested type is already placed", () => {
    const nodes = [{ data: { componentCategory: "traffic", archieComponentId: "web-users" } }]
    expect(resolveTrafficSourceAdd(nodes, "web-users")).toEqual({ providerId: "iot-sensors" })
  })

  it("resolveTrafficSourceAdd blocks when every traffic type is placed", () => {
    const nodes = [
      { data: { componentCategory: "traffic", archieComponentId: "web-users" } },
      { data: { componentCategory: "traffic", archieComponentId: "iot-sensors" } },
    ]
    const r = resolveTrafficSourceAdd(nodes, "web-users")
    expect("blocked" in r).toBe(true)
  })

  it("wouldDuplicateTrafficType blocks a swap to an already-placed traffic type (and ignores self / non-traffic)", () => {
    const nodes = [
      { id: "a", data: { componentCategory: "traffic", archieComponentId: "web-users" } },
      { id: "b", data: { componentCategory: "traffic", archieComponentId: "iot-sensors" } },
    ]
    expect(wouldDuplicateTrafficType(nodes, "b", "web-users")).toBe(true) // b → web-users, which a holds
    expect(wouldDuplicateTrafficType(nodes, "a", "web-users")).toBe(false) // a already is web-users
    expect(wouldDuplicateTrafficType(nodes, "b", "dns")).toBe(false) // non-traffic target
  })
})
