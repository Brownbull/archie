import { describe, it, expect } from "vitest"
import {
  PORT_TYPES,
  PORT_SORT_ORDER,
  type PortType,
  type PortDefinition,
} from "@/lib/constants"
import { PortDefinitionSchema } from "@/schemas/componentSchema"

describe("PORT_TYPES constant", () => {
  it("defines exactly 7 port types", () => {
    expect(Object.keys(PORT_TYPES)).toHaveLength(7)
  })

  it("includes all expected port types", () => {
    const types = Object.keys(PORT_TYPES)
    expect(types).toEqual(
      expect.arrayContaining([
        "http",
        "database",
        "cache",
        "stream",
        "monitor",
        "auth",
        "cdn",
      ]),
    )
  })

  it("each port type has a label and color", () => {
    for (const [key, value] of Object.entries(PORT_TYPES)) {
      expect(value).toHaveProperty("label")
      expect(value).toHaveProperty("color")
      expect(typeof value.label).toBe("string")
      expect(value.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it("uses jewel-tone colors per ADR", () => {
    expect(PORT_TYPES.http.color).toBe("#2563EB")
    expect(PORT_TYPES.database.color).toBe("#7C3AED")
    expect(PORT_TYPES.cache.color).toBe("#DC2626")
    expect(PORT_TYPES.stream.color).toBe("#D97706")
    expect(PORT_TYPES.monitor.color).toBe("#059669")
    expect(PORT_TYPES.auth.color).toBe("#CA8A04")
    expect(PORT_TYPES.cdn.color).toBe("#0891B2")
  })
})

describe("PORT_SORT_ORDER", () => {
  it("contains all port types in fixed order", () => {
    expect(PORT_SORT_ORDER).toEqual([
      "http",
      "database",
      "cache",
      "stream",
      "monitor",
      "auth",
      "cdn",
    ])
  })

  it("matches PORT_TYPES keys exactly", () => {
    const typeKeys = Object.keys(PORT_TYPES).sort()
    const sortKeys = [...PORT_SORT_ORDER].sort()
    expect(sortKeys).toEqual(typeKeys)
  })
})

describe("PortDefinitionSchema (Zod)", () => {
  it("accepts a valid port definition", () => {
    const valid: PortDefinition = {
      id: "http-in",
      type: "http",
      direction: "in",
    }
    expect(PortDefinitionSchema.parse(valid)).toEqual(valid)
  })

  it("accepts every port type", () => {
    for (const type of PORT_SORT_ORDER) {
      const def = { id: `${type}-out`, type, direction: "out" as const }
      expect(PortDefinitionSchema.parse(def)).toEqual(def)
    }
  })

  it("rejects an invalid port type", () => {
    const invalid = { id: "foo-in", type: "websocket", direction: "in" }
    expect(() => PortDefinitionSchema.parse(invalid)).toThrow()
  })

  it("rejects an invalid direction", () => {
    const invalid = { id: "http-both", type: "http", direction: "both" }
    expect(() => PortDefinitionSchema.parse(invalid)).toThrow()
  })

  it("rejects an empty id", () => {
    const invalid = { id: "", type: "http", direction: "in" }
    expect(() => PortDefinitionSchema.parse(invalid)).toThrow()
  })

  it("rejects extra fields (strict mode)", () => {
    const withExtra = {
      id: "http-in",
      type: "http",
      direction: "in",
      position: "left",
    }
    expect(() => PortDefinitionSchema.parse(withExtra)).toThrow()
  })
})

describe("PortType type", () => {
  it("is assignable from PORT_TYPES keys", () => {
    const keys = Object.keys(PORT_TYPES) as PortType[]
    expect(keys.length).toBe(7)
    keys.forEach((k) => {
      expect(PORT_TYPES[k]).toBeDefined()
    })
  })
})
