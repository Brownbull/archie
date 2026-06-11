import { describe, it, expect } from "vitest"
import { categoryContributors, biggestLever } from "@/lib/categoryContributors"

const node = (id: string, name: string) => ({ id, data: { componentName: name } })
const recalc = (metrics: Array<{ id: string; category: string; numericValue: number }>) => ({ metrics })

describe("categoryContributors (Plan-2 P4 / D99)", () => {
  const nodes = [node("n1", "API Gateway"), node("n2", "PostgreSQL"), node("n3", "Redis")]
  const computed = new Map([
    ["n1", recalc([
      { id: "p99-latency", category: "performance", numericValue: 2 },
      { id: "throughput", category: "performance", numericValue: 6 },
      { id: "uptime", category: "reliability", numericValue: 8 },
    ])],
    ["n2", recalc([
      { id: "query-latency", category: "performance", numericValue: 7 },
      { id: "data-durability", category: "reliability", numericValue: 9 },
    ])],
    ["n3", recalc([{ id: "data-durability", category: "reliability", numericValue: 5 }])],
  ])

  it("collects only the category's metrics, sub-scores per node, worst first", () => {
    const c = categoryContributors(nodes as never, computed as never, "performance")
    expect(c.map((x) => x.nodeId)).toEqual(["n1", "n2"]) // n1 (4.0) before n2 (7.0); n3 has no perf metrics
    expect(c[0]).toMatchObject({ name: "API Gateway", subScore: 4, worstMetricId: "p99-latency", worstMetricValue: 2 })
    expect(c[1].subScore).toBe(7)
  })

  it("names the dragging metric per node (the lowest in-category value)", () => {
    const c = categoryContributors(nodes as never, computed as never, "reliability")
    expect(c[0]).toMatchObject({ nodeId: "n3", worstMetricId: "data-durability", worstMetricValue: 5 })
  })

  it("biggestLever picks the single lowest metric across contributors", () => {
    const c = categoryContributors(nodes as never, computed as never, "performance")
    expect(biggestLever(c)).toMatchObject({ name: "API Gateway", worstMetricId: "p99-latency" })
    expect(biggestLever([])).toBeNull()
  })

  it("empty when nothing carries the category", () => {
    expect(categoryContributors(nodes as never, computed as never, "security")).toEqual([])
  })
})
