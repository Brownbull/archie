import { describe, it, expect } from "vitest"
import { getTypeLucideIcon, getTabLucideIcon } from "@/icons/officialTypeIcons"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import type { ToolboxTab } from "@/stores/uiStore"

describe("officialTypeIcons", () => {
  it("maps every fundamental logical type to a Lucide icon", () => {
    const missing = [...COMPONENT_TYPES.keys()].filter((id) => !getTypeLucideIcon(id))
    expect(missing).toEqual([])
  })

  it("returns undefined for an unknown type id (caller keeps the concept loop)", () => {
    expect(getTypeLucideIcon("not-a-real-type")).toBeUndefined()
  })

  it("maps every toolbox tab to a Lucide icon", () => {
    const tabs: ToolboxTab[] = ["components", "stacks", "blueprints", "history"]
    tabs.forEach((tab) => {
      expect(getTabLucideIcon(tab)).toBeTruthy()
    })
  })
})
