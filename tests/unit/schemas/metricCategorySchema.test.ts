import { describe, it, expect } from "vitest"
import {
  MetricCategorySchema,
  ScoreInterpretationSchema,
} from "@/schemas/metricCategorySchema"

const validScoreInterpretation = {
  minScore: 0,
  maxScore: 3.99,
  text: "Critical: Your architecture shows significant gaps in this area.",
}

const validCategory = {
  id: "performance",
  name: "Performance",
  description: "Measures response times, throughput, and resource utilization.",
  whyItMatters: "Performance directly impacts user experience and operational cost.",
  icon: "Gauge",
  scoreInterpretations: [
    { minScore: 0, maxScore: 3.99, text: "Critical: significant gaps." },
    { minScore: 4, maxScore: 6.99, text: "Moderate: room for improvement." },
    { minScore: 7, maxScore: 10, text: "Strong: well-optimized architecture." },
  ],
}

describe("ScoreInterpretationSchema", () => {
  it("accepts valid score interpretation", () => {
    const result = ScoreInterpretationSchema.safeParse(validScoreInterpretation)
    expect(result.success).toBe(true)
  })

  it("rejects missing minScore", () => {
    const result = ScoreInterpretationSchema.safeParse({
      maxScore: 3.99,
      text: "Critical",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing text", () => {
    const result = ScoreInterpretationSchema.safeParse({
      minScore: 0,
      maxScore: 3.99,
    })
    expect(result.success).toBe(false)
  })

  it("rejects extra fields (strict mode)", () => {
    const result = ScoreInterpretationSchema.safeParse({
      ...validScoreInterpretation,
      extraField: "not allowed",
    })
    expect(result.success).toBe(false)
  })

  it("rejects minScore >= maxScore", () => {
    const result = ScoreInterpretationSchema.safeParse({
      minScore: 5,
      maxScore: 5,
      text: "Equal range",
    })
    expect(result.success).toBe(false)
  })

  it("rejects scores outside 0-10 range", () => {
    const result = ScoreInterpretationSchema.safeParse({
      minScore: -1,
      maxScore: 11,
      text: "Out of range",
    })
    expect(result.success).toBe(false)
  })
})

describe("MetricCategorySchema", () => {
  it("accepts valid metric category", () => {
    const result = MetricCategorySchema.safeParse(validCategory)
    expect(result.success).toBe(true)
  })

  it("rejects missing id", () => {
    const { id: _, ...noId } = validCategory
    const result = MetricCategorySchema.safeParse(noId)
    expect(result.success).toBe(false)
  })

  it("rejects missing description", () => {
    const { description: _, ...noDesc } = validCategory
    const result = MetricCategorySchema.safeParse(noDesc)
    expect(result.success).toBe(false)
  })

  it("rejects missing whyItMatters", () => {
    const { whyItMatters: _, ...noWhy } = validCategory
    const result = MetricCategorySchema.safeParse(noWhy)
    expect(result.success).toBe(false)
  })

  it("rejects empty scoreInterpretations array", () => {
    const result = MetricCategorySchema.safeParse({
      ...validCategory,
      scoreInterpretations: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects extra fields (strict mode)", () => {
    const result = MetricCategorySchema.safeParse({
      ...validCategory,
      unknownField: "should fail",
    })
    expect(result.success).toBe(false)
  })

  it("inferred type matches expected shape", () => {
    const result = MetricCategorySchema.safeParse(validCategory)
    if (!result.success) throw new Error("Parse failed")
    const data = result.data

    // Type-level assertions — these would fail TypeScript compilation if wrong
    const _id: string = data.id
    const _name: string = data.name
    const _desc: string = data.description
    const _why: string = data.whyItMatters
    const _icon: string = data.icon
    const _interps: Array<{ minScore: number; maxScore: number; text: string }> =
      data.scoreInterpretations

    // Suppress unused variable warnings
    void [_id, _name, _desc, _why, _icon, _interps]

    expect(data.id).toBe("performance")
    expect(data.scoreInterpretations).toHaveLength(3)
  })

  it("rejects scoreInterpretations with a gap between ranges", () => {
    const result = MetricCategorySchema.safeParse({
      ...validCategory,
      scoreInterpretations: [
        { minScore: 0, maxScore: 3, text: "Low" },
        { minScore: 5, maxScore: 10, text: "High" },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects scoreInterpretations with overlapping ranges", () => {
    const result = MetricCategorySchema.safeParse({
      ...validCategory,
      scoreInterpretations: [
        { minScore: 0, maxScore: 5, text: "Low" },
        { minScore: 3, maxScore: 10, text: "High" },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects scoreInterpretations that do not start at 0", () => {
    const result = MetricCategorySchema.safeParse({
      ...validCategory,
      scoreInterpretations: [
        { minScore: 1, maxScore: 5, text: "Mid" },
        { minScore: 5, maxScore: 10, text: "High" },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects scoreInterpretations that do not end at 10", () => {
    const result = MetricCategorySchema.safeParse({
      ...validCategory,
      scoreInterpretations: [
        { minScore: 0, maxScore: 5, text: "Low" },
        { minScore: 5, maxScore: 9, text: "High" },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("accepts scoreInterpretations with 3.99/4 boundary pattern (epsilon tolerance)", () => {
    const result = MetricCategorySchema.safeParse({
      ...validCategory,
      scoreInterpretations: [
        { minScore: 0, maxScore: 3.99, text: "Critical" },
        { minScore: 4, maxScore: 6.99, text: "Moderate" },
        { minScore: 7, maxScore: 10, text: "Strong" },
      ],
    })
    expect(result.success).toBe(true)
  })
})
