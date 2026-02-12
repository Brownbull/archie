import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ComponentSchema } from "@/schemas/componentSchema"
import type { Component } from "@/schemas/componentSchema"
import type { ComponentRepository } from "@/repositories/types"

const COLLECTION = "components"

function validateDoc(docData: unknown): Component | null {
  const result = ComponentSchema.safeParse(docData)
  if (!result.success) {
    if (import.meta.env.DEV) {
      console.error("Invalid component document:", result.error.issues)
    }
    return null
  }
  return result.data
}

class FirestoreComponentRepository implements ComponentRepository {
  async getAll(): Promise<Component[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    const components: Component[] = []
    for (const docSnap of snapshot.docs) {
      const validated = validateDoc(docSnap.data())
      if (validated) {
        components.push(validated)
      }
    }
    return components
  }

  async getById(id: string): Promise<Component | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id))
    if (!docSnap.exists()) {
      return null
    }
    return validateDoc(docSnap.data())
  }

  async getByCategory(category: string): Promise<Component[]> {
    const q = query(collection(db, COLLECTION), where("category", "==", category))
    const snapshot = await getDocs(q)
    const components: Component[] = []
    for (const docSnap of snapshot.docs) {
      const validated = validateDoc(docSnap.data())
      if (validated) {
        components.push(validated)
      }
    }
    return components
  }
}

export const componentRepository: ComponentRepository = new FirestoreComponentRepository()
