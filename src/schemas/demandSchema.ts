import { z } from "zod"
import {
  DEMAND_VARIABLE_VALUES,
  DEMAND_LEVEL_VALUES,
  DEMAND_MULTIPLIER_MIN,
  DEMAND_MULTIPLIER_MAX,
  FAILURE_MULTIPLIER_MIN,
  FAILURE_MULTIPLIER_MAX,
  SCENARIO_NAME_MAX_LENGTH,
  SCENARIO_DESC_MAX_LENGTH,
  SCENARIO_ID_FORMAT,
  MAX_SCHEMA_STRING_LENGTH,
  type DemandVariable,
  type DemandLevel,
} from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"
import { getValidLevelsForVariable } from "@/lib/demandTypes"

// --- Level Schema ---
// NOTE: DemandLevelSchema validates membership in the flat level union only.
// It does NOT validate that a level is valid for a specific variable.
// Always use DemandProfileSchema or DemandResponseSchema for variable-level pairs.

export const DemandLevelSchema = z.enum(
  // Cast required: z.enum needs a non-empty tuple literal, readonly arrays need widening
  DEMAND_LEVEL_VALUES as unknown as [DemandLevel, ...DemandLevel[]],
)

// --- Demand Response Schema (AC-2) ---

const MultiplierSchema = z.number().min(DEMAND_MULTIPLIER_MIN).max(DEMAND_MULTIPLIER_MAX)

const MetricMultipliersSchema = z.record(
  z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  MultiplierSchema,
).refine((r) => Object.keys(r).length <= 50, { message: "MetricMultipliers: max 50 entries" })

const LevelMultipliersSchema = z.record(
  z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  MetricMultipliersSchema,
)

const variableSet = new Set<string>(DEMAND_VARIABLE_VALUES)
const levelSet = new Set<string>(DEMAND_LEVEL_VALUES)

export const DemandResponseSchema = z
  .record(z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH), LevelMultipliersSchema)
  .superRefine((data, ctx) => {
    for (const [variable, levels] of Object.entries(data)) {
      if (!variableSet.has(variable)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown demand variable "${variable}". Valid variables: ${DEMAND_VARIABLE_VALUES.join(", ")}`,
          path: [variable],
        })
        continue
      }
      if (!levels) continue
      const validLevels = getValidLevelsForVariable(variable as DemandVariable)
      for (const level of Object.keys(levels)) {
        if (!levelSet.has(level)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown demand level "${level}"`,
            path: [variable, level],
          })
        } else if (!validLevels.includes(level as DemandLevel)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Level "${level}" is not valid for variable "${variable}". Valid levels: ${validLevels.join(", ")}`,
            path: [variable, level],
          })
        }
      }
    }
  })

// --- Demand Profile Schema (AC-4, AC-5) ---

// DemandLevelSchema (z.enum) accepts ALL levels globally — it cannot distinguish per-variable validity.
// The superRefine below is LOAD-BEARING: it enforces that each variable only uses its own valid levels
// (e.g., "global" is rejected for traffic-volume even though it passes the enum check).
export const DemandProfileSchema = z
  .object(
    Object.fromEntries(
      DEMAND_VARIABLE_VALUES.map((v) => [v, DemandLevelSchema]),
    ) as unknown as Record<DemandVariable, z.ZodType<DemandLevel>>,
  )
  .strict()
  .superRefine((data, ctx) => {
    for (const variable of DEMAND_VARIABLE_VALUES) {
      const level = data[variable]
      const validLevels = getValidLevelsForVariable(variable)
      if (!validLevels.includes(level)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Level "${level}" is not valid for variable "${variable}". Valid levels: ${validLevels.join(", ")}`,
          path: [variable],
        })
      }
    }
  })

// --- Scenario Preset Schemas (AC-3) ---

const scenarioPresetBaseFields = {
  id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(SCENARIO_ID_FORMAT, "ID must contain only alphanumeric, hyphens, and underscores"),
  name: z.string().min(1).transform((s) => sanitizeDisplayString(s, SCENARIO_NAME_MAX_LENGTH)),
  description: z.string().min(1).transform((s) => sanitizeDisplayString(s, SCENARIO_DESC_MAX_LENGTH)),
  icon: z.string().min(1).max(50),
}

export const ScenarioPresetSchema = z
  .object({
    ...scenarioPresetBaseFields,
    demandProfile: DemandProfileSchema,
  })
  .strict()

// YAML Variant (snake_case demand_profile -> camelCase demandProfile)
export const ScenarioPresetYamlSchema = z
  .object({
    ...scenarioPresetBaseFields,
    demand_profile: DemandProfileSchema,
  })
  .strict()
  .transform((data) => ({
    id: data.id,
    name: data.name,
    description: data.description,
    icon: data.icon,
    demandProfile: data.demand_profile,
  }))

// --- Failure Scenario Schemas (Story 9-7) ---

const FailureMultiplierSchema = z.number().min(FAILURE_MULTIPLIER_MIN).max(FAILURE_MULTIPLIER_MAX)

export const FailureModifiersSchema = z.record(
  z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  FailureMultiplierSchema,
).refine((r) => Object.keys(r).length <= 50, { message: "FailureModifiers: max 50 entries" })

// Per-component failure responses: maps failure preset IDs to per-metric multiplier maps (Story 11-4)
export const FailureResponseSchema = z.record(
  z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
  FailureModifiersSchema,
).refine((r) => Object.keys(r).length <= 10, { message: "FailureResponse: max 10 entries" })

export const FailurePresetSchema = z
  .object({
    ...scenarioPresetBaseFields,
    failureModifiers: FailureModifiersSchema,
  })
  .strict()

// YAML Variant (snake_case failure_modifiers -> camelCase failureModifiers)
export const FailurePresetYamlSchema = z
  .object({
    ...scenarioPresetBaseFields,
    failure_modifiers: FailureModifiersSchema,
  })
  .strict()
  .transform((data) => ({
    id: data.id,
    name: data.name,
    description: data.description,
    icon: data.icon,
    failureModifiers: data.failure_modifiers,
  }))
