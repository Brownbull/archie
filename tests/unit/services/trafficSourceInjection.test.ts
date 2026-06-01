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
        "web-users": { id: "web-users", name: "Web Users", ports: [{ id: "http-out", type: "http", direction: "out" }] },
        "iot-sensors": { id: "iot-sensors", name: "IoT Sensors", ports: [{ id: "http-out", type: "http", direction: "out" }] },
        dns: { id: "dns", name: "DNS", ports: [{ id: "http-in", type: "http", direction: "in" }] },
      })[id],
  },
}))

import {
  pickTrafficSource,
  curvePeakRps,
  hasTrafficSource,
  withEntryTrafficSource,
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
})
