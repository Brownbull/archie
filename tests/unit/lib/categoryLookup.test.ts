import { describe, it, expect } from "vitest"
import { CATEGORY_LOOKUP } from "@/lib/categoryLookup"
import { METRIC_CATEGORIES } from "@/lib/constants"

describe("CATEGORY_LOOKUP", () => {
  it("contains an entry for every METRIC_CATEGORIES item", () => {
    expect(CATEGORY_LOOKUP.size).toBe(METRIC_CATEGORIES.length)
  })

  it("each category id resolves to its source entry", () => {
    for (const cat of METRIC_CATEGORIES) {
      expect(CATEGORY_LOOKUP.get(cat.id)).toBe(cat)
    }
  })

  it("returns undefined for an unknown category id", () => {
    expect(CATEGORY_LOOKUP.get("nonexistent" as never)).toBeUndefined()
  })
})
