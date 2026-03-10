import { z } from "zod"
import { METRIC_CATEGORIES, MAX_STACK_COMPONENTS, MAX_STACK_CONNECTIONS } from "@/lib/constants"
import type { MetricCategoryId } from "@/lib/constants"

const METRIC_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id) as [MetricCategoryId, ...MetricCategoryId[]]

// --- Sub-schemas ---

export const StackComponentSchema = z.object({
  componentId: z.string().min(1),
  variantId: z.string().min(1),
  relativePosition: z.object({
    x: z.number(),
    y: z.number(),
  }).strict(),
}).strict()

export const StackConnectionSchema = z.object({
  sourceComponentIndex: z.number().int().min(0),
  targetComponentIndex: z.number().int().min(0),
  connectionType: z.string().min(1),
}).strict()

export const StackCategoryScoreSchema = z.object({
  categoryId: z.enum(METRIC_CATEGORY_IDS),
  categoryName: z.string().min(1),
  score: z.number().min(0).max(10),
  metricCount: z.number().int().min(0),
  hasData: z.boolean(),
}).strict()

// --- Main schema ---

const StackDefinitionBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  components: z.array(StackComponentSchema).min(1).max(MAX_STACK_COMPONENTS),
  connections: z.array(StackConnectionSchema).max(MAX_STACK_CONNECTIONS),
  tradeOffProfile: z.array(StackCategoryScoreSchema),
}).strict()

export const StackDefinitionSchema = StackDefinitionBaseSchema.superRefine((data, ctx) => {
  const componentCount = data.components.length
  for (let i = 0; i < data.connections.length; i++) {
    const conn = data.connections[i]
    if (conn.sourceComponentIndex >= componentCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `connections[${i}].sourceComponentIndex (${conn.sourceComponentIndex}) exceeds components array length (${componentCount})`,
        path: ["connections", i, "sourceComponentIndex"],
      })
    }
    if (conn.targetComponentIndex >= componentCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `connections[${i}].targetComponentIndex (${conn.targetComponentIndex}) exceeds components array length (${componentCount})`,
        path: ["connections", i, "targetComponentIndex"],
      })
    }
    if (conn.sourceComponentIndex === conn.targetComponentIndex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `connections[${i}] is a self-connection (index ${conn.sourceComponentIndex})`,
        path: ["connections", i],
      })
    }
  }
})

export type StackDefinition = z.infer<typeof StackDefinitionSchema>

// Backward-compatibility aliases (stackRepository.ts imports these names)
export { StackDefinitionSchema as StackSchema }
export type Stack = StackDefinition

// --- YAML input variant: snake_case -> camelCase ---

const StackComponentYamlSchema = z.object({
  component_id: z.string().min(1),
  variant_id: z.string().min(1),
  relative_position: z.object({
    x: z.number(),
    y: z.number(),
  }).strict(),
}).strict().transform((d) => ({
  componentId: d.component_id,
  variantId: d.variant_id,
  relativePosition: d.relative_position,
}))

const StackConnectionYamlSchema = z.object({
  source_component_index: z.number().int().min(0),
  target_component_index: z.number().int().min(0),
  connection_type: z.string().min(1),
}).strict().transform((d) => ({
  sourceComponentIndex: d.source_component_index,
  targetComponentIndex: d.target_component_index,
  connectionType: d.connection_type,
}))

const StackCategoryScoreYamlSchema = z.object({
  category_id: z.enum(METRIC_CATEGORY_IDS),
  category_name: z.string().min(1),
  score: z.number().min(0).max(10),
  metric_count: z.number().int().min(0),
  has_data: z.boolean(),
}).strict().transform((d) => ({
  categoryId: d.category_id,
  categoryName: d.category_name,
  score: d.score,
  metricCount: d.metric_count,
  hasData: d.has_data,
}))

const StackDefinitionYamlBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  components: z.array(StackComponentYamlSchema).min(1).max(MAX_STACK_COMPONENTS),
  connections: z.array(StackConnectionYamlSchema).max(MAX_STACK_CONNECTIONS),
  trade_off_profile: z.array(StackCategoryScoreYamlSchema),
}).strict().transform((d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  components: d.components,
  connections: d.connections,
  tradeOffProfile: d.trade_off_profile,
}))

export const StackDefinitionYamlSchema = StackDefinitionYamlBaseSchema.pipe(
  StackDefinitionSchema,
)
