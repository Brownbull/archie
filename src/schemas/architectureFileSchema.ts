import { z } from "zod"
import { METRIC_CATEGORIES, WEIGHT_MIN, WEIGHT_MAX, DEFAULT_WEIGHT_PROFILE, MAX_CANVAS_NODES, MAX_EDGES, MIN_REPLICAS, MAX_REPLICAS, POSITION_MIN, POSITION_MAX, CONSTRAINT_THRESHOLD_MIN, CONSTRAINT_THRESHOLD_MAX, CONSTRAINT_LABEL_MAX_LENGTH, MAX_CONSTRAINTS, DATA_CONTEXT_NAME_MAX_LENGTH, MAX_DATA_CONTEXT_ITEMS_PER_NODE, ACCESS_PATTERN_VALUES, DATA_SIZE_VALUES, STRUCTURE_TYPE_VALUES, MAX_SCHEMA_STRING_LENGTH, SCENARIO_ID_FORMAT, type MetricCategoryId, type ConstraintOperator, type PortDefinition, } from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"
import { resolvePortPair } from "@/engine/portResolution"

// Static assertion: WeightProfileSchema is built from METRIC_CATEGORIES at module load.
// If the count changes, the schema shape silently diverges from expectations. (TD-5-1a)
if (METRIC_CATEGORIES.length !== 7) {
  throw new Error(
    `METRIC_CATEGORIES length changed to ${METRIC_CATEGORIES.length} (expected 7). ` +
    `Update WeightProfileSchema and this assertion.`,
  )
}

export const CURRENT_SCHEMA_VERSION = "4.0.0"

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
// ConstraintOperator type in constants.ts must stay in sync with this enum.
export const constraintBaseFields = {
  operator: z.enum(["lte", "gte"] satisfies [ConstraintOperator, ...ConstraintOperator[]]),
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
    // v2 shape: dataContext is per-node (ArchitectureFileNodeSchema.dataContext), not top-level.
    // v1 nodes cannot have data_context (schema .strict() rejects unknown keys).
    // No migration needed — absent field defaults to undefined via schema .optional().
  }
}

/**
 * Port resolver for v2→v3 migration. Returns port definitions for a componentId.
 * Injected by the importer to avoid circular dependency on componentLibrary.
 */
export type PortResolver = (componentId: string) => PortDefinition[] | undefined

let _portResolver: PortResolver | undefined

export function setPortResolver(resolver: PortResolver): void {
  _portResolver = resolver
}

function migrateV2ToV3(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    throw new Error("Migration input must be an object")
  }
  const d = data as Record<string, unknown>
  const nodes = d.nodes as Array<Record<string, unknown>> | undefined
  const edges = d.edges as Array<Record<string, unknown>> | undefined

  if (!nodes || !edges) {
    return { ...d, schemaVersion: "3.0.0" }
  }

  const nodeComponentMap = new Map<string, string>()
  for (const node of nodes) {
    if (typeof node.id === "string" && typeof node.componentId === "string") {
      nodeComponentMap.set(node.id, node.componentId)
    }
  }

  const migratedEdges = edges.map((edge) => {
    const sourceNodeId = edge.sourceNodeId as string | undefined
    const targetNodeId = edge.targetNodeId as string | undefined
    if (!sourceNodeId || !targetNodeId || !_portResolver) {
      return edge
    }

    const sourceComponentId = nodeComponentMap.get(sourceNodeId)
    const targetComponentId = nodeComponentMap.get(targetNodeId)
    if (!sourceComponentId || !targetComponentId) {
      return edge
    }

    // Reuse the shared port matcher (same algorithm this block used to inline) so migration,
    // stack loading and blueprint hydration all wire edges to the correct typed handles.
    const { sourceHandleId, targetHandleId } = resolvePortPair(
      _portResolver(sourceComponentId),
      _portResolver(targetComponentId),
    )
    if (sourceHandleId === null) return edge
    return { ...edge, sourceHandleId, targetHandleId }
  })

  return { ...d, schemaVersion: "3.0.0", edges: migratedEdges }
}

// v3-to-v4 migration (Epic 14): adds optional per-node `replicas`. Absent in v3 files —
// hydration defaults replicaCount to 1, so this migration only advances the version marker.
// Required so existing v3.0.0 files migrate instead of being rejected as too-old.
function migrateV3ToV4(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    throw new Error("Migration input must be an object")
  }
  return {
    ...(data as Record<string, unknown>),
    schemaVersion: "4.0.0",
  }
}

export const MIGRATIONS: Record<string, (data: unknown) => unknown> = {
  "1": migrateV1ToV2,
  "2": migrateV2ToV3,
  "3": migrateV3ToV4,
}

// Defense-in-depth: numeric bounds prevent extreme float injection from malicious YAML (TD-5-1b)
const PositionSchema = z.object({
  x: z.number().min(POSITION_MIN).max(POSITION_MAX),
  y: z.number().min(POSITION_MIN).max(POSITION_MAX),
}).strict()

// Defense-in-depth: max string length prevents memory exhaustion from malformed YAML (TD-5-1a)
// Defense-in-depth: max string length prevents memory exhaustion from malformed YAML (TD-5-1a, Story 9-0)

// Data context item schemas (Story 7-1 AC-ARCH-LOC-3)
export const DataContextItemSchema = z.object({
  id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(/^[\w-]+$/, "ID must contain only word characters and hyphens"),
  name: z.string().transform((s) => sanitizeDisplayString(s, DATA_CONTEXT_NAME_MAX_LENGTH)),
  accessPattern: z.enum([...ACCESS_PATTERN_VALUES]),
  averageSize: z.enum([...DATA_SIZE_VALUES]),
  structureType: z.enum([...STRUCTURE_TYPE_VALUES]),
}).strict()

