I've gone through all 18 components on the canvas and opened every dropdown. Here's the complete catalog you asked for.

## How the canvas is structured

Each component is a "block" with a header (category + selected vendor + price), a vendor dropdown, optional replica controls, and connection ports (e.g. "HTTP in", "SQL out", "AMQP in"). There's also a non-component **Users** node that only emits "HTTP out" (the traffic source).

## The three "lock" types

These are the gating badges that appear on a block and disable the "add replica" button until a dependency is satisfied:

- **`needs LB`** — block can't scale to replicas until a Load Balancer is connected upstream. The disabled button reads "Connect a load balancer upstream first." Applies to **App Server** and **WebSocket Server**.
- **`needs queue`** — block can't scale until a Message Queue is connected upstream ("Connect a message queue upstream first"). Applies to **Worker**.
- **`reads only`** — replicas are allowed freely, but they only add read capacity; writes stay capped at the primary's RPS. Applies to **SQL Database**, **NoSQL Database**, and **Time-Series DB**. Tooltip: "Replicas add read capacity. Writes stay capped at the primary's ~X RPS regardless of replica count."

Blocks with **no lock** that still scale freely ("Add a replica — scales capacity & cost"): **Stream Processor, Cache, Search Engine, Message Queue**. Blocks with **no replica control at all**: DNS, CDN, Load Balancer, API Gateway, Object Storage, Firewall, Rate Limiter.

## Component catalog

Each entry below lists: category, the lock (if any), replica behavior, what it does, the dropdown options (with the in-app specs shown as price • throughput • latency), and a representative vendor/explainer link per option.

### Networking

**DNS** — no lock, no replicas. Resolves domain names to IP addresses; the first hop for client traffic. Ports: HTTP in → HTTP out.
- Route 53 — $5 • 80k RPS • 1ms — https://aws.amazon.com/route53/
- Cloudflare DNS — $0 • 40k RPS • 1ms — https://www.cloudflare.com/dns/
- Cloud DNS — $3 • 60k RPS • 2ms — https://cloud.google.com/dns
- Azure DNS — $8 • 150k RPS • 1ms — https://azure.microsoft.com/en-us/products/dns

**CDN** — no lock, no replicas. Caches and serves static content from edge locations close to users to cut latency. Ports: HTTP in → HTTP out.
- CloudFront — $50 • 100k RPS • 5ms — https://aws.amazon.com/cloudfront/
- Cloud CDN — $35 • 90k RPS • 6ms — https://cloud.google.com/cdn
- Azure CDN — $55 • 180k RPS • 5ms — https://azure.microsoft.com/en-us/products/cdn
- Cloudflare — $20 • 60k RPS • 3ms — https://www.cloudflare.com/application-services/products/cdn/

**Load Balancer** — no lock, no replicas. Distributes incoming traffic across backend replicas; required upstream to unlock App Server and WebSocket Server scaling. Ports: HTTP in → HTTP out · Backends. Shows a "· N backends" counter.
- Nginx — $25 • 200k RPS • 1ms — https://nginx.org/
- HAProxy — $20 • 180k RPS • 2ms — https://www.haproxy.org/
- AWS ALB — $35 • 250k RPS • 2ms — https://aws.amazon.com/elasticloadbalancing/application-load-balancer/
- Traefik — $15 • 120k RPS • 1ms — https://traefik.io/traefik/

**API Gateway** — no lock, no replicas. Single entry point that handles routing, auth, and policy enforcement for backend services. Ports: HTTP in → HTTP out.
- Kong — $40 • 150k RPS • 5ms — https://konghq.com/products/kong-gateway
- AWS API GW — $50 • 180k RPS • 8ms — https://aws.amazon.com/api-gateway/
- Apigee — $60 • 160k RPS • 6ms — https://cloud.google.com/apigee

### Compute

