import { z } from "zod"
import { METRIC_CATEGORIES, WEIGHT_MIN, WEIGHT_MAX, DEFAULT_WEIGHT_PROFILE, MAX_CANVAS_NODES, MAX_EDGES, POSITION_MIN, POSITION_MAX, CONSTRAINT_THRESHOLD_MIN, CONSTRAINT_THRESHOLD_MAX, CONSTRAINT_LABEL_MAX_LENGTH, MAX_CONSTRAINTS, type MetricCategoryId } from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"

// Static assertion: WeightProfileSchema is built from METRIC_CATEGORIES at module load.
// If the count changes, the schema shape silently diverges from expectations. (TD-5-1a)
if (METRIC_CATEGORIES.length !== 7) {
  throw new Error(
    `METRIC_CATEGORIES length changed to ${METRIC_CATEGORIES.length} (expected 7). ` +
    `Update WeightProfileSchema and this assertion.`,
  )
}

export const CURRENT_SCHEMA_VERSION = "2.0.0"

// Weight profile Zod schema: one explicit key per metric category (AC-ARCH-PATTERN-2)
// Uses z.object() NOT z.record() for precise per-field validation errors (AC-ARCH-NO-1)
export const WeightProfileSchema = z.object(
  Object.fromEntries(
    METRIC_CATEGORIES.map((c) => [c.id, z.number().min(WEIGHT_MIN).max(WEIGHT_MAX)]),
  ) as Record<(typeof METRIC_CATEGORIES)[number]["id"], z.ZodNumber>,
).strict()

// Constraint Zod schema: validates constraint definitions in architecture files (Story 6-1 AC-2)
// Uses z.array(z.object()) NOT z.record() for ordered, typed entries (AC-ARCH-NO-2)
// Label sanitized via sanitizeDisplayString (defense-in-depth: 6-layer pipeline from src/lib/sanitize.ts)
const metricCategoryIds = METRIC_CATEGORIES.map((c) => c.id) as [MetricCategoryId, ...MetricCategoryId[]]

// Shared constraint fields: operator, threshold, label — single definition for DRY (TD-6-4b AC-1)
export const constraintBaseFields = {
  operator: z.enum(["lte", "gte"]),
  threshold: z.number().min(CONSTRAINT_THRESHOLD_MIN).max(CONSTRAINT_THRESHOLD_MAX),
  label: z.string().transform((s) => sanitizeDisplayString(s, CONSTRAINT_LABEL_MAX_LENGTH)),
}

export const ConstraintSchema = z.object({
  categoryId: z.enum(metricCategoryIds),
  ...constraintBaseFields,
}).strict()

// ─── YAML-Variant Schemas ─────────────────────────────────────────────────────
// These schemas accept snake_case YAML input and transform to camelCase output.
// They are used exclusively in importYamlString (ArchitectureFileYamlSchema.safeParse).
// Canonical camelCase schemas above are the source of truth for app types.

// YAML input variant for constraints: snake_case → camelCase transform (AC-ARCH-PATTERN-5)
// sanitizeDisplayString is idempotent for clean strings (strips HTML once, subsequent passes are no-ops).
// Round-trip re-import: export emits the already-sanitized label → re-import sanitizes again → same result.
const ConstraintYamlSchema = z.object({
  category_id: z.enum(metricCategoryIds),
  ...constraintBaseFields,
}).strict().transform((data) => ({
  categoryId: data.category_id,
  operator: data.operator,
  threshold: data.threshold,
  label: data.label,
}))

// v1-to-v2 migration: adds default weightProfile (AC-ARCH-PATTERN-3 — pure function)
// Called on post-transform camelCase data (after ArchitectureFileYamlSchema.safeParse)
function migrateV1ToV2(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    throw new Error("Migration input must be an object")
  }
  return {
    ...(data as Record<string, unknown>),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
    // v2 shape: constraints did not exist in v1 — explicitly undefined to document the full v2 contract.
    // Note: explicit undefined means `'constraints' in obj` returns true. All downstream code
    // uses nullish access (data.constraints ?? []), so this is safe.
    constraints: undefined,
  }
}

export const MIGRATIONS: Record<string, (data: unknown) => unknown> = {
  "1": migrateV1ToV2,
}

// Defense-in-depth: numeric bounds prevent extreme float injection from malicious YAML (TD-5-1b)
const PositionSchema = z.object({
  x: z.number().min(POSITION_MIN).max(POSITION_MAX),
  y: z.number().min(POSITION_MIN).max(POSITION_MAX),
}).strict()

// Defense-in-depth: max string length prevents memory exhaustion from malformed YAML (TD-5-1a)
const MAX_STRING_LENGTH = 256

