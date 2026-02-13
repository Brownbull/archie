import { z } from "zod"

export const MetricValueSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  value: z.enum(["low", "medium", "high"]),
  numericValue: z.number().int().min(1).max(10),
  category: z.string().min(1),
}).strict()

export const MetricCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
}).strict()

// YAML input variant: accepts snake_case and transforms to camelCase
export const MetricValueYamlSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  value: z.enum(["low", "medium", "high"]),
  numeric_value: z.number().int().min(1).max(10),
  category: z.string().min(1),
}).strict().transform((data) => ({
  id: data.id,
  name: data.name,
  value: data.value,
  numericValue: data.numeric_value,
  category: data.category,
}))

export type MetricValue = z.infer<typeof MetricValueSchema>
export type MetricCategory = z.infer<typeof MetricCategorySchema>
