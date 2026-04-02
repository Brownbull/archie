import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { load } from "js-yaml"
import { BlueprintFullYamlSchema } from "@/schemas/blueprintSchema"

const blueprintDir = join(__dirname, "../../../src/data/blueprints")
const blueprintFiles = readdirSync(blueprintDir).filter((f) =>
  f.endsWith(".yaml")
)

function parseBlueprint(filename: string) {
  const content = readFileSync(join(blueprintDir, filename), "utf-8")
  return BlueprintFullYamlSchema.safeParse(load(content))
}

describe("Blueprint YAML validation", () => {
  // 2.1 — Floor guard: catches accidental deletion; bump when stories add blueprints
  it("discovers at least 15 blueprint YAML files", () => {
    expect(blueprintFiles.length).toBeGreaterThanOrEqual(15)
  })

  // 2.2 — Schema validation for every blueprint
  describe.each(blueprintFiles)("%s", (filename) => {
    let result: ReturnType<typeof parseBlueprint>
    beforeAll(() => {
      result = parseBlueprint(filename)
    })

    it("passes BlueprintFullYamlSchema validation", () => {
      expect(
        result.success,
        JSON.stringify(result.error?.issues, null, 2) ?? "schema parse failed"
      ).toBe(true)
    })
  })
})
