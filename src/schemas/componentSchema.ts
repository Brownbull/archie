import { z } from "zod"
import { MetricValueSchema, MetricValueYamlSchema } from "@/schemas/metricSchema"

export const CodeSnippetSchema = z.object({
  language: z.string(),
  code: z.string(),
}).strict()

export const MetricExplanationSchema = z.object({
  reason: z.string(),
  contributingFactors: z.array(z.string()),
}).strict()

export const ConfigVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  metrics: z.array(MetricValueSchema),
  codeSnippet: CodeSnippetSchema.optional(),
  metricExplanations: z.record(z.string(), MetricExplanationSchema).optional(),
}).strict()

export const ConnectionPropertiesSchema = z.object({
  protocol: z.string(),
  communicationPatterns: z.array(z.string()),
  typicalLatency: z.string(),
  coLocationPotential: z.boolean(),
}).strict()

export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  is: z.string(),
  gain: z.array(z.string()).min(1),
  cost: z.array(z.string()).min(1),
  tags: z.array(z.string()),
  baseMetrics: z.array(MetricValueSchema),
  configVariants: z.array(ConfigVariantSchema).min(1),
  compatibility: z.record(z.string(), z.string()).optional(),
  connectionProperties: ConnectionPropertiesSchema.optional(),
}).strict()

// YAML input variant: accepts snake_case fields and transforms to camelCase
const ConfigVariantYamlSchema = z.object({
  id: z.string(),
  name: z.string(),
  metrics: z.array(MetricValueYamlSchema),
  code_snippet: CodeSnippetSchema.optional(),
  metric_explanations: z.record(z.string(), z.object({
    reason: z.string(),
    contributing_factors: z.array(z.string()),
  }).strict().transform((d) => ({
    reason: d.reason,
    contributingFactors: d.contributing_factors,
  }))).optional(),
}).strict().transform((data) => ({
  id: data.id,
  name: data.name,
  metrics: data.metrics,
  codeSnippet: data.code_snippet,
  metricExplanations: data.metric_explanations,
}))

const ConnectionPropertiesYamlSchema = z.object({
  protocol: z.string(),
  communication_patterns: z.array(z.string()),
  typical_latency: z.string(),
  co_location_potential: z.boolean(),
}).strict().transform((data) => ({
  protocol: data.protocol,
  communicationPatterns: data.communication_patterns,
  typicalLatency: data.typical_latency,
  coLocationPotential: data.co_location_potential,
}))

export const ComponentYamlSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  is: z.string(),
  gain: z.array(z.string()).min(1),
  cost: z.array(z.string()).min(1),
  tags: z.array(z.string()),
  base_metrics: z.array(MetricValueYamlSchema),
  config_variants: z.array(ConfigVariantYamlSchema).min(1),
  compatibility: z.record(z.string(), z.string()).optional(),
  connection_properties: ConnectionPropertiesYamlSchema.optional(),
}).strict().transform((data) => ({
  id: data.id,
  name: data.name,
  category: data.category,
  description: data.description,
  is: data.is,
  gain: data.gain,
  cost: data.cost,
  tags: data.tags,
  baseMetrics: data.base_metrics,
  configVariants: data.config_variants,
  compatibility: data.compatibility,
  connectionProperties: data.connection_properties,
}))

export type Component = z.infer<typeof ComponentSchema>
export type ConfigVariant = z.infer<typeof ConfigVariantSchema>
export type CodeSnippet = z.infer<typeof CodeSnippetSchema>
export type MetricExplanation = z.infer<typeof MetricExplanationSchema>
export type ConnectionProperties = z.infer<typeof ConnectionPropertiesSchema>
