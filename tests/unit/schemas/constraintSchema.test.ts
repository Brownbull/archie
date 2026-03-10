import { describe, it, expect } from "vitest"
import {
  ArchitectureFileSchema,
  ArchitectureFileYamlSchema,
  ConstraintSchema,
  constraintBaseFields,
} from "@/schemas/architectureFileSchema"
import {
  CONSTRAINT_THRESHOLD_MIN,
  CONSTRAINT_THRESHOLD_MAX,
  CONSTRAINT_LABEL_MAX_LENGTH,
  MAX_CONSTRAINTS,
  METRIC_CATEGORIES,
} from "@/lib/constants"

const ALL_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id)

const validConstraint = {
  categoryId: "performance",
  operator: "lte" as const,
  threshold: 5,
  label: "Max performance cost",
}

const validNode = {
  id: "node-1",
  componentId: "postgresql",
  position: { x: 100, y: 200 },
}

const validEdge = {
  id: "edge-1",
  sourceNodeId: "node-1",
  targetNodeId: "node-2",
}

describe("Constraint Constants (Task 1)", () => {
  it("CONSTRAINT_THRESHOLD_MIN is 1", () => {
    expect(CONSTRAINT_THRESHOLD_MIN).toBe(1)
  })

  it("CONSTRAINT_THRESHOLD_MAX is 10", () => {
    expect(CONSTRAINT_THRESHOLD_MAX).toBe(10)
  })

  it("CONSTRAINT_LABEL_MAX_LENGTH is 100", () => {
    expect(CONSTRAINT_LABEL_MAX_LENGTH).toBe(100)
  })
})

describe("ConstraintSchema Validation (Task 2, AC-2)", () => {
  it("accepts valid constraint with operator lte", () => {
    const result = ConstraintSchema.safeParse(validConstraint)
    expect(result.success).toBe(true)
  })

  it("accepts valid constraint with operator gte", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, operator: "gte" })
    expect(result.success).toBe(true)
  })

  it("accepts each valid categoryId (AC-ARCH-PATTERN-1)", () => {
    for (const id of ALL_CATEGORY_IDS) {
      const result = ConstraintSchema.safeParse({ ...validConstraint, categoryId: id })
      expect(result.success).toBe(true)
    }
  })

  it("accepts boundary threshold 1.0 (min, AC-4)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: 1.0 })
    expect(result.success).toBe(true)
  })

  it("accepts boundary threshold 10.0 (max, AC-4)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: 10.0 })
    expect(result.success).toBe(true)
  })

  it("accepts fractional threshold 6.5 (continuous, Dev Notes)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: 6.5 })
    expect(result.success).toBe(true)
  })

  it("rejects threshold 0 (below min)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects threshold 11 (above max)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: 11 })
    expect(result.success).toBe(false)
  })

  it("rejects threshold 0.9 (just below min)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: 0.9 })
    expect(result.success).toBe(false)
  })

  it("rejects threshold 10.1 (just above max)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: 10.1 })
    expect(result.success).toBe(false)
  })

  it("rejects negative threshold -1", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects threshold NaN", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: NaN })
    expect(result.success).toBe(false)
  })

  it("rejects threshold Infinity", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, threshold: Infinity })
    expect(result.success).toBe(false)
  })

  it("rejects unknown categoryId (AC-4)", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, categoryId: "unknown-cat" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid operator 'eq'", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, operator: "eq" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid operator 'gt'", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, operator: "gt" })
    expect(result.success).toBe(false)
  })

  it("rejects missing categoryId", () => {
    const { categoryId: _, ...missing } = validConstraint
    const result = ConstraintSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it("rejects missing operator", () => {
    const { operator: _, ...missing } = validConstraint
    const result = ConstraintSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it("rejects missing threshold", () => {
    const { threshold: _, ...missing } = validConstraint
    const result = ConstraintSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it("rejects missing label", () => {
    const { label: _, ...missing } = validConstraint
    const result = ConstraintSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })

  it("rejects extra unknown fields (.strict())", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, unknownField: "nope" })
    expect(result.success).toBe(false)
  })
})

describe("Constraint Label Sanitization (AC-5)", () => {
  it("strips HTML tags from label", () => {
    const result = ConstraintSchema.safeParse({
      ...validConstraint,
      label: "Cost <b>limit</b>",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe("Cost limit")
    }
  })

  it("strips script tags from label", () => {
    const result = ConstraintSchema.safeParse({
      ...validConstraint,
      label: 'Safe <script>alert("xss")</script> label',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).not.toContain("<script>")
      expect(result.data.label).not.toContain("</script>")
    }
  })

  it("truncates label over 100 characters", () => {
    const longLabel = "A".repeat(150)
    const result = ConstraintSchema.safeParse({ ...validConstraint, label: longLabel })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label.length).toBeLessThanOrEqual(CONSTRAINT_LABEL_MAX_LENGTH)
    }
  })

  it("strips malformed HTML with event handlers", () => {
    const result = ConstraintSchema.safeParse({
      ...validConstraint,
      label: '<b onclick="alert(1)">text</b>',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe("text")
      expect(result.data.label).not.toContain("onclick")
    }
  })

  it("accepts label exactly 100 characters", () => {
    const exactLabel = "A".repeat(CONSTRAINT_LABEL_MAX_LENGTH)
    const result = ConstraintSchema.safeParse({ ...validConstraint, label: exactLabel })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label.length).toBe(CONSTRAINT_LABEL_MAX_LENGTH)
    }
  })

  it("trims whitespace from label", () => {
    const result = ConstraintSchema.safeParse({
      ...validConstraint,
      label: "  Cost limit  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe("Cost limit")
    }
  })

  it("accepts empty constraints array (AC-3)", () => {
    const result = ArchitectureFileSchema.safeParse({
      schemaVersion: "2.0.0",
      nodes: [validNode],
      edges: [validEdge],
      constraints: [],
    })
    expect(result.success).toBe(true)
  })
})

