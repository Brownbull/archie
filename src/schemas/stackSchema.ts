import { z } from "zod"

export const StackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  componentIds: z.array(z.string()),
  tags: z.array(z.string()),
}).strict()

export type Stack = z.infer<typeof StackSchema>
