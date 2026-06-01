import { describe, it, expect } from "vitest"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { TYPE_ICON_IDS, getTypeIconUrl } from "@/lib/typeIcons"
import { COMPONENT_TYPES } from "@/lib/componentTypes"

describe("typeIcons (logical-block icons)", () => {
  it("returns the relative icon URL for a known type, null otherwise", () => {
    expect(getTypeIconUrl("cache")).toBe("/icons/types/cache.png")
    expect(getTypeIconUrl("relational-db")).toBe("/icons/types/relational-db.png")
    expect(getTypeIconUrl("not-a-type")).toBeNull()
    expect(getTypeIconUrl("")).toBeNull()
  })

  it("stays in lockstep with the files in public/icons/types/ (no drift)", () => {
    const files = readdirSync(join(process.cwd(), "public/icons/types"))
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/\.png$/, ""))
      .sort()
    expect(files).toEqual([...TYPE_ICON_IDS].sort())
  })

  it("has an icon for every fundamental type (no missing/orphan)", () => {
    const typeIds = [...COMPONENT_TYPES.keys()].sort()
    expect([...TYPE_ICON_IDS].sort()).toEqual(typeIds)
  })
})