describe("ArchitectureFileSchema with constraints (AC-2, AC-3)", () => {
  const validV2File = {
    schemaVersion: "2.0.0",
    nodes: [validNode],
    edges: [validEdge],
  }

  it("accepts v2 file with valid constraints array", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validV2File,
      constraints: [validConstraint],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.constraints).toHaveLength(1)
    }
  })

  it("accepts v2 file without constraints (optional, AC-3)", () => {
    const result = ArchitectureFileSchema.safeParse(validV2File)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.constraints).toBeUndefined()
    }
  })

  it("accepts v2 file with empty constraints array", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validV2File,
      constraints: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.constraints).toHaveLength(0)
    }
  })

  it("rejects v2 file with invalid constraint in array", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validV2File,
      constraints: [{ categoryId: "unknown", operator: "lte", threshold: 5, label: "test" }],
    })
    expect(result.success).toBe(false)
  })

  it("preserves .strict() — rejects unknown keys alongside constraints", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validV2File,
      constraints: [validConstraint],
      unknownField: "nope",
    })
    expect(result.success).toBe(false)
  })
})

describe("Constraint Array Size Cap (TD-6-2a AC-1)", () => {
  const validV2Base = {
    schemaVersion: "2.0.0",
    nodes: [validNode],
    edges: [validEdge],
  }

  const yamlV2Base = {
    schema_version: "2.0.0",
    nodes: [{ id: "node-1", component_id: "postgresql", position: { x: 100, y: 200 } }],
    edges: [{ id: "edge-1", source_node_id: "node-1", target_node_id: "node-2" }],
  }

  function makeConstraints(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      categoryId: "performance" as const,
      operator: "lte" as const,
      threshold: 5,
      label: `Constraint ${i}`,
    }))
  }

  function makeYamlConstraints(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      category_id: "performance" as const,
      operator: "lte" as const,
      threshold: 5,
      label: `Constraint ${i}`,
    }))
  }

  it("MAX_CONSTRAINTS constant is 50", () => {
    expect(MAX_CONSTRAINTS).toBe(50)
  })

  it("accepts constraints array with exactly 50 entries", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validV2Base,
      constraints: makeConstraints(50),
    })
    expect(result.success).toBe(true)
  })

  it("rejects constraints array with 51 entries", () => {
    const result = ArchitectureFileSchema.safeParse({
      ...validV2Base,
      constraints: makeConstraints(51),
    })
    expect(result.success).toBe(false)
  })

  it("accepts YAML constraints array with exactly 50 entries", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlV2Base,
      constraints: makeYamlConstraints(50),
    })
    expect(result.success).toBe(true)
  })

  it("rejects YAML constraints array with 51 entries", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlV2Base,
      constraints: makeYamlConstraints(51),
    })
    expect(result.success).toBe(false)
  })
})

