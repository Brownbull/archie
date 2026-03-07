import { describe, it, expect } from "vitest"
import { getCategoryIcon, CATEGORY_ICONS } from "@/lib/categoryIcons"
import { METRIC_CATEGORIES } from "@/lib/constants"

describe("getCategoryIcon", () => {
  it("returns icon component for known icon name", () => {
    const icon = getCategoryIcon("Gauge")
    expect(icon).toBe(CATEGORY_ICONS.Gauge)
  })

  it("returns undefined for unknown icon name", () => {
    const icon = getCategoryIcon("NonExistentIcon")
    expect(icon).toBeUndefined()
  })

  it("returns icon for every METRIC_CATEGORIES iconName", () => {
    for (const cat of METRIC_CATEGORIES) {
      expect(getCategoryIcon(cat.iconName)).toBeDefined()
    }
  })
})
