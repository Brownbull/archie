import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { StackDefinitionSchema } from "@/schemas/stackSchema"
import type { Stack } from "@/schemas/stackSchema"
import type { StackRepository } from "@/repositories/types"

const COLLECTION = "stacks"

class FirestoreStackRepository implements StackRepository {
  /**
   * Fetches all stack documents from Firestore and returns only those that pass
   * schema validation. Invalid documents are silently dropped (DEV-only console.error).
   *
   * This is an intentional cross-cutting pattern: a single malformed document must not
   * crash the stack browser. Firestore data should be validated at the source (seed
   * scripts or admin tools), not at read time. Same pattern used in architectureStore.
   */
  async getAll(): Promise<Stack[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    const stacks: Stack[] = []
    for (const docSnap of snapshot.docs) {
      const result = StackDefinitionSchema.safeParse(docSnap.data())
      if (result.success) {
        stacks.push(result.data)
      } else {
        if (import.meta.env.DEV) {
          console.error("Invalid stack document:", result.error.issues)
        }
      }
    }
    return stacks
  }
}

export const stackRepository: StackRepository = new FirestoreStackRepository()