describe("YAML Variant: Constraint Transform (AC-ARCH-PATTERN-5)", () => {
  const yamlInput = {
    schema_version: "2.0.0",
    nodes: [{
      id: "node-1",
      component_id: "postgresql",
      position: { x: 100, y: 200 },
    }],
    edges: [{
      id: "edge-1",
      source_node_id: "node-1",
      target_node_id: "node-2",
    }],
    constraints: [{
      category_id: "performance",
      operator: "lte",
      threshold: 5,
      label: "Max perf cost",
    }],
  }

  it("transforms category_id to categoryId", () => {
    const result = ArchitectureFileYamlSchema.safeParse(yamlInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.constraints).toBeDefined()
      expect(result.data.constraints![0]).toHaveProperty("categoryId", "performance")
      expect(result.data.constraints![0]).not.toHaveProperty("category_id")
    }
  })

  it("accepts YAML without constraints (optional)", () => {
    const { constraints: _, ...withoutConstraints } = yamlInput
    const result = ArchitectureFileYamlSchema.safeParse(withoutConstraints)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.constraints).toBeUndefined()
    }
  })

  it("rejects unknown keys in YAML constraint (.strict())", () => {
    const result = ArchitectureFileYamlSchema.safeParse({
      ...yamlInput,
      constraints: [{
        category_id: "performance",
        operator: "lte",
        threshold: 5,
        label: "test",
        unknown_key: "nope",
      }],
    })
    expect(result.success).toBe(false)
  })

  it("round-trip: YAML output matches ArchitectureFileSchema shape", () => {
    const yamlResult = ArchitectureFileYamlSchema.safeParse(yamlInput)
    expect(yamlResult.success).toBe(true)
    if (yamlResult.success) {
      const baseResult = ArchitectureFileSchema.safeParse(yamlResult.data)
      expect(baseResult.success).toBe(true)
    }
  })

  it("sanitizes label in YAML variant too", () => {
    const yamlWithHtml = {
      ...yamlInput,
      constraints: [{
        category_id: "performance",
        operator: "lte",
        threshold: 5,
        label: "<b>Bold</b> label",
      }],
    }
    const result = ArchitectureFileYamlSchema.safeParse(yamlWithHtml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.constraints![0].label).toBe("Bold label")
    }
  })
})

describe("Constraint DRY base fields (TD-6-4b AC-1)", () => {
  it("constraintBaseFields is exported and contains operator, threshold, label", () => {
    expect(constraintBaseFields).toBeDefined()
    expect(constraintBaseFields).toHaveProperty("operator")
    expect(constraintBaseFields).toHaveProperty("threshold")
    expect(constraintBaseFields).toHaveProperty("label")
  })

  it("constraintBaseFields has exactly 3 keys (no categoryId)", () => {
    expect(Object.keys(constraintBaseFields)).toHaveLength(3)
    expect(constraintBaseFields).not.toHaveProperty("categoryId")
  })

  it("ConstraintSchema uses shared base — operator validation unchanged", () => {
    // lte and gte still accepted
    expect(ConstraintSchema.safeParse({ ...validConstraint, operator: "lte" }).success).toBe(true)
    expect(ConstraintSchema.safeParse({ ...validConstraint, operator: "gte" }).success).toBe(true)
    // invalid operator still rejected
    expect(ConstraintSchema.safeParse({ ...validConstraint, operator: "eq" }).success).toBe(false)
  })

  it("ConstraintSchema uses shared base — threshold validation unchanged", () => {
    expect(ConstraintSchema.safeParse({ ...validConstraint, threshold: CONSTRAINT_THRESHOLD_MIN }).success).toBe(true)
    expect(ConstraintSchema.safeParse({ ...validConstraint, threshold: CONSTRAINT_THRESHOLD_MAX }).success).toBe(true)
    expect(ConstraintSchema.safeParse({ ...validConstraint, threshold: 0 }).success).toBe(false)
  })

  it("ConstraintSchema uses shared base — label sanitization unchanged", () => {
    const result = ConstraintSchema.safeParse({ ...validConstraint, label: "<b>test</b>" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe("test")
    }
  })
})
