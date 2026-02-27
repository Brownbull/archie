import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MetricCategorySchema } from "@/schemas/metricCategorySchema"
import type { MetricCategory } from "@/schemas/metricCategorySchema"
import type { MetricCategoryRepository } from "@/repositories/types"

export class RepositoryError extends Error {
  readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = "RepositoryError"
    this.cause = cause
  }
}

const COLLECTION = "metricCategories"

class FirestoreMetricCategoryRepository implements MetricCategoryRepository {
  async getAll(): Promise<MetricCategory[]> {
    let snapshot
    try {
      snapshot = await getDocs(collection(db, COLLECTION))
    } catch (error) {
      throw new RepositoryError("Failed to fetch metricCategories from Firestore", error)
    }
    const categories: MetricCategory[] = []
    for (const docSnap of snapshot.docs) {
      const result = MetricCategorySchema.safeParse(docSnap.data())
      if (result.success) {
        categories.push(result.data)
      } else {
        if (import.meta.env.DEV) {
          console.error("Invalid metricCategory document:", result.error.issues)
        }
      }
    }
    return categories
  }
}

export const metricCategoryRepository: MetricCategoryRepository =
  new FirestoreMetricCategoryRepository()
