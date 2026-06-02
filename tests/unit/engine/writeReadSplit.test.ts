import { describe, it, expect } from "vitest"
import { simulateTick } from "@/engine/simulationEngine"
import type { SimGraph } from "@/lib/simulationTypes"

/**
 * TDD RED phase — Write/Read Path Split (E2).
 *
 * These tests define the DESIRED behavior: data-storage nodes with `writeRatio` should
 * split incoming traffic into writes (bottleneck at primary capacity) and reads (scale
 * with replicas). Today all tests that assert the split FAIL because the engine treats
 * all traffic uniformly — reads and writes both hit the same capacity pool.
 *
 * Architecture under test:
 *   Traffic Source (1000 rps) → Database (PostgreSQL single-primary, 500 RPS base, 3 replicas)
 *
 * With writeRatio: 0.3:
 *   Writes = 300 rps → capped at PRIMARY capacity (500, single node) → 300 served (OK)
 *   Reads  = 700 rps → capped at REPLICA capacity (500 × 3 = 1500) → 700 served (OK)
 *   Total served = 1000, failed = 0
 *
 * WITHOUT writeRatio (today's behavior):
 *   All 1000 rps → capped at 500 × 3 = 1500 → 1000 served, 0 failed
 *   (No write bottleneck visible — replicas help writes too, which is wrong for SQL)
 *
 * The KEY scenario: high write load at scale.
 *   Traffic Source (2000 rps) → SQL DB (writeRatio 0.3, primary 500, 3 replicas)
 *   Writes = 600 → capped at 500 (primary) → 100 SHED
 *   Reads  = 1400 → capped at 1500 (replicas) → 1400 served
 *   Total failed = 100 (write bottleneck!)
 *
 *   Same scenario with NoSQL sharded (writeDistribution: "sharded"):
 *   Writes = 600 → capped at 500 × 3 = 1500 (shards) → 600 served
 *   Reads  = 1400 → capped at 1500 → 1400 served
 *   Total failed = 0 (writes scale with shards!)
 */

