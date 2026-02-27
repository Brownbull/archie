/**
 * Seed Firestore with metric category data for CategoryInfoPopup content.
 *
 * Usage:
 *   npm run seed:metric-categories              # Seed metricCategories collection
 *   npm run seed:metric-categories -- --dry-run  # Validate only, no writes
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
 */

import {
  initializeApp,
  cert,
} from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { MetricCategorySchema } from "../src/schemas/metricCategorySchema"
import type { MetricCategory } from "../src/schemas/metricCategorySchema"
import { validateServiceAccountFile } from "./seed-firestore"

const COLLECTION = "metricCategories"

/** All 7 metric categories with descriptive content and 3-tier score interpretations. */
const METRIC_CATEGORIES_DATA: MetricCategory[] = [
  {
    id: "performance",
    name: "Performance",
    description: "Measures response times, throughput, and resource utilization across your architecture components.",
    whyItMatters: "Performance directly impacts user experience — slow responses drive users away. It also affects operational cost since inefficient components consume more resources under load.",
    icon: "Gauge",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3.99, text: "Critical: Your architecture has significant performance bottlenecks. Consider introducing caching layers, optimizing database queries, or switching to more performant component variants." },
      { minScore: 4, maxScore: 6.99, text: "Moderate: Performance is acceptable but has room for improvement. Look at your slowest components and consider configuration changes or adding a CDN/cache layer." },
      { minScore: 7, maxScore: 10, text: "Strong: Your architecture is well-optimized for performance. Components are configured for low latency and high throughput." },
    ],
  },
  {
    id: "reliability",
    name: "Reliability",
    description: "Measures uptime guarantees, failover capabilities, and fault tolerance of your architecture.",
    whyItMatters: "Reliability determines whether your system stays available when things go wrong. Without redundancy and failover, a single component failure can cascade into a full outage.",
    icon: "ShieldCheck",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3.99, text: "Critical: Your architecture lacks redundancy and fault tolerance. Single points of failure exist. Consider adding replication, health checks, and circuit breakers." },
      { minScore: 4, maxScore: 6.99, text: "Moderate: Basic reliability is in place but gaps remain. Review components without failover configurations and consider multi-region deployment." },
      { minScore: 7, maxScore: 10, text: "Strong: Your architecture is highly resilient with strong failover and redundancy patterns across components." },
    ],
  },
  {
    id: "scalability",
    name: "Scalability",
    description: "Measures the ability of your architecture to handle growth in users, data, and traffic.",
    whyItMatters: "Scalability determines whether your system can grow with demand. An architecture that works for 100 users but breaks at 10,000 becomes a business blocker.",
    icon: "TrendingUp",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3.99, text: "Critical: Your architecture will struggle to scale. Look for components with fixed capacity limits and consider horizontal scaling configurations." },
      { minScore: 4, maxScore: 6.99, text: "Moderate: Some scalability is built in, but bottlenecks may emerge under heavy load. Review components with the lowest scalability scores." },
      { minScore: 7, maxScore: 10, text: "Strong: Your architecture is designed for growth with elastic scaling and distributed patterns across most components." },
    ],
  },
  {
    id: "security",
    name: "Security",
    description: "Measures protection against threats, data encryption, access control, and vulnerability exposure.",
    whyItMatters: "Security breaches destroy user trust and can have legal consequences. Every component in your architecture is a potential attack surface that needs appropriate hardening.",
    icon: "Lock",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3.99, text: "Critical: Significant security gaps exist. Review components for encryption at rest/transit, access controls, and known vulnerability exposure." },
      { minScore: 4, maxScore: 6.99, text: "Moderate: Basic security measures are in place but hardening is needed. Focus on components handling sensitive data or exposed to public traffic." },
      { minScore: 7, maxScore: 10, text: "Strong: Your architecture has comprehensive security coverage with encryption, access controls, and hardened configurations." },
    ],
  },
  {
    id: "operational-complexity",
    name: "Operational Simplicity",
    description: "Measures ease of deployment, monitoring, debugging, and day-to-day operational burden.",
    whyItMatters: "Operational complexity is a hidden cost — a system that is hard to deploy, monitor, or debug slows down your team and increases the risk of human error during incidents.",
    icon: "Wrench",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3.99, text: "Critical: Your architecture is operationally complex. Many components require specialized knowledge to deploy and maintain. Consider managed services or simpler alternatives." },
      { minScore: 4, maxScore: 6.99, text: "Moderate: Operations are manageable but could be simpler. Look for self-managed components that have managed alternatives." },
      { minScore: 7, maxScore: 10, text: "Strong: Your architecture favors operational simplicity with managed services and straightforward deployment patterns." },
    ],
  },
  {
    id: "cost-efficiency",
    name: "Cost Efficiency",
    description: "Measures resource cost optimization, pay-per-use alignment, and cost predictability.",
    whyItMatters: "Cloud costs can spiral quickly. An architecture that is cost-efficient at small scale may become prohibitively expensive as usage grows, especially with per-request or per-GB pricing models.",
    icon: "DollarSign",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3.99, text: "Critical: Your architecture may have significant cost inefficiencies. Review provisioned-capacity components and consider right-sizing or switching to pay-per-use alternatives." },
      { minScore: 4, maxScore: 6.99, text: "Moderate: Costs are reasonable but could be optimized. Look at the most expensive components for cheaper configuration variants." },
      { minScore: 7, maxScore: 10, text: "Strong: Your architecture is cost-optimized with efficient resource utilization and predictable pricing patterns." },
    ],
  },
  {
    id: "developer-experience",
    name: "Developer Experience",
    description: "Measures API ergonomics, documentation quality, tooling support, and learning curve.",
    whyItMatters: "Developer experience affects how quickly your team can build, debug, and iterate. Components with poor DX slow down development and increase the chance of implementation errors.",
    icon: "Code",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3.99, text: "Critical: Developer experience is poor across many components. Consider alternatives with better SDKs, documentation, and community support." },
      { minScore: 4, maxScore: 6.99, text: "Moderate: DX is acceptable but some components have steep learning curves or limited tooling. Review the lowest-scoring components for better alternatives." },
      { minScore: 7, maxScore: 10, text: "Strong: Your architecture uses developer-friendly components with excellent SDKs, documentation, and community ecosystem." },
    ],
  },
]

