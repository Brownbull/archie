import { z } from "zod"

export const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tier: z.number().optional(),
}).strict()

export type Blueprint = z.infer<typeof BlueprintSchema>
