import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"
import type { ComponentCategoryId } from "@/lib/constants"
import { makeNode, makeEdge } from "./factories"

export interface ArchitectureFixture {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
}

/**
 * Returns an empty architecture with no nodes and no edges.
 */
export function emptyArchitecture(): ArchitectureFixture {
  return {
    nodes: [],
    edges: [],
  }
}

/**
 * Returns an architecture with a single postgresql node at {x: 0, y: 0}.
 */
export function singleNodeArchitecture(): ArchitectureFixture {
  const node = makeNode({
    position: { x: 0, y: 0 },
    data: {
      archieComponentId: "postgresql",
      activeConfigVariantId: "single-node",
      componentName: "PostgreSQL",
      componentCategory: "data-storage" as ComponentCategoryId,
    },
  })

  return {
    nodes: [node],
    edges: [],
  }
}

/**
 * Returns an architecture with two nodes (different categories) connected by one edge.
 */
export function connectedPairArchitecture(): ArchitectureFixture {
  const nodeA = makeNode({
    position: { x: 0, y: 0 },
    data: {
      archieComponentId: "postgresql",
      activeConfigVariantId: "single-node",
      componentName: "PostgreSQL",
      componentCategory: "data-storage" as ComponentCategoryId,
    },
  })

  const nodeB = makeNode({
    position: { x: 200, y: 0 },
    data: {
      archieComponentId: "redis",
      activeConfigVariantId: "standalone",
      componentName: "Redis",
      componentCategory: "caching" as ComponentCategoryId,
    },
  })

  const edge = makeEdge({
    source: nodeA.id,
    target: nodeB.id,
    data: {
      isIncompatible: false,
      incompatibilityReason: null,
      sourceArchieComponentId: "postgresql",
      targetArchieComponentId: "redis",
    },
  })

  return {
    nodes: [nodeA, nodeB],
    edges: [edge],
  }
}

/**
 * Returns a full architecture with 5+ nodes across 4+ categories and 4+ edges.
 * Represents a realistic multi-tier architecture for comprehensive testing.
 */
export function fullArchitecture(): ArchitectureFixture {
  const nodePostgres = makeNode({
    position: { x: 0, y: 0 },
    data: {
      archieComponentId: "postgresql",
      activeConfigVariantId: "primary-replica",
      componentName: "PostgreSQL",
      componentCategory: "data-storage" as ComponentCategoryId,
    },
  })

  const nodeRedis = makeNode({
    position: { x: 200, y: 0 },
    data: {
      archieComponentId: "redis",
      activeConfigVariantId: "sentinel",
      componentName: "Redis",
      componentCategory: "caching" as ComponentCategoryId,
    },
  })

  const nodeNginx = makeNode({
    position: { x: 400, y: 0 },
    data: {
      archieComponentId: "nginx",
      activeConfigVariantId: "load-balancer",
      componentName: "Nginx",
      componentCategory: "delivery-network" as ComponentCategoryId,
    },
  })

  const nodeKafka = makeNode({
    position: { x: 0, y: 200 },
    data: {
      archieComponentId: "kafka",
      activeConfigVariantId: "multi-broker",
      componentName: "Apache Kafka",
      componentCategory: "messaging" as ComponentCategoryId,
    },
  })

  const nodeMongo = makeNode({
    position: { x: 200, y: 200 },
    data: {
      archieComponentId: "mongodb",
      activeConfigVariantId: "replica-set",
      componentName: "MongoDB",
      componentCategory: "data-storage" as ComponentCategoryId,
    },
  })

  const nodes = [nodePostgres, nodeRedis, nodeNginx, nodeKafka, nodeMongo]

  // Nginx -> Redis -> Postgres (typical web tier)
  // Kafka -> Postgres (event-driven writes)
  // Kafka -> MongoDB (event-driven reads)
  const edges = [
    makeEdge({
      source: nodeNginx.id,
      target: nodeRedis.id,
      data: {
        isIncompatible: false,
        incompatibilityReason: null,
        sourceArchieComponentId: "nginx",
        targetArchieComponentId: "redis",
      },
    }),
    makeEdge({
      source: nodeRedis.id,
      target: nodePostgres.id,
      data: {
        isIncompatible: true,
        incompatibilityReason: "Caching layer may cause stale reads",
        sourceArchieComponentId: "redis",
        targetArchieComponentId: "postgresql",
      },
    }),
    makeEdge({
      source: nodeKafka.id,
      target: nodePostgres.id,
      data: {
        isIncompatible: false,
        incompatibilityReason: null,
        sourceArchieComponentId: "kafka",
        targetArchieComponentId: "postgresql",
      },
    }),
    makeEdge({
      source: nodeKafka.id,
      target: nodeMongo.id,
      data: {
        isIncompatible: false,
        incompatibilityReason: null,
        sourceArchieComponentId: "kafka",
        targetArchieComponentId: "mongodb",
      },
    }),
  ]

  return { nodes, edges }
}