**App Server** — lock **`needs LB`**. Runs application/business logic and serves API requests; scales horizontally only behind a load balancer. Ports: HTTP in, TCP in → SQL out, Redis out, AMQP out, S3 out (so it can talk to databases, cache, queues, and object storage).
- Node.js — $35 • 4k RPS • 10ms — https://nodejs.org/
- Go — $55 • 8k RPS • 5ms — https://go.dev/
- Java/Spring — $40 • 5k RPS • 14ms — https://spring.io/
- Python/Django — $25 • 2k RPS • 18ms — https://www.djangoproject.com/

**WebSocket Server** — lock **`needs LB`**. Maintains persistent bidirectional connections for real-time features; scales only behind a load balancer. Ports: HTTP in → Redis out · Pub/Sub, SQL out · History.
- Socket.IO — $45 • 5k RPS • 8ms — https://socket.io/
- ws (Node) — $35 • 4k RPS • 6ms — https://github.com/websockets/ws
- Phoenix — $60 • 8k RPS • 4ms — https://www.phoenixframework.org/
- Pushpin — $50 • 6k RPS • 5ms — https://pushpin.org/

**Stream Processor** — no lock, scales freely. Consumes event streams and processes them in real time. Ports: AMQP in → SQL out.
- Kafka Streams — $60 • 30k RPS • 5ms — https://kafka.apache.org/documentation/streams/
- Flink — $85 • 60k RPS • 4ms — https://flink.apache.org/
- Spark Streaming — $65 • 25k RPS • 12ms — https://spark.apache.org/streaming/
- Kinesis — $45 • 18k RPS • 8ms — https://aws.amazon.com/kinesis/

**Worker** — lock **`needs queue`**. Processes background/async jobs pulled off a queue; scales only with a message queue connected upstream. Ports: AMQP in → SQL out, S3 out.
- Celery — $25 • 2k RPS • 35ms — https://docs.celeryq.dev/
- BullMQ — $28 • 3k RPS • 30ms — https://docs.bullmq.io/
- Sidekiq — $40 • 4k RPS • 20ms — https://sidekiq.org/
- Lambda — $15 • 5k RPS • 100ms — https://aws.amazon.com/lambda/

### Storage

