import { z } from "zod"

export const StackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  componentIds: z.array(z.string()),
  tags: z.array(z.string()),
}).strict()

// YAML input variant: accepts snake_case and transforms to camelCase
export const StackYamlSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  component_ids: z.array(z.string()),
  tags: z.array(z.string()),
}).strict().transform((data) => ({
  id: data.id,
  name: data.name,
  description: data.description,
  componentIds: data.component_ids,
  tags: data.tags,
}))

export type Stack = z.infer<typeof StackSchema>