const DataContextItemYamlSchema = z.object({
  id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(/^[\w-]+$/, "ID must contain only word characters and hyphens"),
  name: z.string().transform((s) => sanitizeDisplayString(s, DATA_CONTEXT_NAME_MAX_LENGTH)),
  access_pattern: z.enum([...ACCESS_PATTERN_VALUES]),
  average_size: z.enum([...DATA_SIZE_VALUES]),
  structure_type: z.enum([...STRUCTURE_TYPE_VALUES]),
}).strict().transform((data) => ({
  id: data.id,
  name: data.name,
  accessPattern: data.access_pattern,
  averageSize: data.average_size,
  structureType: data.structure_type,
}))

export const ArchitectureFileNodeSchema = z.object({
  id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  componentId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  configVariantId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).optional(),
  position: PositionSchema,
  // Epic 14: per-node replica count. Optional + bounded; absent defaults to 1 at hydration.
  replicas: z.number().int().min(MIN_REPLICAS).max(MAX_REPLICAS).optional(),
  // Traffic Source burst pattern — shapes its load over the sim timeline. Optional; absent = steady.
  trafficPattern: z.enum(["steady", "wobble", "periodic", "surge"]).optional(),
  dataContext: z.array(DataContextItemSchema).max(MAX_DATA_CONTEXT_ITEMS_PER_NODE).refine((items) => new Set(items.map((i) => i.id)).size === items.length, { message: "Duplicate data context item IDs" }).optional(),
}).strict()

export const ArchitectureFileEdgeSchema = z.object({
  id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  sourceNodeId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  targetNodeId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  sourceHandleId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).optional(),
  targetHandleId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).optional(),
}).strict()

export const ArchitectureFileSchema = z.object({
  schemaVersion: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  libraryVersion: z.string().max(MAX_SCHEMA_STRING_LENGTH).optional(),
  name: z.string().max(MAX_SCHEMA_STRING_LENGTH).optional(),
  nodes: z.array(ArchitectureFileNodeSchema).max(MAX_CANVAS_NODES),
  edges: z.array(ArchitectureFileEdgeSchema).max(MAX_EDGES),
  weightProfile: WeightProfileSchema.optional(),
  constraints: z.array(ConstraintSchema).max(MAX_CONSTRAINTS).optional(),
  // camelCase variant: validates JSON-style input and round-trip re-validation after migration.
  // Primary ingestion path uses ArchitectureFileYamlSchema (snake_case); this field exists for symmetry.
  activeScenarioId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(SCENARIO_ID_FORMAT).optional(),
  // Two-layer defense: regex here admits any slug; yamlImporter.isKnownFailurePresetId() rejects unknown IDs.
  // Schema stays flexible (forward-compat); importer enforces known presets (AC-7).
  activeFailureScenarioId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(SCENARIO_ID_FORMAT).optional(),
}).strict()

// YAML input variant: accepts snake_case fields and transforms to camelCase
const ArchitectureFileNodeYamlSchema = z.object({
  id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  component_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  config_variant_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).optional(),
  position: PositionSchema,
  // Epic 14: `replicas` is a single word — same key in YAML and camelCase output.
  replicas: z.number().int().min(MIN_REPLICAS).max(MAX_REPLICAS).optional(),
  traffic_pattern: z.enum(["steady", "wobble", "periodic", "surge"]).optional(),
  data_context: z.array(DataContextItemYamlSchema).max(MAX_DATA_CONTEXT_ITEMS_PER_NODE).refine((items) => new Set(items.map((i) => i.id)).size === items.length, { message: "Duplicate data context item IDs" }).optional(),
}).strict().transform((data) => ({
  id: data.id,
  componentId: data.component_id,
  configVariantId: data.config_variant_id,
  position: data.position,
  replicas: data.replicas,
  trafficPattern: data.traffic_pattern,
  dataContext: data.data_context,
}))

const ArchitectureFileEdgeYamlSchema = z.object({
  id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  source_node_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  target_node_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  source_handle_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).optional(),
  target_handle_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).optional(),
}).strict().transform((data) => ({
  id: data.id,
  sourceNodeId: data.source_node_id,
  targetNodeId: data.target_node_id,
  sourceHandleId: data.source_handle_id,
  targetHandleId: data.target_handle_id,
}))

export const ArchitectureFileYamlSchema = z.object({
  schema_version: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  library_version: z.string().max(MAX_SCHEMA_STRING_LENGTH).optional(),
  name: z.string().max(MAX_SCHEMA_STRING_LENGTH).optional(),
  nodes: z.array(ArchitectureFileNodeYamlSchema).max(MAX_CANVAS_NODES),
  edges: z.array(ArchitectureFileEdgeYamlSchema).max(MAX_EDGES),
  weight_profile: WeightProfileSchema.optional(),
  constraints: z.array(ConstraintYamlSchema).max(MAX_CONSTRAINTS).optional(),
  active_scenario_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(SCENARIO_ID_FORMAT).optional(),
  active_failure_scenario_id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(SCENARIO_ID_FORMAT).optional(),
}).strict().transform((data) => ({
  schemaVersion: data.schema_version,
  libraryVersion: data.library_version,
  name: data.name,
  nodes: data.nodes,
  edges: data.edges,
  weightProfile: data.weight_profile,
  constraints: data.constraints,
  activeScenarioId: data.active_scenario_id,
  activeFailureScenarioId: data.active_failure_scenario_id,
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
