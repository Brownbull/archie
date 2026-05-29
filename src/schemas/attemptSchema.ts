import { z } from "zod"
import { MAX_SCHEMA_STRING_LENGTH } from "@/lib/constants"

/**
 * A persisted challenge attempt (Epic 17 Phase 4). Owner-scoped by userId and immutable once
 * written. Mirrors what the results modal snapshots — requestsTotal/requestsFailed from the roadmap
 * are omitted as redundant with uptimePercent (served/total ratio). See D36.
 */
export interface AttemptRecord {
  id: string
  userId: string
  challengeId: string
  stars: number
  uptimePercent: number
  p99LatencyMs: number
  totalCost: number
  topologyIssueCount: number
  /** Epoch milliseconds (from the Firestore server timestamp on read). */
  createdAt: number
}

/** The fields written to / read from the Firestore document (excludes id + the server timestamp). */
export const AttemptStoredSchema = z
  .object({
    userId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
    challengeId: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
    stars: z.number().int().min(0).max(3),
    uptimePercent: z.number().min(0).max(100),
    p99LatencyMs: z.number().min(0).max(600_000),
    totalCost: z.number().min(0).max(100_000_000),
    topologyIssueCount: z.number().int().min(0).max(10_000),
  })
  .strict()

export type AttemptStored = z.infer<typeof AttemptStoredSchema>
