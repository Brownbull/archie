# Archie AI Prompt Template

Use this template to ask any AI (Claude, ChatGPT, etc.) to generate Archie-compatible architecture YAML.

---

## Instructions for AI

You are helping design a software architecture using Archie, a visual architecture simulator. Generate a YAML file that follows the Archie schema exactly.

**Rules:**
- `schema_version` must be `"1.0.0"`
- All `component_id` values must come from the Available Components list below
- All `config_variant_id` values must match the variants listed for that component
- Node `id` values must be unique strings (e.g., `"n1"`, `"n2"`)
- Edge `id` values must be unique strings (e.g., `"e1"`, `"e2"`)
- Positions use pixel coordinates — space nodes at least 200px apart
- Edges reference node IDs via `source_node_id` and `target_node_id`

---

## YAML Schema

```yaml
schema_version: "1.0.0"
name: "Optional architecture name"
nodes:
  - id: "n1"
    component_id: "<component-id>"
    config_variant_id: "<variant-id>"
    position:
      x: 96
      y: 192
  - id: "n2"
    component_id: "<component-id>"
    config_variant_id: "<variant-id>"
    position:
      x: 320
      y: 192
edges:
  - id: "e1"
    source_node_id: "n1"
    target_node_id: "n2"
```

---

## Available Components

| Component ID | Config Variant IDs |
|---|---|
| `cloudflare-cdn` | `static-caching`, `full-site` |
| `kafka` | `single-broker`, `multi-broker` |
| `nginx` | `reverse-proxy`, `load-balancer` |
| `node-express` | `single-process`, `cluster-mode` |
| `postgresql` | `single-node`, `primary-replica`, `citus-distributed` |
| `prometheus` | `standalone`, `federated` |
| `rabbitmq` | `single-node`, `clustered` |
| `redis-cache` | `simple-cache`, `distributed-cache` |
| `redis` | `standalone`, `sentinel`, `cluster` |
| `websocket-server` | `single-server`, `clustered` |

---

## Complete Example (WhatsApp-style Messaging)

```yaml
schema_version: "1.0.0"
name: "WhatsApp-style Messaging"
nodes:
  - id: "n1"
    component_id: "cloudflare-cdn"
    config_variant_id: "full-site"
    position:
      x: 96
      y: 192
  - id: "n2"
    component_id: "nginx"
    config_variant_id: "load-balancer"
    position:
      x: 320
      y: 192
  - id: "n3"
    component_id: "node-express"
    config_variant_id: "cluster-mode"
    position:
      x: 544
      y: 192
  - id: "n4"
    component_id: "kafka"
    config_variant_id: "multi-broker"
    position:
      x: 768
      y: 192
  - id: "n5"
    component_id: "postgresql"
    config_variant_id: "primary-replica"
    position:
      x: 544
      y: 416
edges:
  - id: "e1"
    source_node_id: "n1"
    target_node_id: "n2"
  - id: "e2"
    source_node_id: "n2"
    target_node_id: "n3"
  - id: "e3"
    source_node_id: "n3"
    target_node_id: "n4"
  - id: "e4"
    source_node_id: "n3"
    target_node_id: "n5"
```

---

## Prompt to Use

Copy and paste the following into your AI chat:

> "Generate an Archie-compatible YAML architecture for [describe your use case]. Use only component IDs and config_variant_IDs from the Available Components table. Follow the schema exactly. Return only the YAML, no explanation."
