# Archie — Architecture Example Candidates

**Source books:**
1. *Designing Data-Intensive Applications* (DDIA) — Martin Kleppmann
2. *Software Architecture: The Hard Parts* (Hard Parts) — Ford, Richards, Sadalage, Dehghani

**Existing examples (from PRD):** WhatsApp-style Messaging, Telegram-style Messaging

---

## Recommendation #1: Twitter Home Timeline (DDIA Ch. 1)

**Source:** Kleppmann's opening example — the most famous trade-off in systems design.

**Architecture story:** When a user posts a tweet, should we (a) write it once and query followers' timelines on read, or (b) fan it out to all followers' timeline caches at write time? Twitter famously does both — fan-out-on-write for normal users, fan-out-on-read for celebrities with millions of followers.

**Components:**
| Component | Category | Variants |
|-----------|----------|----------|
| Load Balancer | Delivery/Network | Nginx / AWS ALB / Envoy |
| Timeline API | Compute | Express.js / Fastify / Go API |
| Fan-out Service | Compute | Fan-out-on-Write / Fan-out-on-Read / Hybrid |
| Tweet Store | Data Storage | PostgreSQL / Cassandra / DynamoDB |
| Timeline Cache | Caching | Redis / Memcached / KeyDB |
| Message Queue | Messaging | Kafka / RabbitMQ / Redis Streams |

**Key metrics trade-offs:**
- Fan-out-on-write: Fast reads (O(1) cache hit), expensive writes (celebrity = millions of cache writes)
- Fan-out-on-read: Cheap writes (single DB write), slow reads (query all followed users)
- Hybrid: Cheap writes for celebrities, fast reads for everyone, but complex routing logic

**Why perfect for Archie:** Configuration variant on Fan-out Service directly shifts Performance vs Cost vs Scalability vs Operational Complexity. Celebrity edge case makes the trade-off visceral.

---

## Recommendation #2: Sysops Squad Saga (Hard Parts, full book)

**Source:** The running example throughout the entire book — a ticket assignment system decomposed from monolith to services.

**Architecture story:** A helpdesk system assigns IT tickets to experts. Starts as a monolith, then decomposes step by step. Each decomposition trades simplicity for autonomy. The shared database creates coupling; per-service databases create coordination overhead.

**Components:**
| Component | Category | Variants |
|-----------|----------|----------|
| API Gateway | Delivery/Network | Nginx / Kong / AWS API Gateway |
| Ticket Service | Compute | Monolith Module / Microservice / Serverless |
| Assignment Engine | Compute | Rule-Based / ML-Based / Round-Robin |
| Customer Service | Compute | Shared DB Module / Separate Service / Event-Sourced |
| Expert Service | Compute | Shared DB Module / Separate Service |
| Notification Service | Compute | Sync (HTTP) / Async (Queue) / Event-Driven |
| Database | Data Storage | Shared PostgreSQL / Per-Service DBs / CQRS |
| Event Bus | Messaging | Kafka / RabbitMQ / Redis Pub/Sub |

**Key metrics trade-offs:**
- Shared DB: Simple ops, low cost, but tight coupling — one schema change breaks everything
- Per-Service DB: Independent deployment, but saga patterns needed for cross-service transactions
- CQRS: Read optimization + event sourcing, but operational complexity spikes

**Why perfect for Archie:** Directly demonstrates the decomposition spectrum. Swapping Shared DB for Per-Service DBs causes cascading metric changes across Ops, Reliability, Scalability, and Developer Experience.

---

## Recommendation #3: Log-Based Stream Processing (DDIA Ch. 11)

**Source:** Kleppmann's event streaming architecture — Kafka as the central nervous system.

**Architecture story:** A real-time data pipeline ingests events, processes them through stream operators, and materializes derived views in multiple downstream stores. The same event log feeds a search index, an analytics warehouse, and a notification system.

**Components:**
| Component | Category | Variants |
|-----------|----------|----------|
| Producer API | Compute | Express.js / Fastify / Go API |
| Event Log | Messaging | Kafka / AWS Kinesis / Redpanda |
| Stream Processor | Compute | Kafka Streams / Apache Flink / Simple Consumer |
| Primary Database | Data Storage | PostgreSQL / MongoDB / CockroachDB |
| Search Index | Search | Elasticsearch / Meilisearch / PostgreSQL FTS |
| Analytics Store | Data Storage | ClickHouse / BigQuery / TimescaleDB |
| Cache Layer | Caching | Redis / Memcached / KeyDB |

**Key metrics trade-offs:**
- Simple Consumer: Low ops, easy to debug, but limited windowing/aggregation
- Kafka Streams: Library (no cluster), good for simple transforms, limited to Kafka
- Apache Flink: Full-featured (windowing, exactly-once), but heavy operational burden
- Adding Elasticsearch: Powerful search, but index management + cluster ops + storage cost

**Why perfect for Archie:** Multiple downstream consumers from the same log — each one is an independent trade-off. Swapping stream processors or adding/removing derived stores creates rich metric ripple effects.

---

## Recommendation #4: Auction System — Event-Driven (Hard Parts Ch. 14-15)

**Source:** Ford & Richards' event-driven architecture example with saga coordination patterns.

**Architecture story:** A real-time auction system handles bids, validates them, processes payments, and sends notifications. The critical question: should bid validation be synchronous (consistent but slow) or async (fast but risk phantom bids)? Orchestration vs choreography saga patterns affect debuggability and coupling.

**Components:**
| Component | Category | Variants |
|-----------|----------|----------|
| Bid API | Compute | Express.js / Fastify / Go API |
| Auction Engine | Compute | Synchronous Validation / Async Event-Driven / CQRS |
| Payment Service | Compute | Sync (Stripe SDK) / Async (Queue + Webhook) / Saga Orchestrator |
| Notification Service | Compute | Email (SMTP) / Push (WebSocket) / Multi-Channel |
| Event Bus | Messaging | Kafka / RabbitMQ / AWS EventBridge |
| Bid Store | Data Storage | PostgreSQL / Redis + PostgreSQL / Event Store |
| Cache Layer | Caching | Redis / Memcached / Local Cache |

**Key metrics trade-offs:**
- Sync validation: Strong consistency (no phantom bids), but latency spike under load
- Async event-driven: Sub-10ms bid acceptance, but eventual consistency — last-second bids may conflict
- Orchestration saga: Centralized flow control, easy to debug, but orchestrator is SPOF
- Choreography saga: No SPOF, loose coupling, but distributed debugging nightmare

**Why perfect for Archie:** The sync-vs-async and orchestration-vs-choreography toggles are the exact kind of configuration variant that causes dramatic metric shifts across Reliability, Performance, Ops, and Developer Experience.

---

## Implementation Order

1. **Twitter Home Timeline** — Most iconic, teaches fan-out trade-off
2. **Sysops Squad** — Teaches decomposition spectrum (monolith → microservices)
3. **Log-Based Stream Processing** — Teaches derived data and stream processing trade-offs
4. **Auction System** — Teaches saga patterns and consistency models

Each playground file follows the same structure as `archie-ux-playground.html` — self-contained single-file HTML with the same dark theme, canvas, toolbox, inspector, and dashboard.
