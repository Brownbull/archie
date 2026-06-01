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
  // --- Traffic sources (the explicit ORIGIN of request load) ---
  { id: "traffic-source", label: "Traffic Source", category: "traffic", synonyms: ["users", "traffic", "client", "api client", "sensors", "iot", "load", "requests", "rps", "visitors"], defaultProviderId: "web-users" },
  // --- Networking / delivery edge ---
  { id: "dns", label: "DNS", category: "delivery-network", synonyms: ["dns", "domain", "route 53", "name resolution", "nameserver"], defaultProviderId: "cloudflare-dns" },
  { id: "cdn", label: "CDN", category: "delivery-network", synonyms: ["cdn", "edge", "content delivery", "static assets"], defaultProviderId: "cloudflare-cdn" },
  // Load Balancer is networking infrastructure (AWS/GCP/Azure all file it under Networking) and
  // `delivery-network` is the category whose scaling rule has actsAsLoadBalancer:true — so this
  // also lets an LB satisfy the upstream-LB topology requirement for replicated downstream nodes.
  { id: "load-balancer", label: "Load Balancer", category: "delivery-network", synonyms: ["lb", "load balancer", "reverse proxy", "nginx", "ingress"], defaultProviderId: "nginx" },
  { id: "api-gateway", label: "API Gateway", category: "delivery-network", synonyms: ["api gateway", "gateway", "kong", "apigee", "ingress api"], defaultProviderId: "kong" },
  // --- Compute ---
  { id: "compute", label: "Compute", category: "compute", synonyms: ["server", "service", "api", "backend", "app", "node", "compute"], defaultProviderId: "node-express" },
  { id: "serverless", label: "Serverless", category: "compute", synonyms: ["serverless", "lambda", "functions", "faas", "edge function"], defaultProviderId: "serverless" },
  { id: "worker", label: "Worker", category: "compute", synonyms: ["worker", "background job", "job queue", "celery", "sidekiq", "bullmq", "task runner"], defaultProviderId: "celery" },
  { id: "stream-processor", label: "Stream Processor", category: "compute", synonyms: ["stream processing", "flink", "spark streaming", "kafka streams", "real-time processing"], defaultProviderId: "flink" },
  { id: "llm-gateway", label: "LLM Gateway", category: "compute", synonyms: ["llm", "ai", "inference", "model", "gpt"], defaultProviderId: "llm-gateway" },
  { id: "payments", label: "Payments", category: "compute", synonyms: ["payment", "stripe", "billing", "checkout"], defaultProviderId: "payment-gateway" },
  { id: "etl", label: "ETL Pipeline", category: "compute", synonyms: ["etl", "pipeline", "batch", "ingest", "data"], defaultProviderId: "etl-pipeline" },
  // --- Data storage ---
  { id: "relational-db", label: "SQL Database", category: "data-storage", synonyms: ["sql", "relational", "postgres", "mysql", "rdbms", "database"], defaultProviderId: "postgresql" },
  { id: "nosql", label: "NoSQL DB", category: "data-storage", synonyms: ["nosql", "document", "mongodb", "dynamodb", "key-value", "wide-column", "cassandra"], defaultProviderId: "mongodb" },
  { id: "graph-db", label: "Graph DB", category: "data-storage", synonyms: ["graph", "neo4j", "relationships", "traversal", "graph database"], defaultProviderId: "graph-db" },
  { id: "vector-store", label: "Vector DB", category: "data-storage", synonyms: ["vector", "embeddings", "semantic", "rag", "similarity", "vector store"], defaultProviderId: "vector-db" },
  { id: "time-series-db", label: "Time-Series DB", category: "data-storage", synonyms: ["time series", "timeseries", "influxdb", "timescale", "metrics db", "tsdb"], defaultProviderId: "influxdb" },
  { id: "object-storage", label: "Object Storage", category: "data-storage", synonyms: ["storage", "blob", "s3", "data lake", "bucket", "files"], defaultProviderId: "aws-s3" },
  { id: "search-engine", label: "Search Engine", category: "search", synonyms: ["search", "elasticsearch", "opensearch", "algolia", "full-text", "index"], defaultProviderId: "elasticsearch" },
  // --- Caching / messaging / real-time ---
  { id: "cache", label: "Cache", category: "caching", synonyms: ["cache", "redis", "memcached", "in-memory", "kv"], defaultProviderId: "redis" },
  { id: "message-queue", label: "Message Queue", category: "messaging", synonyms: ["queue", "rabbitmq", "mq", "jobs", "tasks"], defaultProviderId: "rabbitmq" },
  { id: "event-stream", label: "Event Stream", category: "messaging", synonyms: ["stream", "kafka", "events", "bus", "log", "event bus"], defaultProviderId: "kafka" },
  { id: "realtime", label: "Realtime", category: "real-time", synonyms: ["websocket", "realtime", "ws", "live", "push", "real-time"], defaultProviderId: "websocket-server" },
  // --- Observability / auth-security ---
  { id: "observability", label: "Observability", category: "monitoring", synonyms: ["metrics", "monitoring", "prometheus", "logs", "tracing"], defaultProviderId: "prometheus" },
  { id: "security", label: "Security", category: "monitoring", synonyms: ["security", "siem", "waf", "threat", "audit"], defaultProviderId: "siem" },
  { id: "auth", label: "Auth", category: "auth-security", synonyms: ["auth", "authentication", "identity", "oauth", "auth0", "cognito", "keycloak", "sso", "idp"], defaultProviderId: "auth0" },
  { id: "rate-limiter", label: "Rate Limiter", category: "auth-security", synonyms: ["rate limit", "rate limiter", "throttle", "throttling", "quota"], defaultProviderId: "rate-limiter" },
]

