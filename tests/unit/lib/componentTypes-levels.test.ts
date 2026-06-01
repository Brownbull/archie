import { describe, it, expect } from "vitest"
import { levelRank, typeLevel, typeWithinLevel } from "@/lib/componentTypes"

describe("componentTypes — experience levels (P86)", () => {
  it("ranks levels in ascending order", () => {
    expect(levelRank("beginner")).toBeLessThan(levelRank("intermediate"))
    expect(levelRank("intermediate")).toBeLessThan(levelRank("advanced"))
  })

  it("classifies the beginner essentials as beginner", () => {
    for (const id of ["traffic-source", "compute", "relational-db", "cache", "load-balancer", "cdn", "object-storage"]) {
      expect(typeLevel(id)).toBe("beginner")
    }
  })

  it("classifies common production blocks as intermediate", () => {
    for (const id of ["message-queue", "api-gateway", "auth", "observability", "search-engine"]) {
      expect(typeLevel(id)).toBe("intermediate")
    }
  })

  it("classifies specialized blocks as advanced", () => {
    for (const id of ["event-stream", "vector-store", "graph-db", "rate-limiter", "llm-gateway"]) {
      expect(typeLevel(id)).toBe("advanced")
    }
  })

  it("defaults unknown/legacy types to beginner so they always stay visible", () => {
    expect(typeLevel(null)).toBe("beginner")
    expect(typeLevel(undefined)).toBe("beginner")
    expect(typeLevel("not-a-real-type")).toBe("beginner")
  })

  it("typeWithinLevel includes at-or-below tiers and excludes above", () => {
    // beginner level: only beginner blocks
    expect(typeWithinLevel("compute", "beginner")).toBe(true)
    expect(typeWithinLevel("message-queue", "beginner")).toBe(false)
    expect(typeWithinLevel("event-stream", "beginner")).toBe(false)
    // intermediate level: beginner + intermediate, not advanced
    expect(typeWithinLevel("compute", "intermediate")).toBe(true)
    expect(typeWithinLevel("message-queue", "intermediate")).toBe(true)
    expect(typeWithinLevel("event-stream", "intermediate")).toBe(false)
    // advanced level: everything
    expect(typeWithinLevel("compute", "advanced")).toBe(true)
    expect(typeWithinLevel("message-queue", "advanced")).toBe(true)
    expect(typeWithinLevel("event-stream", "advanced")).toBe(true)
  })
})
