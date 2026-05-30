import { describe, it, expect } from "vitest"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { COMPONENT_ICON_IDS, getComponentIconUrl } from "@/lib/componentIcons"

describe("componentIcons (Epic 17 polish)", () => {
  it("returns the relative icon URL for a component with a pixel icon", () => {
    expect(getComponentIconUrl("postgresql")).toBe("/icons/postgresql.png")
    expect(getComponentIconUrl("redis")).toBe("/icons/redis.png")
  })

  it("returns null for a component without a pixel icon (→ category fallback)", () => {
    expect(getComponentIconUrl("unknown-component")).toBeNull()
    expect(getComponentIconUrl("")).toBeNull()
  })

  it("stays in lockstep with the files in public/icons/ (no drift)", () => {
    const files = readdirSync(join(process.cwd(), "public/icons"))
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/\.png$/, ""))
      .sort()
    expect(files).toEqual([...COMPONENT_ICON_IDS].sort())
  })

  it("there is an icon for every authored component (and no orphan icons)", () => {
    const components = readdirSync(join(process.cwd(), "src/data/components"))
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => f.replace(/\.yaml$/, ""))
      .sort()
    expect([...COMPONENT_ICON_IDS].sort()).toEqual(components)
  })
})