export const COMPONENT_TYPES: ReadonlyMap<string, ComponentType> = new Map(
  TYPE_LIST.map((t) => [t.id, t]),
)

/**
 * Experience tier for progressive disclosure (P86). A new user shouldn't face all 27 block
 * types at once — the toolbox starts at `beginner` (essentials only) and reveals more as the
 * level rises. Levels are curated, not algorithmic: `beginner` is the minimum to build a basic
 * 3-tier web app; `intermediate` adds the common production blocks; `advanced` is everything.
 */
export type BlockLevel = "beginner" | "intermediate" | "advanced"

/**
 * The user's self-declared experience level (P89). Identical scale to BlockLevel — it's a global
 * app setting that gates how much detail surfaces across the whole UI (blocks, inspector, the
 * optimize panel, …), not just the toolbox. Aliased so the global concept reads clearly while
 * block-tier helpers keep their `BlockLevel` name.
 */
export type ExperienceLevel = BlockLevel

/** Numeric rank for "is type at or below the active level" comparisons. */
export function levelRank(level: BlockLevel): number {
  switch (level) {
    case "beginner":
      return 0
    case "intermediate":
      return 1
    case "advanced":
      return 2
  }
}

// Map (not a plain object) so lookups stay clear of object-injection lint and unknown ids
// fall through to the `beginner` default — legacy/typeId-less blocks always stay visible.
const TYPE_LEVEL = new Map<string, BlockLevel>([
  // Beginner essentials — enough to model users → load balancer → compute → cache/db + static assets.
  ["traffic-source", "beginner"],
  ["compute", "beginner"],
  ["relational-db", "beginner"],
  ["cache", "beginner"],
  ["load-balancer", "beginner"],
  ["cdn", "beginner"],
  ["object-storage", "beginner"],
  // Intermediate — common production building blocks.
  ["dns", "intermediate"],
  ["api-gateway", "intermediate"],
  ["serverless", "intermediate"],
  ["worker", "intermediate"],
  ["nosql", "intermediate"],
  ["search-engine", "intermediate"],
  ["message-queue", "intermediate"],
  ["realtime", "intermediate"],
  ["observability", "intermediate"],
  ["auth", "intermediate"],
  // Advanced — specialized / large-scale concerns.
  ["stream-processor", "advanced"],
  ["llm-gateway", "advanced"],
  ["payments", "advanced"],
  ["etl", "advanced"],
  ["graph-db", "advanced"],
  ["vector-store", "advanced"],
  ["time-series-db", "advanced"],
  ["event-stream", "advanced"],
  ["security", "advanced"],
  ["rate-limiter", "advanced"],
])

/** A type's experience tier; unknown/legacy types default to `beginner` (always visible). */
export function typeLevel(typeId: string | null | undefined): BlockLevel {
  return (typeId && TYPE_LEVEL.get(typeId)) || "beginner"
}

/** Is a type's tier at or below the active level? (Search bypasses this — it shows everything.) */
export function typeWithinLevel(typeId: string | null | undefined, level: BlockLevel): boolean {
  return levelRank(typeLevel(typeId)) <= levelRank(level)
}

/**
 * The experience level of a COMPOSITE (a stack or blueprint) = the highest level among its
 * constituent block types (P92/Phase D). A pattern using a Vector DB is "advanced" because
 * Vector DB is; one of only beginner blocks stays "beginner". Empty input → beginner.
 */
export function maxTypeLevel(typeIds: Array<string | null | undefined>): ExperienceLevel {
  let rank = 0
  for (const t of typeIds) {
    const r = levelRank(typeLevel(t))
    if (r > rank) rank = r
  }
  return rank >= 2 ? "advanced" : rank >= 1 ? "intermediate" : "beginner"
}

/** Is an item's level at or below the active experience level? */
export function levelWithin(itemLevel: ExperienceLevel, userLevel: ExperienceLevel): boolean {
  return levelRank(itemLevel) <= levelRank(userLevel)
}

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