function buildSqlDbGraph(writeRatio?: number, replicas = 3): SimGraph {
  return {
    nodes: [
      { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
      {
        id: "db",
        category: "data-storage",
        effectiveMaxRps: 500 * replicas, // 500 base × replicas (reads scale)
        baseMaxRps: 500, // single primary capacity (writes bottleneck here)
        baseLatencyMs: 5,
        failureMode: "shed",
        ...(writeRatio !== undefined ? { writeRatio, writeDistribution: "primary" as const } : {}),
      },
    ],
    edges: [{ source: "traffic", target: "db" }],
  }
}

function buildNoSqlShardedGraph(writeRatio?: number, shards = 3): SimGraph {
  return {
    nodes: [
      { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
      {
        id: "db",
        category: "data-storage",
        effectiveMaxRps: 500 * shards, // reads and writes both scale with shards
        baseMaxRps: 500,
        baseLatencyMs: 5,
        failureMode: "shed",
        ...(writeRatio !== undefined ? { writeRatio, writeDistribution: "sharded" as const } : {}),
      },
    ],
    edges: [{ source: "traffic", target: "db" }],
  }
}

describe("Write/Read Path Split — E2 (TDD RED → GREEN)", () => {
  describe("RED: current behavior — SQL and NoSQL are identical", () => {
    it("today, SQL DB with 3 replicas handles 1000 rps with zero failures (writes scale with replicas)", () => {
      const tick = simulateTick(buildSqlDbGraph(), 0, 1000)
      const db = tick.nodes.find((n) => n.nodeId === "db")!
      // 1000 rps vs 1500 capacity (500 × 3) → all served
      expect(db.incomingRps).toBe(1000)
      expect(db.servedRps).toBe(1000)
      expect(db.failedRps).toBe(0)
    })

    it("today, SQL and NoSQL handle 2000 rps identically (both shed 500)", () => {
      const sql = simulateTick(buildSqlDbGraph(), 0, 2000)
      const nosql = simulateTick(buildNoSqlShardedGraph(), 0, 2000)
      const sqlDb = sql.nodes.find((n) => n.nodeId === "db")!
      const nosqlDb = nosql.nodes.find((n) => n.nodeId === "db")!
      // Both have 1500 capacity, both shed 500
      expect(sqlDb.failedRps).toBe(500)
      expect(nosqlDb.failedRps).toBe(500)
      // They're identical — no differentiation
      expect(sqlDb.failedRps).toBe(nosqlDb.failedRps)
    })
  })

  describe("GREEN: with writeRatio, SQL bottlenecks on writes while NoSQL shards don't", () => {
    it("SQL with writeRatio 0.3 at 2000 rps: writes bottleneck at primary (600 writes, primary caps at 500)", () => {
      const tick = simulateTick(buildSqlDbGraph(0.3, 3), 0, 2000)
      const db = tick.nodes.find((n) => n.nodeId === "db")!
      // Writes: 2000 × 0.3 = 600, capped at PRIMARY 500 → 100 shed
      // Reads: 2000 × 0.7 = 1400, capped at 500 × 3 = 1500 → all served
      // Total failed = 100 (write bottleneck only)
      expect(db.failedRps).toBeCloseTo(100, 0)
      expect(db.servedRps).toBeCloseTo(1900, 0)
    })

    it("NoSQL sharded with writeRatio 0.3 at 2000 rps: writes scale across shards (no bottleneck)", () => {
      const tick = simulateTick(buildNoSqlShardedGraph(0.3, 3), 0, 2000)
      const db = tick.nodes.find((n) => n.nodeId === "db")!
      // Writes: 2000 × 0.3 = 600, capped at 500 × 3 = 1500 (sharded) → all served
      // Reads: 2000 × 0.7 = 1400, capped at 1500 → all served
      // Total failed = 0 (writes scale with shards!)
      expect(db.failedRps).toBe(0)
      expect(db.servedRps).toBe(2000)
    })

    it("SQL vs NoSQL diverge under write-heavy load — the fundamental differentiation", () => {
      const sql = simulateTick(buildSqlDbGraph(0.3, 3), 0, 2000)
      const nosql = simulateTick(buildNoSqlShardedGraph(0.3, 3), 0, 2000)
      const sqlDb = sql.nodes.find((n) => n.nodeId === "db")!
      const nosqlDb = nosql.nodes.find((n) => n.nodeId === "db")!
      // SQL sheds writes, NoSQL doesn't — they are now DIFFERENT
      expect(sqlDb.failedRps).toBeGreaterThan(0)
      expect(nosqlDb.failedRps).toBe(0)
    })

    it("writeRatio 0 means all reads — no write bottleneck even on SQL", () => {
      const tick = simulateTick(buildSqlDbGraph(0, 3), 0, 2000)
      const db = tick.nodes.find((n) => n.nodeId === "db")!
      // 0% writes → all reads → 2000 vs 1500 capacity → 500 shed (same as no split)
      expect(db.failedRps).toBe(500)
    })

    it("writeRatio 1.0 means all writes — SQL primary bottlenecks hard", () => {
      const tick = simulateTick(buildSqlDbGraph(1.0, 3), 0, 2000)
      const db = tick.nodes.find((n) => n.nodeId === "db")!
      // 100% writes → 2000 vs primary 500 → 1500 shed!
      expect(db.failedRps).toBeCloseTo(1500, 0)
    })

    it("at low traffic (within primary capacity), SQL and NoSQL behave identically", () => {
      const sql = simulateTick(buildSqlDbGraph(0.3, 3), 0, 500)
      const nosql = simulateTick(buildNoSqlShardedGraph(0.3, 3), 0, 500)
      const sqlDb = sql.nodes.find((n) => n.nodeId === "db")!
      const nosqlDb = nosql.nodes.find((n) => n.nodeId === "db")!
      // 500 × 0.3 = 150 writes, well within primary 500 → no bottleneck
      expect(sqlDb.failedRps).toBe(0)
      expect(nosqlDb.failedRps).toBe(0)
    })
  })
})
