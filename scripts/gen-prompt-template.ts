/**
 * Generate src/data/prompt-template.md from the live component library.
 *
 * The AI-prompt template (shown in-app via "Prompt Template", consumed by the YAML importer)
 * MUST stay in lockstep with the real component catalog and the current schema version. Hand-
 * maintaining it let it rot to schema 1.0.0 + 10 of 114 components (Kane QA, 2026-06-15, B2).
 * This script regenerates it deterministically from src/data/components/*.yaml so it can't drift.
 *
 * Usage:
 *   npx tsx scripts/gen-prompt-template.ts          # write the file
 *   npx tsx scripts/gen-prompt-template.ts --check  # exit 1 if the file is stale (CI drift gate)
 */

import { load } from "js-yaml"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { resolve, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const ROOT = resolve(__dirname, "..")
const COMPONENTS_DIR = join(ROOT, "src", "data", "components")
const OUTPUT = join(ROOT, "src", "data", "prompt-template.md")
const SCHEMA_FILE = join(ROOT, "src", "schemas", "architectureFileSchema.ts")

interface ConfigVariant {
  id: string
  name?: string
}
interface ComponentYaml {
  id: string
  name?: string
  category?: string
  config_variants?: ConfigVariant[]
}

/** Human-facing labels + ordering for each component category. */
const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: "traffic", label: "Traffic Sources (demand — every architecture needs at least one)" },
  { key: "delivery-network", label: "Delivery / Network" },
  { key: "compute", label: "Compute" },
  { key: "caching", label: "Caching" },
  { key: "data-storage", label: "Data Storage" },
  { key: "messaging", label: "Messaging / Streaming" },
  { key: "real-time", label: "Real-time" },
  { key: "search", label: "Search" },
  { key: "auth-security", label: "Auth / Security" },
  { key: "monitoring", label: "Monitoring / Observability" },
]

function readSchemaVersion(): string {
  const src = readFileSync(SCHEMA_FILE, "utf8")
  const m = src.match(/CURRENT_SCHEMA_VERSION\s*=\s*"([^"]+)"/)
  if (!m) throw new Error("Could not find CURRENT_SCHEMA_VERSION in architectureFileSchema.ts")
  return m[1]
}

function loadComponents(): ComponentYaml[] {
  return readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => load(readFileSync(join(COMPONENTS_DIR, f), "utf8")) as ComponentYaml)
    .filter((c) => c && typeof c.id === "string")
}

function variantList(c: ComponentYaml): string {
  const variants = (c.config_variants ?? []).map((v) => v.id).filter(Boolean)
  if (variants.length === 0) return "_(no variants)_"
  return variants.map((v) => `\`${v}\``).join(", ")
}

