import { METRIC_MAX_VALUE } from "@/lib/constants"

/** Convert a 0-10 score to a 1-5 star rating. 0 maps to 0 stars (no data). */
export function scoreToStars(score: number): number {
  if (score <= 0) return 0
  return Math.max(1, Math.min(5, Math.round((score / METRIC_MAX_VALUE) * 5)))
}

/** Star fill percentage for smooth bar rendering (0-100). */
export function scoreToStarPercent(score: number): number {
  return Math.max(0, Math.min(100, (score / METRIC_MAX_VALUE) * 100))
}

/** Star color based on the WoW rarity ramp. */
export function starColor(stars: number): string {
  if (stars >= 4) return "#3fcf6a"
  if (stars >= 3) return "#3b9dff"
  if (stars >= 2) return "#b06bff"
  return "#ff8a3d"
}

/** Descriptions + factors for each metric category — shown in the popover. */
export const METRIC_INFO: Record<string, { name: string; description: string; factors: string[] }> = {
  performance: {
    name: "Performance",
    description: "How fast the system responds to requests under load.",
    factors: ["Component latency (base + load-dependent)", "Number of hops in the request path", "Cache hit ratio", "Load balancer overhead"],
  },
  reliability: {
    name: "Reliability",
    description: "How consistently the system stays available and handles failures.",
    factors: ["Redundancy (replicas across zones)", "Failover mechanisms", "Health monitoring", "Single points of failure"],
  },
  scalability: {
    name: "Scalability",
    description: "How well the system handles increasing traffic and data growth.",
    factors: ["Horizontal scaling (replicas)", "Load balancer presence", "Queue/stream decoupling", "Stateless compute tier"],
  },
  security: {
    name: "Security",
    description: "How well the system protects against threats and unauthorized access.",
    factors: ["Auth/identity tier", "Rate limiting", "WAF / SIEM presence", "Encryption in transit (HTTPS)"],
  },
  "operational-complexity": {
    name: "Operational Simplicity",
    description: "How easy the system is to operate, monitor, and maintain.",
    factors: ["Number of distinct components", "Observability coverage", "Managed vs self-hosted services", "Configuration complexity"],
  },
  "cost-efficiency": {
    name: "Cost Efficiency",
    description: "How economically the system uses resources for the traffic it handles.",
    factors: ["Monthly cost per component", "Over-provisioned capacity", "Serverless vs always-on", "Cache reducing backend load"],
  },
  "developer-experience": {
    name: "Developer Experience",
    description: "How easy the system is to develop against, test, and deploy.",
    factors: ["API clarity and documentation", "Local development complexity", "CI/CD friendliness", "Technology familiarity"],
  },
}
