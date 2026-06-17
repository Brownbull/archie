import { describe, it, expect } from "vitest"
import { aggregateScoreGloss } from "@/lib/scoreGlosses"

describe("aggregateScoreGloss (S1d)", () => {
  it("returns an excellent reading for high scores", () => {
    expect(aggregateScoreGloss(9.2)).toMatch(/excellent/i)
  })

  it("returns a fragile reading for low scores", () => {
    expect(aggregateScoreGloss(1.0)).toMatch(/fragile/i)
  })

  it("names the weakest category as the bottleneck when below excellent", () => {
    const gloss = aggregateScoreGloss(6.0, "Reliability")
    expect(gloss).toMatch(/reliability is your weakest area/i)
  })

  it("does NOT append a bottleneck when the score is already excellent", () => {
    const gloss = aggregateScoreGloss(9.0, "Reliability")
    expect(gloss).not.toMatch(/weakest area/i)
    expect(gloss).toMatch(/excellent/i)
  })

  it("clamps out-of-range scores without throwing", () => {
    expect(() => aggregateScoreGloss(-5)).not.toThrow()
    expect(() => aggregateScoreGloss(99)).not.toThrow()
    expect(aggregateScoreGloss(99)).toMatch(/excellent/i)
  })
})