async function main() {
  const isDryRun = process.argv.includes("--dry-run")

  // Validate all categories against schema
  const validated: MetricCategory[] = []
  let hasErrors = false

  for (const cat of METRIC_CATEGORIES_DATA) {
    const result = MetricCategorySchema.safeParse(cat)
    if (result.success) {
      validated.push(result.data)
    } else {
      console.error(`Schema validation failed for "${cat.id}":`, result.error.issues)
      hasErrors = true
    }
  }

  if (hasErrors) {
    console.error("Validation errors found. Aborting.")
    process.exit(1)
  }

  console.log(`Validated ${validated.length} metric categories.`)

  if (isDryRun) {
    console.log("Dry run — no Firestore writes.")
    for (const cat of validated) {
      console.log(`  [OK] ${cat.id}: ${cat.name} (${cat.scoreInterpretations.length} interpretations)`)
    }
    return
  }

  // Initialize Firebase Admin
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credPath) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS env var not set.")
    process.exit(1)
  }

  const serviceAccount = validateServiceAccountFile(credPath)
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  // Write each category as a document with id as the document key
  const batch = db.batch()
  for (const cat of validated) {
    const ref = db.collection(COLLECTION).doc(cat.id)
    batch.set(ref, cat)
  }

  await batch.commit()
  console.log(`Seeded ${validated.length} metric categories to "${COLLECTION}" collection.`)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
