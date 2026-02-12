import { z } from "zod"

export const MetricValueSchema = z.object({
  id: z.string(),
  value: z.enum(["low", "medium", "high"]),
  numericValue: z.number().int().min(1).max(10),
  category: z.string(),
}).strict()

export const MetricCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
}).strict()

// YAML input variant: accepts snake_case and transforms to camelCase
export const MetricValueYamlSchema = z.object({
  id: z.string(),
  value: z.enum(["low", "medium", "high"]),
  numeric_value: z.number().int().min(1).max(10),
  category: z.string(),
}).strict().transform((data) => ({
  id: data.id,
  value: data.value,
  numericValue: data.numeric_value,
  category: data.category,
}))

export type MetricValue = z.infer<typeof MetricValueSchema>
export type MetricCategory = z.infer<typeof MetricCategorySchema>