**SQL Database** — lock **`reads only`** (writes capped at primary's ~2,500 RPS). Relational store for structured data with transactions. Port: SQL in.
- PostgreSQL — $80 • 3k RPS • 14ms — https://www.postgresql.org/
- MySQL — $65 • 3k RPS • 18ms — https://www.mysql.com/
- Aurora — $120 • 6k RPS • 8ms — https://aws.amazon.com/rds/aurora/
- Cloud SQL — $95 • 4k RPS • 12ms — https://cloud.google.com/sql

**NoSQL Database** — lock **`reads only`** (writes capped at primary's ~6,000 RPS). Document/key-value store for flexible schemas and high scale. Port: SQL in.
- MongoDB — $60 • 6k RPS • 9ms — https://www.mongodb.com/
- DynamoDB — $80 • 12k RPS • 5ms — https://aws.amazon.com/dynamodb/
- Cassandra — $70 • 15k RPS • 10ms — https://cassandra.apache.org/
- Firestore — $40 • 3k RPS • 14ms — https://firebase.google.com/products/firestore

**Cache** — no lock, scales freely. In-memory store for low-latency reads and session/pub-sub data. Port: Redis in.
- Redis — $35 • 35k RPS • 1ms — https://redis.io/
- Memcached — $30 • 30k RPS • 1ms — https://memcached.org/
- ElastiCache — $55 • 45k RPS • 1ms — https://aws.amazon.com/elasticache/
- Dragonfly — $45 • 60k RPS • 1ms — https://www.dragonflydb.io/

**Object Storage** — no lock, no replicas. Stores blobs/files; can act as a static origin for the CDN. Ports: HTTP in · Static origin, S3 in · Object API.
- S3 — $20 • 10k RPS • 15ms — https://aws.amazon.com/s3/
- GCS — $18 • 11k RPS • 17ms — https://cloud.google.com/storage
- Azure Blob — $22 • 12k RPS • 14ms — https://azure.microsoft.com/en-us/products/storage/blobs
- R2 — $10 • 8k RPS • 12ms — https://www.cloudflare.com/developer-platform/products/r2/

**Search Engine** — no lock, scales freely. Full-text search and indexing over your data. Port: SQL in.
- Elasticsearch — $70 • 4k RPS • 20ms — https://www.elastic.co/elasticsearch
- OpenSearch — $55 • 3k RPS • 22ms — https://opensearch.org/
- Meilisearch — $40 • 2k RPS • 12ms — https://www.meilisearch.com/
- Typesense — $35 • 3k RPS • 15ms — https://typesense.org/

**Time-Series DB** — lock **`reads only`** (writes capped at primary's ~40,000 RPS). Optimized for timestamped metrics/events. Port: SQL in.
- InfluxDB — $55 • 40k RPS • 5ms — https://www.influxdata.com/
- VictoriaMetrics — $65 • 70k RPS • 3ms — https://victoriametrics.com/
- TimescaleDB — $70 • 30k RPS • 8ms — https://www.timescale.com/
- Prometheus — $40 • 20k RPS • 8ms — https://prometheus.io/

### Messaging

**Message Queue** — no lock, scales freely. Buffers and delivers async messages between producers and workers; it's the dependency that unlocks Worker scaling. Ports: AMQP in → AMQP out.
- RabbitMQ — $30 • 10k RPS • 4ms — https://www.rabbitmq.com/
- SQS — $20 • 5k RPS • 10ms — https://aws.amazon.com/sqs/
- Kafka — $60 • 50k RPS • 3ms — https://kafka.apache.org/
- NATS — $30 • 15k RPS • 1ms — https://nats.io/

### Security

**Firewall** — no lock, no replicas. Filters malicious traffic (WAF) before it reaches your services. Ports: HTTP in → HTTP out.
- AWS WAF — $20 • 200k RPS • 2ms — https://aws.amazon.com/waf/
- Cloudflare WAF — $15 • 180k RPS • 1ms — https://www.cloudflare.com/application-services/products/waf/
- Azure Firewall — $30 • 220k RPS • 2ms — https://azure.microsoft.com/en-us/products/azure-firewall

**Rate Limiter** — no lock, no replicas, **no dropdown** (single fixed option). Throttles request rates to protect downstream services. Ports: HTTP in → HTTP out. Fixed at $15/mo.

## Special functionality / dependencies (your three cases confirmed)

The dependency rules are enforced exactly as you described, and I confirmed them from the disabled-button tooltips on the canvas:

1. **App Server** and **WebSocket Server** carry the `needs LB` lock — their "add replica" button is disabled with "Connect a load balancer upstream first" until a Load Balancer block feeds into them. So replicas require a load balancer.
2. **Worker** carries the `needs queue` lock — "Connect a message queue upstream first" — so it needs a Message Queue connected before it can scale.
3. A third pattern worth flagging: the three databases (**SQL**, **NoSQL**, **Time-Series**) use the `reads only` model — replicas are always allowed but only scale reads; write throughput is hard-capped at the primary's RPS (~2,500 / ~6,000 / ~40,000 respectively).

A couple of additional notes for your page: the Load Balancer shows a live "backends" count, and the port labels imply the intended wiring (Users → DNS/CDN/Firewall/Rate Limiter/API Gateway over HTTP; App/WebSocket servers fan out to SQL/Redis/AMQP/S3; Workers and Stream Processors consume AMQP and write to SQL/S3; Object Storage can double as a CDN static origin). The current build also shows seven **Required** components (DNS, CDN, Firewall, Rate Limiter, API Gateway, App Server, SQL DB) and a budget of $670 / $1080.

Want me to also capture the exact write-RPS caps for each "reads only" database (I have SQL ~2,500, NoSQL ~6,000, TS ~40,000), or pull the connection/port map into a separate wiring table?