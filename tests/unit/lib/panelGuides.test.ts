import { describe, it, expect } from "vitest"
import { getPanelGuide, visiblePoints, FULL_JOURNEY, type PanelGuide } from "@/lib/panelGuides"

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

  it("the inspector tour is comprehensive — walks every major section", () => {
    const g = getPanelGuide("inspector") as PanelGuide
    const selectors = (g.tour ?? []).map((s) => s.selector ?? "").join(" ")
    // Fluidity P3c: the inspector is read-only learning — tuning moved to the on-node controls, so the
    // tour points at the block for tuning (archie-node-provider) + walks the learning sections.
    expect((g.tour ?? []).length).toBeGreaterThanOrEqual(10)
    for (const anchor of [
      "archie-node-provider",
      "economics-section",
      "disclosure-code",
      "disclosure-gains",
      "disclosure-costs",
      "disclosure-metrics",
      "data-context-section-trigger",
    ]) {
      expect(selectors).toContain(anchor)
    }
    // The removed Phase-1 tuners must NOT reappear in the guide.
    expect(selectors).not.toContain("component-swapper")
    expect(selectors).not.toContain("config-selector")
  })

  it("the toolbox + optimize tours cover their tabs/sections", () => {
    const tb = getPanelGuide("toolbox") as PanelGuide
    const tbSel = (tb.tour ?? []).map((s) => s.selector ?? "").join(" ")
    for (const a of ["search-filter", "toolbox-tab-stacks", "toolbox-tab-blueprints", "advanced-blocks-toggle"]) {
      expect(tbSel).toContain(a)
    }
    const opt = getPanelGuide("optimize") as PanelGuide
    const optSel = (opt.tour ?? []).map((s) => s.selector ?? "").join(" ")
    for (const a of ["weight-sliders-toggle", "constraint-guardrails-toggle", "pathway-guidance-toggle"]) {
      expect(optSel).toContain(a)
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

  it("the full journey is a curated cross-region walk anchored to real testids", () => {
    expect(FULL_JOURNEY.length).toBeGreaterThanOrEqual(6)
    // Opens with a centered intro (no anchor), then walks each region.
    expect(FULL_JOURNEY[0]?.selector).toBeUndefined()
    const selectors = FULL_JOURNEY.map((s) => s.selector ?? "").join(" ")
    for (const anchor of [
      "toolbox",
      "canvas",
      "archie-node-provider", // on-block tuning (tier-gated → DOM-filtered when locked)
      "inspector-panel",
      "test-conditions",
      "dashboard",
      "tier-badge",
    ]) {
      expect(selectors).toContain(anchor)
    }
    for (const s of FULL_JOURNEY) {
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.body.length).toBeGreaterThan(0)
      if (s.selector !== undefined) expect(s.selector).toMatch(/data-testid/)
    }
  })

  it("a point with no minLevel always shows (even at beginner)", () => {
    const g = getPanelGuide("inspector") as PanelGuide
    const beginnerPoints = visiblePoints(g, "beginner")
    expect(beginnerPoints.length).toBeGreaterThan(0)
    expect(beginnerPoints.every((p) => p.minLevel === undefined || p.minLevel === "beginner")).toBe(true)
  })
})