function render(components: ComponentYaml[], schemaVersion: string): string {
  const byCategory = new Map<string, ComponentYaml[]>()
  for (const c of components) {
    const cat = c.category ?? "uncategorized"
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), c])
  }
  for (const list of byCategory.values()) list.sort((a, b) => a.id.localeCompare(b.id))

  const sections: string[] = []
  const seen = new Set<string>()
  for (const { key, label } of CATEGORY_ORDER) {
    const list = byCategory.get(key)
    if (!list || list.length === 0) continue
    seen.add(key)
    const rows = list
      .map((c) => `| \`${c.id}\` | ${c.name ?? c.id} | ${variantList(c)} |`)
      .join("\n")
    sections.push(`### ${label}\n\n| Component ID | Name | Config Variant IDs |\n|---|---|---|\n${rows}`)
  }
  // Any category not in CATEGORY_ORDER (defensive — a new category shouldn't silently vanish).
  for (const [cat, list] of byCategory) {
    if (seen.has(cat)) continue
    const rows = list.map((c) => `| \`${c.id}\` | ${c.name ?? c.id} | ${variantList(c)} |`).join("\n")
    sections.push(`### ${cat}\n\n| Component ID | Name | Config Variant IDs |\n|---|---|---|\n${rows}`)
  }

  const total = components.length
  // A self-consistent example using IDs guaranteed to exist (asserted in the drift test).
  const example = `\`\`\`yaml
schema_version: "${schemaVersion}"
name: "AI Chat Service"
nodes:
  - id: "n1"
    component_id: "web-users"
    config_variant_id: "moderate"
    position: { x: 0, y: 200 }
    traffic_rps: 5000
    traffic_kind: "realistic"
    traffic_workload: "mixed"
    traffic_origin: "multi-region"
  - id: "n2"
    component_id: "cloudflare-cdn"
    config_variant_id: "full-site"
    position: { x: 240, y: 200 }
  - id: "n3"
    component_id: "node-express"
    config_variant_id: "cluster-mode"
    position: { x: 480, y: 200 }
  - id: "n4"
    component_id: "llm-gateway"
    config_variant_id: "single-model"
    position: { x: 720, y: 200 }
  - id: "n5"
    component_id: "redis"
    config_variant_id: "standalone"
    position: { x: 480, y: 420 }
edges:
  - id: "e1"
    source_node_id: "n1"
    target_node_id: "n2"
  - id: "e2"
    source_node_id: "n2"
    target_node_id: "n3"
  - id: "e3"
    source_node_id: "n3"
    target_node_id: "n4"
  - id: "e4"
    source_node_id: "n3"
    target_node_id: "n5"
\`\`\``

  return `<!-- AUTO-GENERATED by scripts/gen-prompt-template.ts — DO NOT EDIT BY HAND. -->
<!-- Regenerate: npx tsx scripts/gen-prompt-template.ts -->

# Archie AI Prompt Template

Use this template to ask any AI (Claude, ChatGPT, etc.) to generate Archie-compatible architecture YAML, then bring the result in via **Import**.

---

## Instructions for AI

You are helping design a software architecture using Archie, a visual architecture simulator. Generate a YAML file that follows the Archie schema exactly.

**Rules:**
- \`schema_version\` must be \`"${schemaVersion}"\`
- Every \`component_id\` MUST come from the Available Components tables below — unknown IDs import as un-scored placeholders
- Every \`config_variant_id\` MUST be one of the variants listed for that component
- Include at least one **Traffic Source** node (category below) — it is the demand the simulator drives load with
- On each traffic-source node, set \`traffic_rps\` (1–10,000,000), and optionally \`traffic_kind\` (\`steady\` | \`realistic\` | \`periodic\` | \`search\`), \`traffic_workload\` (\`read\` | \`write\` | \`mixed\`), and \`traffic_origin\` (\`one-region\` | \`multi-region\`)
- Node \`id\` and edge \`id\` values must be unique strings (e.g., \`"n1"\`, \`"e1"\`)
- Positions use pixel coordinates — space nodes at least 200px apart
- Edges connect nodes via \`source_node_id\` and \`target_node_id\` (direction = flow of requests)

---

## YAML Schema

\`\`\`yaml
schema_version: "${schemaVersion}"
name: "Optional architecture name"
nodes:
  - id: "n1"
    component_id: "<component-id>"      # from a table below
    config_variant_id: "<variant-id>"   # a variant of that component
    position: { x: 0, y: 0 }
    # traffic-source nodes only:
    traffic_rps: 1000
    traffic_kind: "realistic"
    traffic_workload: "mixed"
    traffic_origin: "multi-region"
edges:
  - id: "e1"
    source_node_id: "n1"
    target_node_id: "n2"
\`\`\`

---

## Available Components (${total} total)

${sections.join("\n\n")}

---

## Complete Example (AI Chat Service)

${example}

---

## Prompt to Use

Copy and paste the following into your AI chat:

> "Generate an Archie-compatible YAML architecture (schema_version ${schemaVersion}) for [describe your use case]. Use ONLY component IDs and config_variant_IDs from the Available Components tables. Include at least one traffic source with a traffic_rps. Follow the schema exactly. Return only the YAML, no explanation."
`
}

function main() {
  const check = process.argv.includes("--check")
  const components = loadComponents()
  const schemaVersion = readSchemaVersion()
  const next = render(components, schemaVersion)

  if (check) {
    const current = readFileSync(OUTPUT, "utf8")
    if (current.trim() !== next.trim()) {
      console.error("prompt-template.md is STALE. Run: npx tsx scripts/gen-prompt-template.ts")
      process.exit(1)
    }
    console.log(`prompt-template.md is current (${components.length} components, schema ${schemaVersion}).`)
    return
  }

  writeFileSync(OUTPUT, next, "utf8")
  console.log(`Wrote ${OUTPUT}: ${components.length} components, schema ${schemaVersion}.`)
}

main()
