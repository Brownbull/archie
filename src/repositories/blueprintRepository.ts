import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { BlueprintSchema } from "@/schemas/blueprintSchema"
import type { Blueprint } from "@/schemas/blueprintSchema"
import type { BlueprintRepository } from "@/repositories/types"

const COLLECTION = "blueprints"

class FirestoreBlueprintRepository implements BlueprintRepository {
  async getAll(): Promise<Blueprint[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    const blueprints: Blueprint[] = []
    for (const docSnap of snapshot.docs) {
      const result = BlueprintSchema.safeParse(docSnap.data())
      if (result.success) {
        blueprints.push(result.data)
      } else {
        if (import.meta.env.DEV) {
          console.error("Invalid blueprint document:", result.error.issues)
        }
      }
    }
    return blueprints
  }
}

export const blueprintRepository: BlueprintRepository = new FirestoreBlueprintRepository()
