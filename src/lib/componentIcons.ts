/**
 * Pixel-art component icons (generated via PixelLab, stored in `public/icons/<id>.png`).
 *
 * The icon filename matches the component id, so the URL is derived — no per-component data/schema
 * change. We gate on a known id set (not the raw id) so a missing/typo'd id falls back to the
 * category icon instead of a broken <img>, and because the URL is a same-origin relative path there
 * is no external-URL injection surface (unlike the original `logoUrl` idea — see D37).
 *
 * Keep COMPONENT_ICON_IDS in lockstep with the files in public/icons/ — the consistency test
 * `tests/unit/lib/componentIcons.test.ts` fails if they drift.
 */
export const COMPONENT_ICON_IDS: ReadonlySet<string> = new Set([
  "ably",
  "adyen",
  "airflow",
  "amazon-mq",
  "anthropic",
  "arangodb",
  "aws-alb",
  "aws-aurora",
  "aws-bedrock",
  "aws-kinesis",
  "aws-lambda",
  "aws-s3",
  "aws-sqs",
  "cloudflare-cdn",
  "cloudflare-waf",
  "cloudflare-workers",
  "cloudfront",
  "cockroachdb",
  "data-lake",
  "datadog",
  "dbt",
  "dotnet",
  "envoy",
  "etl-pipeline",
  "fastly-cdn",
  "fivetran",
  "gcp-pubsub",
  "gcs",
  "go-service",
  "grafana",
  "graph-db",
  "haproxy",
  "kafka",
  "laravel",
  "llm-gateway",
  "memcached",
  "minio",
  "mysql",
  "nats",
  "neo4j",
  "neptune",
  "newrelic",
  "nginx",
  "node-express",
  "openai",
  "payment-gateway",
  "paypal",
  "pinecone",
  "postgresql",
  "prometheus",
  "pusher",
  "python-django",
  "python-fastapi",
  "python-flask",
  "qdrant",
  "rabbitmq",
  "rails",
  "redis",
  "redis-cache",
  "redpanda",
  "serverless",
  "siem",
  "socketio",
  "splunk",
  "spring-boot",
  "stripe",
  "vault",
  "vector-db",
  "weaviate",
  "websocket-server",
])

/** Returns the relative icon URL for a component id, or null when no pixel icon exists for it. */
export function getComponentIconUrl(componentId: string): string | null {
  return COMPONENT_ICON_IDS.has(componentId) ? `/icons/${componentId}.png` : null
}
