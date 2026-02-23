import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { BlueprintFullSchema } from "@/schemas/blueprintSchema"
import type { BlueprintFull } from "@/schemas/blueprintSchema"
import type { BlueprintRepository } from "@/repositories/types"

const COLLECTION = "blueprints"

class FirestoreBlueprintRepository implements BlueprintRepository {
  async getAll(): Promise<BlueprintFull[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    const blueprints: BlueprintFull[] = []
    for (const docSnap of snapshot.docs) {
      const result = BlueprintFullSchema.safeParse(docSnap.data())
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
