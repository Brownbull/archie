import { toast } from "sonner"
import { sanitizeDisplayString } from "@/lib/sanitize"
import {
  type DataContextItem,
  DATA_CONTEXT_NAME_MAX_LENGTH,
  MAX_DATA_CONTEXT_ITEMS_PER_NODE,
  ACCESS_PATTERN_VALUES,
  DATA_SIZE_VALUES,
  STRUCTURE_TYPE_VALUES,
} from "@/lib/constants"
import type { ArchitectureState } from "@/stores/architectureStore"

type Get = () => ArchitectureState
type Set = (partial: Partial<ArchitectureState>) => void

export interface DataContextActions {
  addDataContextItem: (nodeId: string, item: Omit<DataContextItem, "id">) => void
  updateDataContextItem: (nodeId: string, itemId: string, updates: Partial<Omit<DataContextItem, "id">>) => void
  removeDataContextItem: (nodeId: string, itemId: string) => void
}

/**
 * Per-node data-context item CRUD, extracted from architectureStore as a composed slice (D3).
 * Self-contained: manages only the `dataContextItems` map; no cross-action dependencies. Bodies
 * are verbatim from the original store — behavior-preserving.
 */
export function createDataContextActions(get: Get, set: Set): DataContextActions {
  return {
    addDataContextItem: (nodeId, item) => {
      const current = get().dataContextItems.get(nodeId) ?? []
      if (current.length >= MAX_DATA_CONTEXT_ITEMS_PER_NODE) {
        toast.warning(`Limit reached (${MAX_DATA_CONTEXT_ITEMS_PER_NODE} data items per component)`)
        return
      }
      const newItem: DataContextItem = {
        id: crypto.randomUUID(),
        name: sanitizeDisplayString(item.name, DATA_CONTEXT_NAME_MAX_LENGTH),
        accessPattern: item.accessPattern,
        averageSize: item.averageSize,
        structureType: item.structureType,
      }
      const next = new Map(get().dataContextItems)
      next.set(nodeId, [...current, newItem])
      set({ dataContextItems: next })
    },

    updateDataContextItem: (nodeId, itemId, updates) => {
      const current = get().dataContextItems.get(nodeId)
      if (!current) return
      if (!current.some((item) => item.id === itemId)) return
      // Runtime enum validation — TS types erased at runtime (review 7-3 fix #2)
      if (updates.accessPattern !== undefined && !(ACCESS_PATTERN_VALUES as readonly string[]).includes(updates.accessPattern)) return
      if (updates.averageSize !== undefined && !(DATA_SIZE_VALUES as readonly string[]).includes(updates.averageSize)) return
      if (updates.structureType !== undefined && !(STRUCTURE_TYPE_VALUES as readonly string[]).includes(updates.structureType)) return
      const next = new Map(get().dataContextItems)
      next.set(
        nodeId,
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...updates,
                ...(updates.name !== undefined
                  ? { name: sanitizeDisplayString(updates.name, DATA_CONTEXT_NAME_MAX_LENGTH) }
                  : {}),
              }
            : item,
        ),
      )
      set({ dataContextItems: next })
    },

    removeDataContextItem: (nodeId, itemId) => {
      const current = get().dataContextItems.get(nodeId)
      if (!current) return
      const filtered = current.filter((item) => item.id !== itemId)
      const next = new Map(get().dataContextItems)
      if (filtered.length === 0) {
        next.delete(nodeId)
      } else {
        next.set(nodeId, filtered)
      }
      set({ dataContextItems: next })
    },
  }
}
