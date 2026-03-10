import { z } from "zod"
import { METRIC_CATEGORIES, MAX_STACK_COMPONENTS, MAX_STACK_CONNECTIONS, STACK_ID_MAX_LENGTH, STACK_ID_FORMAT, POSITION_MIN, POSITION_MAX } from "@/lib/constants"
import type { MetricCategoryId } from "@/lib/constants"

const METRIC_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id) as [MetricCategoryId, ...MetricCategoryId[]]

// --- Sub-schemas ---

// Defense-in-depth: numeric bounds prevent extreme float injection (matches architectureFileSchema pattern, TD-8-1a)
const PositionSchema = z.object({
  x: z.number().min(POSITION_MIN).max(POSITION_MAX),
  y: z.number().min(POSITION_MIN).max(POSITION_MAX),
}).strict()

export const StackComponentSchema = z.object({
  componentId: z.string().min(1).max(STACK_ID_MAX_LENGTH).regex(STACK_ID_FORMAT),
  variantId: z.string().min(1).max(STACK_ID_MAX_LENGTH).regex(STACK_ID_FORMAT),
  relativePosition: PositionSchema,
}).strict()

export const StackConnectionSchema = z.object({
  sourceComponentIndex: z.number().int().min(0),
  targetComponentIndex: z.number().int().min(0),
  connectionType: z.string().min(1).max(100),
}).strict()

export const StackCategoryScoreSchema = z.object({
  categoryId: z.enum(METRIC_CATEGORY_IDS),
  categoryName: z.string().min(1).max(100),
  score: z.number().min(0).max(10),
  metricCount: z.number().int().min(0),
  hasData: z.boolean(),
}).strict()

// --- Main schema ---

const StackDefinitionBaseSchema = z.object({
  id: z.string().min(1).max(STACK_ID_MAX_LENGTH).regex(STACK_ID_FORMAT),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  components: z.array(StackComponentSchema).min(1).max(MAX_STACK_COMPONENTS),
  connections: z.array(StackConnectionSchema).max(MAX_STACK_CONNECTIONS),
  tradeOffProfile: z.array(StackCategoryScoreSchema).max(METRIC_CATEGORIES.length),
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

export type Stack = StackDefinition

// --- YAML input variant: snake_case -> camelCase ---

const StackComponentYamlSchema = z.object({
  component_id: z.string().min(1).max(STACK_ID_MAX_LENGTH).regex(STACK_ID_FORMAT),
  variant_id: z.string().min(1).max(STACK_ID_MAX_LENGTH).regex(STACK_ID_FORMAT),
  relative_position: PositionSchema,
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
  id: z.string().min(1).max(STACK_ID_MAX_LENGTH).regex(STACK_ID_FORMAT),
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

// Pipe through StackDefinitionSchema to run superRefine cross-validation (connection index
// bounds, self-connections) on the transformed camelCase output.
export const StackDefinitionYamlSchema = StackDefinitionYamlBaseSchema.pipe(
  StackDefinitionSchema,
)
