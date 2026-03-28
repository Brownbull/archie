import { load } from "js-yaml"
import { FailurePresetYamlSchema } from "@/schemas/demandSchema"
import type { FailurePreset } from "@/lib/demandTypes"

// Load failure scenario YAML files at build time (Vite eager glob)
// Pattern: failure-*.yaml — distinct from demand scenario presets (no failure- prefix)
const failureModules = import.meta.glob("/src/data/scenarios/failure-*.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>

// Parse and validate each failure preset at module load
const failureMap = new Map<string, FailurePreset>()
const failureList: FailurePreset[] = []

for (const [, raw] of Object.entries(failureModules)) {
  const parsed = load(raw)
  const result = FailurePresetYamlSchema.safeParse(parsed)
  if (result.success) {
    failureMap.set(result.data.id, result.data)
    failureList.push(result.data)
  } else if (import.meta.env.DEV) {
    console.warn("Invalid failure preset:", result.error.issues)
  }
}

// Sort alphabetically by name for stable dropdown order
failureList.sort((a, b) => a.name.localeCompare(b.name))

export function getFailurePreset(id: string): FailurePreset | undefined {
  return failureMap.get(id)
}

export function getAllFailurePresets(): FailurePreset[] {
  return failureList
}

export function isKnownFailurePresetId(id: string): boolean {
  return failureMap.has(id)
}
