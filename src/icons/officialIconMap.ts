/**
 * Maps a vendor/provider component id to its official Iconify `logos` icon name (bare, no `logos:`
 * prefix). Used only when the user's icon-set preference is `official` (see preferencesStore).
 *
 * Coverage is intentionally partial: ids NOT listed here have no recognizable brand logo in the
 * `logos` set (generic logical types like `data-lake`, `vector-db`, or brands the set lacks like
 * `keycloak`, `haproxy`) — those gracefully fall back to a Lucide line icon at render time.
 *
 * `-icon` variants are preferred over the full wordmark where they exist, because the mark-only
 * glyph reads better at the small sizes Archie renders (h-3 to h-7).
 *
 * Names were verified against the installed `@iconify-json/logos` set (2091 icons). Keep this map
 * in lockstep with the generated subset via `npm run gen:icons`; the lockstep test
 * `tests/unit/icons/officialIconMap.test.ts` fails if a mapped name isn't bundled.
 */
export const VENDOR_LOGOS: Readonly<Record<string, string>> = {
  // Payments
  adyen: "adyen",
  paypal: "paypal",
  stripe: "stripe",
  // AWS
  "aws-api-gateway": "aws-api-gateway",
  "aws-aurora": "aws-aurora",
  "aws-kinesis": "aws-kinesis",
  "aws-lambda": "aws-lambda",
  "aws-s3": "aws-s3",
  "aws-sqs": "aws-sqs",
  cloudfront: "aws-cloudfront",
  dynamodb: "aws-dynamodb",
  neptune: "aws-neptune",
  route53: "aws-route53",
  // Cloudflare / Fastly (edge)
  "cloudflare-cdn": "cloudflare-icon",
  "cloudflare-dns": "cloudflare-icon",
  "cloudflare-waf": "cloudflare-icon",
  "cloudflare-workers": "cloudflare-workers-icon",
  "fastly-cdn": "fastly",
  // GCP
  "gcp-pubsub": "google-cloud",
  gcs: "google-cloud",
  // Compute / runtimes / frameworks
  dotnet: "dotnet",
  "go-service": "go",
  laravel: "laravel",
  "node-express": "nodejs-icon",
  "python-django": "django-icon",
  "python-fastapi": "fastapi-icon",
  "python-flask": "flask",
  rails: "rails",
  "spring-boot": "spring-icon",
  // Data stores
  arangodb: "arangodb-icon",
  elasticsearch: "elasticsearch",
  influxdb: "influxdb-icon",
  memcached: "memcached",
  mongodb: "mongodb-icon",
  mysql: "mysql-icon",
  neo4j: "neo4j",
  postgresql: "postgresql",
  redis: "redis",
  "redis-cache": "redis",
  // Messaging / streaming
  envoy: "envoy-icon",
  flink: "apache-flink-icon",
  kafka: "kafka-icon",
  kong: "kong-icon",
  nats: "nats-icon",
  nginx: "nginx",
  rabbitmq: "rabbitmq-icon",
  "spark-streaming": "apache-spark",
  // Realtime
  pusher: "pusher-icon",
  socketio: "socket-io",
  "websocket-server": "websocket",
  // AI / vector
  anthropic: "anthropic-icon",
  openai: "openai-icon",
  pinecone: "pinecone-icon",
  qdrant: "qdrant-icon",
  // Data pipeline / search
  airflow: "airflow-icon",
  algolia: "algolia",
  dbt: "dbt-icon",
  // Auth / secrets
  auth0: "auth0-icon",
  vault: "vault-icon",
  // Observability
  datadog: "datadog-icon",
  grafana: "grafana",
  newrelic: "new-relic-icon",
  prometheus: "prometheus",
  splunk: "splunk",
}

/** Distinct, sorted list of bundled logo names — the generator's input and the lockstep anchor. */
export const USED_LOGO_NAMES: readonly string[] = [...new Set(Object.values(VENDOR_LOGOS))].sort()
