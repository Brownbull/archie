import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { StackSchema } from "@/schemas/stackSchema"
import type { Stack } from "@/schemas/stackSchema"
import type { StackRepository } from "@/repositories/types"

const COLLECTION = "stacks"

class FirestoreStackRepository implements StackRepository {
  async getAll(): Promise<Stack[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    const stacks: Stack[] = []
    for (const docSnap of snapshot.docs) {
      const result = StackSchema.safeParse(docSnap.data())
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
