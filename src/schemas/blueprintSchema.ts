import { z } from "zod"

export const BlueprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  tier: z.number().optional(),
}).strict()

// YAML input variant: identity transform (establishes pattern for future snake_case fields)
export const BlueprintYamlSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  tier: z.number().optional(),
}).strict().transform((data) => ({
  id: data.id,
  name: data.name,
  description: data.description,
  tier: data.tier,
}))

export type Blueprint = z.infer<typeof BlueprintSchema>
