import { describe, it, expect } from "vitest"
import {
  CATEGORY_SCALING_RULES,
  getScalingRule,
  COMPONENT_CATEGORIES,
  MIN_REPLICAS,
  MAX_REPLICAS,
  type ComponentCategoryId,
} from "@/lib/constants"

describe("CATEGORY_SCALING_RULES (Epic 14)", () => {
  it("defines a rule for every component category", () => {
    const categoryIds = Object.keys(COMPONENT_CATEGORIES) as ComponentCategoryId[]
    for (const id of categoryIds) {
      expect(CATEGORY_SCALING_RULES[id]).toBeDefined()
    }
    expect(Object.keys(CATEGORY_SCALING_RULES).sort()).toEqual([...categoryIds].sort())
  })

  it("marks compute as full-scaling and LB-requiring", () => {
    expect(CATEGORY_SCALING_RULES.compute).toEqual({
      scalable: true,
      replicaType: "full",
      requiresUpstreamLB: true,
      actsAsLoadBalancer: false,
    })
  })

  it("marks data-storage and search replicas as read-only", () => {
    expect(CATEGORY_SCALING_RULES["data-storage"].replicaType).toBe("read-only")
    expect(CATEGORY_SCALING_RULES["data-storage"].requiresUpstreamLB).toBe(false)
    expect(CATEGORY_SCALING_RULES.search.replicaType).toBe("read-only")
  })

  it("marks delivery-network as a load balancer and nothing else", () => {
    const lbCategories = (Object.keys(CATEGORY_SCALING_RULES) as ComponentCategoryId[]).filter(
      (id) => CATEGORY_SCALING_RULES[id].actsAsLoadBalancer,
    )
    expect(lbCategories).toEqual(["delivery-network"])
  })

  it("marks monitoring and devops as non-scalable singletons", () => {
    for (const id of ["monitoring", "devops"] as const) {
      expect(CATEGORY_SCALING_RULES[id]).toMatchObject({ scalable: false, replicaType: "none" })
    }
  })

  it("only compute / real-time / auth-security require an upstream LB", () => {
    const requiring = (Object.keys(CATEGORY_SCALING_RULES) as ComponentCategoryId[]).filter(
      (id) => CATEGORY_SCALING_RULES[id].requiresUpstreamLB,
    )
    expect(requiring.sort()).toEqual(["auth-security", "compute", "real-time"])
  })
})

describe("getScalingRule", () => {
  it("returns the rule for a known category", () => {
    expect(getScalingRule("caching")).toEqual(CATEGORY_SCALING_RULES.caching)
  })

  it("returns a safe non-scalable default for an unknown category", () => {
    expect(getScalingRule("not-a-category" as ComponentCategoryId)).toEqual({
      scalable: false,
      replicaType: "none",
      requiresUpstreamLB: false,
      actsAsLoadBalancer: false,
    })
  })
})

describe("replica bounds", () => {
  it("MIN_REPLICAS is 1 and MAX_REPLICAS is 20", () => {
    expect(MIN_REPLICAS).toBe(1)
    expect(MAX_REPLICAS).toBe(20)
  })
})
