import { describe, it, expect, beforeEach } from "vitest"
import { evaluateFit, evaluateFitBatch } from "@/engine/fitEvaluator"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { DataContextItem, FitLevel } from "@/lib/constants"

const sampleProfile: Record<string, string> = {
  "read-heavy": "great",
  "write-heavy": "poor",
  mixed: "neutral",
  "append-only": "good",
  small: "great",
  medium: "neutral",
  large: "poor",
  huge: "incompatible",
  "simple-kv": "great",
  "nested-json": "neutral",
  relational: "good",
  "binary-blob": "incompatible",
}

const altProfile: Record<string, string> = {
  "read-heavy": "poor",
  "write-heavy": "great",
  mixed: "neutral",
  "append-only": "neutral",
  small: "neutral",
  medium: "great",
  large: "good",
  huge: "neutral",
  "simple-kv": "neutral",
  "nested-json": "great",
  relational: "neutral",
  "binary-blob": "neutral",
}

function makeItem(overrides: Partial<DataContextItem> = {}): DataContextItem {
  return {
    id: "dci-1",
    name: "Test Item",
    accessPattern: "read-heavy",
    averageSize: "small",
    structureType: "simple-kv",
    ...overrides,
  }
}

describe("data context flow (integration)", () => {
  beforeEach(() => {
    useArchitectureStore.setState({
      dataContextItems: new Map(),
      computedMetrics: new Map(),
    })
  })

  describe("fit evaluation pipeline", () => {
    it("evaluates a perfectly compatible item as great-fit", () => {
      const item = makeItem({
        accessPattern: "read-heavy",
        averageSize: "small",
        structureType: "simple-kv",
      })
      const result = evaluateFit(item, sampleProfile)
      expect(result.level).toBe("great-fit")
      expect(result.factors).toHaveLength(3)
      expect(result.factors.every((f) => f.compatibility === "positive")).toBe(true)
    })

    it("evaluates a fully incompatible item as risky", () => {
      const item = makeItem({
        accessPattern: "write-heavy",
        averageSize: "huge",
        structureType: "binary-blob",
      })
      const result = evaluateFit(item, sampleProfile)
      expect(result.level).toBe("risky")
      expect(result.factors.every((f) => f.compatibility === "negative")).toBe(true)
    })

    it("evaluates mixed compatibility as trade-off", () => {
      const item = makeItem({
        accessPattern: "read-heavy",
        averageSize: "large",
        structureType: "nested-json",
      })
      const result = evaluateFit(item, sampleProfile)
      expect(result.level).toBe("trade-off")
    })

    it("returns trade-off with empty explanation when no profile", () => {
      const item = makeItem()
      const result = evaluateFit(item, undefined)
      expect(result.level).toBe("trade-off")
      expect(result.explanation).toContain("No compatibility data available")
      expect(result.factors).toHaveLength(0)
    })
  })

  describe("variant switch changes fit results", () => {
    it("same item evaluates differently against different profiles", () => {
      const item = makeItem({
        accessPattern: "read-heavy",
        averageSize: "small",
        structureType: "simple-kv",
      })

      const resultA = evaluateFit(item, sampleProfile)
      const resultB = evaluateFit(item, altProfile)

      expect(resultA.level).toBe("great-fit")
      expect(resultB.level).not.toBe("great-fit")
    })
  })

  describe("batch evaluation", () => {
    it("evaluates multiple items consistently", () => {
      const items = [
        makeItem({ id: "dci-1", accessPattern: "read-heavy", averageSize: "small", structureType: "simple-kv" }),
        makeItem({ id: "dci-2", accessPattern: "write-heavy", averageSize: "huge", structureType: "binary-blob" }),
      ]
      const results = evaluateFitBatch(items, sampleProfile)
      expect(results).toHaveLength(2)
      expect(results[0].level).toBe("great-fit")
      expect(results[1].level).toBe("risky")
    })
  })

  describe("store CRUD does not affect metrics", () => {
    it("adding data context item does not change computedMetrics", () => {
      const store = useArchitectureStore.getState()
      const metricsBefore = new Map(store.computedMetrics)

      store.addDataContextItem("node-1", {
        name: "Test",
        accessPattern: "read-heavy",
        averageSize: "small",
        structureType: "simple-kv",
      })

      const metricsAfter = useArchitectureStore.getState().computedMetrics
      expect(metricsAfter).toEqual(metricsBefore)
    })

    it("removing data context item does not change computedMetrics", () => {
      const store = useArchitectureStore.getState()
      store.addDataContextItem("node-1", {
        name: "Test",
        accessPattern: "read-heavy",
        averageSize: "small",
        structureType: "simple-kv",
      })

      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      const metricsBefore = new Map(useArchitectureStore.getState().computedMetrics)

      useArchitectureStore.getState().removeDataContextItem("node-1", items[0].id)

      const metricsAfter = useArchitectureStore.getState().computedMetrics
      expect(metricsAfter).toEqual(metricsBefore)
    })
  })

  describe("10-item limit", () => {
    it("store allows up to 10 items per node", () => {
      const store = useArchitectureStore.getState()
      for (let i = 0; i < 10; i++) {
        store.addDataContextItem("node-1", {
          name: `Item ${i}`,
          accessPattern: "read-heavy",
          averageSize: "small",
          structureType: "simple-kv",
        })
      }
      const items = useArchitectureStore.getState().dataContextItems.get("node-1")!
      expect(items).toHaveLength(10)
    })
  })
})
