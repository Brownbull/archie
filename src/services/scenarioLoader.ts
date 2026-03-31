import { load } from "js-yaml"
import { ScenarioPresetYamlSchema } from "@/schemas/demandSchema"
import type { ScenarioPreset } from "@/lib/demandTypes"

// Load all scenario YAML files at build time (Vite eager glob)
const scenarioModules = import.meta.glob("/src/data/scenarios/*.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>

// Parse and validate each scenario preset at module load
const scenarioMap = new Map<string, ScenarioPreset>()
const scenarioList: ScenarioPreset[] = []

for (const [, raw] of Object.entries(scenarioModules)) {
  const parsed = load(raw)
  const result = ScenarioPresetYamlSchema.safeParse(parsed)
  if (result.success) {
    scenarioMap.set(result.data.id, result.data)
    scenarioList.push(result.data)
  } else if (import.meta.env.DEV) {
    console.warn("Invalid scenario preset:", result.error.issues)
  }
}

// Sort alphabetically by name for stable dropdown order
scenarioList.sort((a, b) => a.name.localeCompare(b.name))

export function getScenarioPreset(id: string): ScenarioPreset | undefined {
  return scenarioMap.get(id)
}

export function getAllScenarioPresets(): ScenarioPreset[] {
  return scenarioList
}

export function isKnownScenarioId(id: string): boolean {
  return scenarioMap.has(id)
}
