import { z } from "zod"
import { ArchitectureFileSchema, ArchitectureFileYamlSchema } from "@/schemas/architectureFileSchema"

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

/** Full blueprint with skeleton — what Firestore stores and componentLibrary caches */
export const BlueprintFullSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  tier: z.number().optional(),
  skeleton: ArchitectureFileSchema,
}).strict()

/**
 * YAML input variant for blueprints with skeleton.
 * Accepts snake_case skeleton fields (same format as user-exported YAML) and transforms to camelCase.
 * Used by the seed script to read blueprint YAML files from src/data/blueprints/.
 */
export const BlueprintFullYamlSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  tier: z.number().optional(),
  skeleton: ArchitectureFileYamlSchema,
}).strict().transform((data) => ({
  id: data.id,
  name: data.name,
  description: data.description,
  tier: data.tier,
  skeleton: data.skeleton,
}))

export type Blueprint = z.infer<typeof BlueprintSchema>
export type BlueprintFull = z.infer<typeof BlueprintFullSchema>