export const ArchitectureFileNodeSchema = z.object({
  id: z.string().min(1).max(MAX_STRING_LENGTH),
  componentId: z.string().min(1).max(MAX_STRING_LENGTH),
  configVariantId: z.string().min(1).max(MAX_STRING_LENGTH).optional(),
  position: PositionSchema,
}).strict()

export const ArchitectureFileEdgeSchema = z.object({
  id: z.string().min(1).max(MAX_STRING_LENGTH),
  sourceNodeId: z.string().min(1).max(MAX_STRING_LENGTH),
  targetNodeId: z.string().min(1).max(MAX_STRING_LENGTH),
}).strict()

export const ArchitectureFileSchema = z.object({
  schemaVersion: z.string().min(1).max(MAX_STRING_LENGTH),
  libraryVersion: z.string().max(MAX_STRING_LENGTH).optional(),
  name: z.string().max(MAX_STRING_LENGTH).optional(),
  nodes: z.array(ArchitectureFileNodeSchema).max(MAX_CANVAS_NODES),
  edges: z.array(ArchitectureFileEdgeSchema).max(MAX_EDGES),
  weightProfile: WeightProfileSchema.optional(),
  constraints: z.array(ConstraintSchema).max(MAX_CONSTRAINTS).optional(),
}).strict()

// YAML input variant: accepts snake_case fields and transforms to camelCase
const ArchitectureFileNodeYamlSchema = z.object({
  id: z.string().min(1).max(MAX_STRING_LENGTH),
  component_id: z.string().min(1).max(MAX_STRING_LENGTH),
  config_variant_id: z.string().min(1).max(MAX_STRING_LENGTH).optional(),
  position: PositionSchema,
}).strict().transform((data) => ({
  id: data.id,
  componentId: data.component_id,
  configVariantId: data.config_variant_id,
  position: data.position,
}))

const ArchitectureFileEdgeYamlSchema = z.object({
  id: z.string().min(1).max(MAX_STRING_LENGTH),
  source_node_id: z.string().min(1).max(MAX_STRING_LENGTH),
  target_node_id: z.string().min(1).max(MAX_STRING_LENGTH),
}).strict().transform((data) => ({
  id: data.id,
  sourceNodeId: data.source_node_id,
  targetNodeId: data.target_node_id,
}))

export const ArchitectureFileYamlSchema = z.object({
  schema_version: z.string().min(1).max(MAX_STRING_LENGTH),
  library_version: z.string().max(MAX_STRING_LENGTH).optional(),
  name: z.string().max(MAX_STRING_LENGTH).optional(),
  nodes: z.array(ArchitectureFileNodeYamlSchema).max(MAX_CANVAS_NODES),
  edges: z.array(ArchitectureFileEdgeYamlSchema).max(MAX_EDGES),
  weight_profile: WeightProfileSchema.optional(),
  constraints: z.array(ConstraintYamlSchema).max(MAX_CONSTRAINTS).optional(),
}).strict().transform((data) => ({
  schemaVersion: data.schema_version,
  libraryVersion: data.library_version,
  name: data.name,
  nodes: data.nodes,
  edges: data.edges,
  weightProfile: data.weight_profile,
  constraints: data.constraints,
}))

export type ArchitectureFile = z.infer<typeof ArchitectureFileSchema>
export type ArchitectureFileNode = z.infer<typeof ArchitectureFileNodeSchema>
export type ArchitectureFileEdge = z.infer<typeof ArchitectureFileEdgeSchema>

/** Discriminated union for schema version check results */
export type VersionStatus =
  | { status: "compatible" }
  | { status: "too-new" }
  | { status: "migrate"; migrationKey: number }
  | { status: "too-old" }
  | { status: "invalid-format"; reason: string }

/**
 * Compares a file's schema version against the app's current version.
 * Uses major-version-only comparison by design — minor/patch are informational.
 * Non-numeric minor/patch segments (e.g., "2.x.y") are ignored intentionally.
 * Returns a discriminated union so callers get exhaustive TypeScript checking.
 */
export function checkSchemaVersion(
  fileVersion: string,
  appVersion: string,
): VersionStatus {
  const fileParts = fileVersion.split(".").map(Number)
  const appParts = appVersion.split(".").map(Number)
  const fileMajor = fileParts[0]
  const appMajor = appParts[0]

  if (fileMajor === undefined || isNaN(fileMajor)) {
    return { status: "invalid-format", reason: `Invalid file schema version: "${fileVersion}"` }
  }
  if (appMajor === undefined || isNaN(appMajor)) {
    return { status: "invalid-format", reason: `Invalid app schema version: "${appVersion}"` }
  }

  if (fileMajor === appMajor) return { status: "compatible" }
  if (fileMajor > appMajor) return { status: "too-new" }

  // File is older major — check for migration
  const migrationKey = String(fileMajor)
  if (migrationKey in MIGRATIONS) return { status: "migrate", migrationKey: fileMajor }
  return { status: "too-old" }
}
