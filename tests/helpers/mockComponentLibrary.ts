import type { Component } from "@/schemas/componentSchema"
import { makeMetric, makeComponent, makeConfigVariant } from "./factories"

/**
 * Standard test components matching common seed data IDs.
 * Each has 2+ config variants with different metrics for testing.
 * Treat as read-only — do not mutate elements in tests.
 */
export const STANDARD_TEST_COMPONENTS: Component[] = [
  makeComponent({
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    description: "Relational database",
    is: "An open-source relational database",
    gain: ["ACID compliance", "Strong consistency"],
    cost: ["Higher memory usage", "Complex tuning"],
    tags: ["database", "sql", "relational"],
    baseMetrics: [
      makeMetric({ id: "read-latency", numericValue: 5, category: "performance" }),
      makeMetric({ id: "write-throughput", numericValue: 6, category: "performance" }),
      makeMetric({ id: "data-durability", numericValue: 9, category: "reliability" }),
      makeMetric({ id: "operational-complexity", numericValue: 5, category: "operational-complexity" }),
    ],
    configVariants: [
      makeConfigVariant({
        id: "single-node",
        name: "Single Node",
        metrics: [makeMetric({ id: "read-latency", numericValue: 3, category: "performance" })],
      }),
      makeConfigVariant({
        id: "primary-replica",
        name: "Primary-Replica",
        metrics: [makeMetric({ id: "read-latency", numericValue: 2, category: "performance" })],
      }),
    ],
    compatibility: { caching: "Cache invalidation adds complexity" },
  }),

  makeComponent({
    id: "redis",
    name: "Redis",
    category: "caching",
    description: "In-memory data store",
    is: "An in-memory data structure store",
    gain: ["Low latency", "Versatile data structures"],
    cost: ["Memory cost", "Data volatility"],
    tags: ["cache", "in-memory", "key-value"],
    baseMetrics: [
      makeMetric({ id: "cache-hit-latency", numericValue: 1, category: "performance" }),
      makeMetric({ id: "cache-efficiency", numericValue: 8, category: "performance" }),
      makeMetric({ id: "operational-complexity", numericValue: 3, category: "operational-complexity" }),
    ],
    configVariants: [
      makeConfigVariant({
        id: "standalone",
        name: "Standalone",
        metrics: [makeMetric({ id: "cache-efficiency", numericValue: 7, category: "performance" })],
      }),
      makeConfigVariant({
        id: "sentinel",
        name: "Sentinel",
        metrics: [makeMetric({ id: "cache-efficiency", numericValue: 9, category: "performance" })],
      }),
    ],
    compatibility: { "data-storage": "Caching layer may cause stale reads" },
  }),

  makeComponent({
    id: "nginx",
    name: "Nginx",
    category: "delivery-network",
    description: "Reverse proxy and load balancer",
    is: "A reverse proxy server",
    gain: ["Load balancing", "SSL termination"],
    cost: ["Config complexity"],
    tags: ["proxy", "load-balancer", "web-server"],
    baseMetrics: [
      makeMetric({ id: "request-latency", numericValue: 2, category: "performance" }),
      makeMetric({ id: "concurrent-connections", numericValue: 9, category: "scalability" }),
      makeMetric({ id: "operational-complexity", numericValue: 4, category: "operational-complexity" }),
    ],
    configVariants: [
      makeConfigVariant({
        id: "reverse-proxy",
        name: "Reverse Proxy",
        metrics: [makeMetric({ id: "request-latency", numericValue: 2, category: "performance" })],
      }),
      makeConfigVariant({
        id: "load-balancer",
        name: "Load Balancer",
        metrics: [makeMetric({ id: "concurrent-connections", numericValue: 10, category: "scalability" })],
      }),
    ],
  }),

  makeComponent({
    id: "kafka",
    name: "Apache Kafka",
    category: "messaging",
    description: "Distributed event streaming platform",
    is: "A distributed event streaming platform",
    gain: ["High throughput", "Durability"],
    cost: ["Operational complexity", "Resource heavy"],
    tags: ["messaging", "streaming", "event-driven"],
    baseMetrics: [
      makeMetric({ id: "message-throughput", numericValue: 9, category: "performance" }),
      makeMetric({ id: "data-durability", numericValue: 8, category: "reliability" }),
      makeMetric({ id: "horizontal-scalability", numericValue: 9, category: "scalability" }),
      makeMetric({ id: "operational-complexity", numericValue: 3, category: "operational-complexity" }),
    ],
    configVariants: [
      makeConfigVariant({
        id: "single-broker",
        name: "Single Broker",
        metrics: [makeMetric({ id: "message-throughput", numericValue: 6, category: "performance" })],
      }),
      makeConfigVariant({
        id: "multi-broker",
        name: "Multi-Broker Cluster",
        metrics: [makeMetric({ id: "message-throughput", numericValue: 9, category: "performance" })],
      }),
    ],
  }),

  makeComponent({
    id: "mongodb",
    name: "MongoDB",
    category: "data-storage",
    description: "Document database",
    is: "A NoSQL document database",
    gain: ["Schema flexibility", "Horizontal scaling"],
    cost: ["Eventual consistency", "Memory usage"],
    tags: ["database", "nosql", "document"],
    baseMetrics: [
      makeMetric({ id: "read-latency", numericValue: 4, category: "performance" }),
      makeMetric({ id: "write-throughput", numericValue: 7, category: "performance" }),
      makeMetric({ id: "horizontal-scalability", numericValue: 8, category: "scalability" }),
      makeMetric({ id: "operational-complexity", numericValue: 4, category: "operational-complexity" }),
    ],
    configVariants: [
      makeConfigVariant({
        id: "replica-set",
        name: "Replica Set",
        metrics: [makeMetric({ id: "read-latency", numericValue: 3, category: "performance" })],
      }),
      makeConfigVariant({
        id: "sharded",
        name: "Sharded Cluster",
        metrics: [makeMetric({ id: "horizontal-scalability", numericValue: 10, category: "scalability" })],
      }),
    ],
  }),
]

/**
 * Creates a mock componentLibrary matching the componentLibrary service interface.
 * Includes all standard test components plus any custom components.
 * Custom components with the same ID as standard ones will override them.
 */
export function createMockComponentLibrary(customComponents?: Component[]) {
  const componentMap = new Map<string, Component>()

  // Load standard components first
  for (const comp of STANDARD_TEST_COMPONENTS) {
    componentMap.set(comp.id, comp)
  }

  // Override/extend with custom components
  if (customComponents) {
    for (const comp of customComponents) {
      componentMap.set(comp.id, comp)
    }
  }

  return {
    getComponent: (id: string): Component | undefined => componentMap.get(id),

    getAllComponents: (): Component[] => Array.from(componentMap.values()),

    getComponentsByCategory: (category: string): Component[] =>
      Array.from(componentMap.values()).filter((c) => c.category === category),

    isInitialized: (): boolean => true,

    reset: (): void => {
      // no-op for mock
    },

    searchComponents: (query: string): Component[] => {
      const lower = query.toLowerCase()
      return Array.from(componentMap.values()).filter(
        (comp) =>
          comp.name.toLowerCase().includes(lower) ||
          comp.category.toLowerCase().includes(lower) ||
          comp.tags.some((tag) => tag.toLowerCase().includes(lower)),
      )
    },
  }
}
