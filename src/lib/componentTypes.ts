import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import type { Component } from "@/schemas/componentSchema"

/**
 * Fundamental component TYPES (P5). The user reasons in concepts ("I need a cache"), so the
 * toolbox is organized by type; a type's PROVIDERS (Redis, Memcached, …) are individual
 * components sharing a `typeId`, swappable in the node inspector. A type rolls up to one of
 * the existing visual categories (drives icon + colour + parent grouping).
 */
export interface ComponentType {
  id: string
  label: string
  category: ComponentCategoryId
  /** Search terms beyond the label so concept search finds the type ("lb" → Load Balancer). */
  synonyms: string[]
  /**
   * The provider a logical block instantiates when dropped on the canvas. The architect refines
   * the vendor + tier afterward via the inspector's Provider picker. Prefers the generic
   * reference provider when one exists, else a common representative of the type.
   */
  defaultProviderId: string
}

const TYPE_LIST: ComponentType[] = [
  { id: "cdn", label: "CDN", category: "delivery-network", synonyms: ["cdn", "edge", "content delivery", "static assets"], defaultProviderId: "cloudflare-cdn" },
  { id: "load-balancer", label: "Load Balancer", category: "compute", synonyms: ["lb", "load balancer", "reverse proxy", "nginx", "ingress"], defaultProviderId: "nginx" },
  { id: "compute", label: "Compute / Service", category: "compute", synonyms: ["server", "service", "api", "backend", "app", "node"], defaultProviderId: "node-express" },
  { id: "serverless", label: "Serverless", category: "compute", synonyms: ["serverless", "lambda", "functions", "faas", "edge function"], defaultProviderId: "serverless" },
  { id: "llm-gateway", label: "LLM Gateway", category: "compute", synonyms: ["llm", "ai", "inference", "model", "gpt"], defaultProviderId: "llm-gateway" },
  { id: "payments", label: "Payments", category: "compute", synonyms: ["payment", "stripe", "billing", "checkout"], defaultProviderId: "payment-gateway" },
  { id: "etl", label: "ETL / Data Pipeline", category: "compute", synonyms: ["etl", "pipeline", "batch", "ingest", "data"], defaultProviderId: "etl-pipeline" },
  { id: "relational-db", label: "Relational Database", category: "data-storage", synonyms: ["sql", "relational", "postgres", "mysql", "rdbms", "database"], defaultProviderId: "postgresql" },
  { id: "graph-db", label: "Graph Database", category: "data-storage", synonyms: ["graph", "neo4j", "relationships", "traversal"], defaultProviderId: "graph-db" },
  { id: "vector-store", label: "Vector Store", category: "data-storage", synonyms: ["vector", "embeddings", "semantic", "rag", "similarity"], defaultProviderId: "vector-db" },
  { id: "object-storage", label: "Object Storage", category: "data-storage", synonyms: ["storage", "blob", "s3", "data lake", "bucket", "files"], defaultProviderId: "aws-s3" },
  { id: "cache", label: "Cache", category: "caching", synonyms: ["cache", "redis", "memcached", "in-memory", "kv"], defaultProviderId: "redis" },
  { id: "message-queue", label: "Message Queue", category: "messaging", synonyms: ["queue", "rabbitmq", "mq", "jobs", "tasks"], defaultProviderId: "rabbitmq" },
  { id: "event-stream", label: "Stream / Event Bus", category: "messaging", synonyms: ["stream", "kafka", "events", "bus", "log"], defaultProviderId: "kafka" },
  { id: "realtime", label: "Real-Time / WebSocket", category: "real-time", synonyms: ["websocket", "realtime", "ws", "live", "push"], defaultProviderId: "websocket-server" },
  { id: "observability", label: "Observability", category: "monitoring", synonyms: ["metrics", "monitoring", "prometheus", "logs", "tracing"], defaultProviderId: "prometheus" },
  { id: "security", label: "Security / SIEM", category: "monitoring", synonyms: ["security", "siem", "waf", "threat", "audit"], defaultProviderId: "siem" },
]

export const COMPONENT_TYPES: ReadonlyMap<string, ComponentType> = new Map(
  TYPE_LIST.map((t) => [t.id, t]),
)

export interface ComponentTypeGroup {
  /** Grouping key: the typeId, or a `category:<cat>` fallback for pre-P5 components. */
  key: string
  /** Non-null when this group is a real fundamental type; null for a category fallback. */
  typeId: string | null
  label: string
  categoryId: ComponentCategoryId
  synonyms: string[]
  providers: Component[]
}

/** Grouping key for a component: its typeId, or a category-fallback key when unset. */
export function componentGroupKey(component: Pick<Component, "typeId" | "category">): string {
  return component.typeId ?? `category:${component.category}`
}

/**
 * Does a component's fundamental type match a (lowercased) search query — by type label or
 * synonym? Lets concept search ("cache", "lb") surface a type even when no provider name matches.
 */
export function typeMatchesQuery(component: Pick<Component, "typeId">, queryLower: string): boolean {
  if (!component.typeId) return false
  const type = COMPONENT_TYPES.get(component.typeId)
  if (!type) return false
  return type.label.toLowerCase().includes(queryLower) || type.synonyms.some((s) => s.includes(queryLower))
}

/**
 * Group components into fundamental types. Components with a known `typeId` group under that
 * type; components without one (pre-P5 seeded data) fall back to a per-category group so the
 * toolbox keeps working before a re-seed. Insertion order = first-seen order of the input.
 */
export function groupComponentsByType(components: Component[]): ComponentTypeGroup[] {
  const groups = new Map<string, ComponentTypeGroup>()
  for (const c of components) {
    const key = componentGroupKey(c)
    let group = groups.get(key)
    if (!group) {
      const type = c.typeId ? COMPONENT_TYPES.get(c.typeId) : undefined
      if (type) {
        group = { key, typeId: type.id, label: type.label, categoryId: type.category, synonyms: type.synonyms, providers: [] }
      } else {
        const catId = c.category as ComponentCategoryId
        // eslint-disable-next-line security/detect-object-injection -- catId is a typed category key
        const catMeta = COMPONENT_CATEGORIES[catId]
        group = { key, typeId: null, label: catMeta?.label ?? c.category, categoryId: catId, synonyms: [], providers: [] }
      }
      groups.set(key, group)
    }
    group.providers.push(c)
  }
  return [...groups.values()]
}

/**
 * Providers (sibling components) selectable for a node: those sharing its `typeId`. Falls back
 * to same-category components when the node's component has no typeId (pre-P5). Used by the
 * in-node provider picker.
 */
export function providersForComponent(component: Component, all: Component[]): Component[] {
  if (component.typeId) return all.filter((c) => c.typeId === component.typeId)
  return all.filter((c) => c.category === component.category)
}
