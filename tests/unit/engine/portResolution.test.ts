import { describe, it, expect } from "vitest"
import { resolvePortPair } from "@/engine/portResolution"
import type { PortDefinition } from "@/lib/constants"

// node-express-like outputs + various targets.
const computeOuts: PortDefinition[] = [
  { id: "http-in", type: "http", direction: "in" },
  { id: "http-out", type: "http", direction: "out" },
  { id: "db-out", type: "database", direction: "out" },
  { id: "cache-out", type: "cache", direction: "out" },
]
const cacheIns: PortDefinition[] = [
  { id: "cache-in", type: "cache", direction: "in" },
  { id: "monitor-out", type: "monitor", direction: "out" },
]
const dbIns: PortDefinition[] = [{ id: "db-in", type: "database", direction: "in" }]

describe("resolvePortPair (P98 port wiring)", () => {
  it("matches the cache connection to the cache ports, not http", () => {
    expect(resolvePortPair(computeOuts, cacheIns, "cache")).toEqual({
      sourceHandleId: "cache-out",
      targetHandleId: "cache-in",
    })
  })

  it("matches the database connection to the db ports", () => {
    expect(resolvePortPair(computeOuts, dbIns, "database")).toEqual({
      sourceHandleId: "db-out",
      targetHandleId: "db-in",
    })
  })

  it("resolves the only matching type even without a preferredType", () => {
    // compute → cache: cache is the sole common type, so it wins regardless of priority order.
    expect(resolvePortPair(computeOuts, cacheIns)).toEqual({
      sourceHandleId: "cache-out",
      targetHandleId: "cache-in",
    })
  })

  it("preferredType steers the pick when several types match", () => {
    const target: PortDefinition[] = [
      { id: "http-in", type: "http", direction: "in" },
      { id: "db-in", type: "database", direction: "in" },
    ]
    // Without a preference, PORT_SORT_ORDER puts http first.
    expect(resolvePortPair(computeOuts, target)).toEqual({ sourceHandleId: "http-out", targetHandleId: "http-in" })
    // With "database" preferred, the db pair wins.
    expect(resolvePortPair(computeOuts, target, "database")).toEqual({ sourceHandleId: "db-out", targetHandleId: "db-in" })
  })

  it("falls back to the priority match when preferredType is unknown/free-form", () => {
    expect(resolvePortPair(computeOuts, cacheIns, "pub-sub")).toEqual({
      sourceHandleId: "cache-out",
      targetHandleId: "cache-in",
    })
  })

  it("returns nulls when no port type matches", () => {
    const noMatchTarget: PortDefinition[] = [{ id: "auth-in", type: "auth", direction: "in" }]
    expect(resolvePortPair(computeOuts, noMatchTarget)).toEqual({ sourceHandleId: null, targetHandleId: null })
  })

  it("returns nulls for port-less components (never invents a handle)", () => {
    expect(resolvePortPair(undefined, cacheIns)).toEqual({ sourceHandleId: null, targetHandleId: null })
    expect(resolvePortPair(computeOuts, undefined)).toEqual({ sourceHandleId: null, targetHandleId: null })
    expect(resolvePortPair([], [])).toEqual({ sourceHandleId: null, targetHandleId: null })
  })

  it("ignores direction mismatches (won't connect out→out)", () => {
    const onlyOut: PortDefinition[] = [{ id: "cache-out", type: "cache", direction: "out" }]
    expect(resolvePortPair(computeOuts, onlyOut)).toEqual({ sourceHandleId: null, targetHandleId: null })
  })
})
