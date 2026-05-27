import { describe, expect, it } from "vitest"
import {
  checkPortCompatibility,
  type PortLookupContext,
} from "@/engine/portCompatibilityChecker"
import type { PortDefinition } from "@/lib/constants"

function makeContext(
  ports: PortDefinition[],
  category = "compute",
): PortLookupContext {
  return { ports, category }
}

const httpOut: PortDefinition = { id: "http-out", type: "http", direction: "out" }
const httpIn: PortDefinition = { id: "http-in", type: "http", direction: "in" }
const dbOut: PortDefinition = { id: "db-out", type: "database", direction: "out" }
const dbIn: PortDefinition = { id: "db-in", type: "database", direction: "in" }
const cacheOut: PortDefinition = { id: "cache-out", type: "cache", direction: "out" }

describe("checkPortCompatibility", () => {
  describe("compatible connections", () => {
    it("returns compatible when port types match (http→http)", () => {
      const source = makeContext([httpOut])
      const target = makeContext([httpIn])

      const result = checkPortCompatibility("http-out", "http-in", source, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })

    it("returns compatible when port types match (database→database)", () => {
      const source = makeContext([dbOut])
      const target = makeContext([dbIn])

      const result = checkPortCompatibility("db-out", "db-in", source, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })
  })

  describe("port type mismatch", () => {
    it("returns incompatible when port types differ", () => {
      const source = makeContext([httpOut])
      const target = makeContext([dbIn])

      const result = checkPortCompatibility("http-out", "db-in", source, target)

      expect(result.isCompatible).toBe(false)
      expect(result.isPortMismatch).toBe(true)
      expect(result.reason).toContain("Port type mismatch")
      expect(result.reason).toContain("http")
      expect(result.reason).toContain("database")
    })
  })

  describe("direction violations", () => {
    it("rejects source port with direction=in", () => {
      const source = makeContext([httpIn])
      const target = makeContext([dbIn])

      const result = checkPortCompatibility("http-in", "db-in", source, target)

      expect(result.isCompatible).toBe(false)
      expect(result.isPortMismatch).toBe(true)
      expect(result.reason).toContain("input port")
      expect(result.reason).toContain("cannot be used as a source")
    })

    it("rejects target port with direction=out", () => {
      const source = makeContext([httpOut])
      const target = makeContext([dbOut])

      const result = checkPortCompatibility("http-out", "db-out", source, target)

      expect(result.isCompatible).toBe(false)
      expect(result.isPortMismatch).toBe(true)
      expect(result.reason).toContain("output port")
      expect(result.reason).toContain("cannot be used as a target")
    })
  })

  describe("graceful fallback (no port handles)", () => {
    it("returns compatible when sourceHandleId is null", () => {
      const source = makeContext([httpOut])
      const target = makeContext([httpIn])

      const result = checkPortCompatibility(null, "http-in", source, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })

    it("returns compatible when targetHandleId is undefined", () => {
      const source = makeContext([httpOut])
      const target = makeContext([httpIn])

      const result = checkPortCompatibility("http-out", undefined, source, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })

    it("returns compatible when both handle IDs are null", () => {
      const source = makeContext([httpOut])
      const target = makeContext([httpIn])

      const result = checkPortCompatibility(null, null, source, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })
  })

  describe("missing component data", () => {
    it("returns compatible when source component is undefined", () => {
      const target = makeContext([httpIn])

      const result = checkPortCompatibility("http-out", "http-in", undefined, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })

    it("returns compatible when target component is undefined", () => {
      const source = makeContext([httpOut])

      const result = checkPortCompatibility("http-out", "http-in", source, undefined)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })
  })

  describe("port not found in component", () => {
    it("returns compatible when source handle ID not found in ports", () => {
      const source = makeContext([httpOut])
      const target = makeContext([httpIn])

      const result = checkPortCompatibility("nonexistent", "http-in", source, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })

    it("returns compatible when component has no ports array", () => {
      const source: PortLookupContext = { category: "compute" }
      const target = makeContext([httpIn])

      const result = checkPortCompatibility("http-out", "http-in", source, target)

      expect(result).toEqual({
        isCompatible: true,
        isPortMismatch: false,
        reason: "",
      })
    })
  })

  describe("multi-port components", () => {
    it("validates correct port pair from component with many ports", () => {
      const source = makeContext([httpOut, dbOut, cacheOut])
      const target = makeContext([dbIn])

      const result = checkPortCompatibility("db-out", "db-in", source, target)

      expect(result.isCompatible).toBe(true)
    })

    it("detects mismatch when wrong port pair selected", () => {
      const source = makeContext([httpOut, dbOut, cacheOut])
      const target = makeContext([dbIn])

      const result = checkPortCompatibility("cache-out", "db-in", source, target)

      expect(result.isCompatible).toBe(false)
      expect(result.isPortMismatch).toBe(true)
      expect(result.reason).toContain("cache")
      expect(result.reason).toContain("database")
    })
  })
})
