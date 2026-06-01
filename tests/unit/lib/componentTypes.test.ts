import { describe, it, expect } from "vitest"
import {
  COMPONENT_TYPES,
  groupComponentsByType,
  providersForComponent,
  typeMatchesQuery,
  componentGroupKey,
} from "@/lib/componentTypes"
import type { Component } from "@/schemas/componentSchema"

const comp = (over: Partial<Component> & Pick<Component, "id">): Component => ({
  name: over.id,
  category: "data-storage",
  description: "d",
  is: "i",
  gain: ["g"],
  cost: ["c"],
  tags: [],
  baseMetrics: [],
  configVariants: [{ id: "default", name: "Default", metrics: [] }],
  ...over,
})

describe("componentTypes (P5)", () => {
  describe("COMPONENT_TYPES registry", () => {
    it("includes the marquee fundamental types mapped to real categories", () => {
      expect(COMPONENT_TYPES.get("cdn")?.category).toBe("delivery-network")
      expect(COMPONENT_TYPES.get("cache")?.label).toBe("Cache")
      expect(COMPONENT_TYPES.get("relational-db")?.category).toBe("data-storage")
    })
  })

  describe("componentGroupKey", () => {
    it("uses typeId when present, else a category fallback key", () => {
      expect(componentGroupKey({ typeId: "cache", category: "caching" })).toBe("cache")
      expect(componentGroupKey({ typeId: undefined, category: "caching" })).toBe("category:caching")
    })
  })

  describe("groupComponentsByType", () => {
    it("groups providers under their fundamental type with the registry label", () => {
      const groups = groupComponentsByType([
        comp({ id: "postgresql", typeId: "relational-db" }),
        comp({ id: "mysql", typeId: "relational-db" }),
        comp({ id: "redis", typeId: "cache", category: "caching" }),
      ])
      const rel = groups.find((g) => g.key === "relational-db")
      expect(rel?.typeId).toBe("relational-db")
      expect(rel?.label).toBe("SQL Database")
      expect(rel?.providers.map((p) => p.id)).toEqual(["postgresql", "mysql"])
      expect(groups.find((g) => g.key === "cache")?.providers).toHaveLength(1)
    })

    it("falls back to a per-category group for components without a typeId (pre-seed)", () => {
      const groups = groupComponentsByType([comp({ id: "legacy", category: "caching" })])
      expect(groups).toHaveLength(1)
      expect(groups[0].typeId).toBeNull()
      expect(groups[0].key).toBe("category:caching")
      expect(groups[0].label).toBe("Caching") // resolved from COMPONENT_CATEGORIES
    })
  })

  describe("providersForComponent", () => {
    const all = [
      comp({ id: "redis", typeId: "cache", category: "caching" }),
      comp({ id: "memcached", typeId: "cache", category: "caching" }),
      comp({ id: "postgresql", typeId: "relational-db" }),
    ]

    it("returns sibling providers sharing the typeId", () => {
      const redis = all[0]
      expect(providersForComponent(redis, all).map((c) => c.id)).toEqual(["redis", "memcached"])
    })

    it("falls back to same-category components when the component has no typeId", () => {
      const legacy = comp({ id: "legacy", category: "caching", typeId: undefined })
      const pool = [...all, legacy]
      // same category 'caching' → redis, memcached, legacy
      expect(providersForComponent(legacy, pool).map((c) => c.id).sort()).toEqual(["legacy", "memcached", "redis"])
    })
  })

  describe("typeMatchesQuery", () => {
    it("matches by type label and synonym, case-insensitively", () => {
      expect(typeMatchesQuery({ typeId: "load-balancer" }, "lb")).toBe(true)
      expect(typeMatchesQuery({ typeId: "cache" }, "redis")).toBe(true)
      expect(typeMatchesQuery({ typeId: "relational-db" }, "relational")).toBe(true)
    })

    it("is false when the component has no typeId or no synonym matches", () => {
      expect(typeMatchesQuery({ typeId: undefined }, "cache")).toBe(false)
      expect(typeMatchesQuery({ typeId: "cache" }, "kubernetes")).toBe(false)
    })
  })
})
