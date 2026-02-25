import { z } from "zod"

// Covers the canonical 3-tier boundary pattern (maxScore=3.99, next minScore=4, gap=0.01)
const RANGE_GAP_EPSILON = 0.02

export const ScoreInterpretationSchema = z.object({
  minScore: z.number().min(0).max(10),
  maxScore: z.number().min(0).max(10),
  text: z.string().min(1),
}).strict().refine((si) => si.minScore < si.maxScore, {
  message: "minScore must be less than maxScore",
})

export const MetricCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  whyItMatters: z.string().min(1),
  icon: z.string().min(1),
  scoreInterpretations: z.array(ScoreInterpretationSchema).min(1),
}).strict().refine(
  (cat) => {
    const sorted = [...cat.scoreInterpretations].sort((a, b) => a.minScore - b.minScore)
    if (sorted.length === 0) return false
    if (sorted[0].minScore !== 0) return false
    if (sorted[sorted.length - 1].maxScore !== 10) return false
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].minScore - sorted[i - 1].maxScore
      if (gap > RANGE_GAP_EPSILON) return false
      if (gap < -RANGE_GAP_EPSILON) return false
    }
    return true
  },
  {
    message: "scoreInterpretations must cover [0, 10] contiguously without gaps or overlaps",
  },
)

export type ScoreInterpretation = z.infer<typeof ScoreInterpretationSchema>
export type MetricCategory = z.infer<typeof MetricCategorySchema>
