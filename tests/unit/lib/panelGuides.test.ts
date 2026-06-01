import { describe, it, expect } from "vitest"
import { getPanelGuide, visiblePoints, type PanelGuide } from "@/lib/panelGuides"

const ALL_IDS = ["toolbox", "inspector", "optimize", "tier"]

describe("panelGuides (P89/Phase B)", () => {
  it("resolves known guides and returns undefined for unknown ids", () => {
    for (const id of ALL_IDS) expect(getPanelGuide(id)?.id).toBe(id)
    expect(getPanelGuide("nope")).toBeUndefined()
  })

  it("every guide has a title, summary and at least one point", () => {
    for (const id of ALL_IDS) {
      const g = getPanelGuide(id) as PanelGuide
      expect(g.title.length).toBeGreaterThan(0)
      expect(g.summary.length).toBeGreaterThan(0)
      expect(g.points.length).toBeGreaterThan(0)
    }
  })

  it("tour steps (when present) anchor to non-empty selectors", () => {
    for (const id of ALL_IDS) {
      const g = getPanelGuide(id) as PanelGuide
      for (const step of g.tour ?? []) {
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.body.length).toBeGreaterThan(0)
        if (step.selector !== undefined) expect(step.selector).toMatch(/data-testid/)
      }
    }
  })

  it("visiblePoints discloses progressively: beginner ≤ intermediate ≤ advanced", () => {
    const g = getPanelGuide("toolbox") as PanelGuide
    const b = visiblePoints(g, "beginner").length
    const i = visiblePoints(g, "intermediate").length
    const a = visiblePoints(g, "advanced").length
    expect(b).toBeLessThan(a) // toolbox guide has level-gated points
    expect(b).toBeLessThanOrEqual(i)
    expect(i).toBeLessThanOrEqual(a)
    // Advanced sees every point.
    expect(a).toBe(g.points.length)
  })

  it("a point with no minLevel always shows (even at beginner)", () => {
    const g = getPanelGuide("inspector") as PanelGuide
    const beginnerPoints = visiblePoints(g, "beginner")
    expect(beginnerPoints.length).toBeGreaterThan(0)
    expect(beginnerPoints.every((p) => p.minLevel === undefined || p.minLevel === "beginner")).toBe(true)
  })
})
