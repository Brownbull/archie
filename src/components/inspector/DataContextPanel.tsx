import { useState, useMemo, useCallback } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useArchitectureStore } from "@/stores/architectureStore"
import { evaluateFitBatch } from "@/engine/fitEvaluator"
import { FitIndicator } from "@/components/inspector/FitIndicator"
import { Button } from "@/components/ui/button"
import {
  ACCESS_PATTERN_VALUES,
  DATA_SIZE_VALUES,
  STRUCTURE_TYPE_VALUES,
  DATA_CONTEXT_NAME_MAX_LENGTH,
  MAX_DATA_CONTEXT_ITEMS_PER_NODE,
} from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"
import type { AccessPattern, DataSize, StructureType } from "@/lib/constants"

interface DataContextPanelProps {
  nodeId: string
  dataFitProfile: Record<string, string> | undefined
}

type FormMode = "idle" | "add" | { editingItemId: string }

interface FormState {
  name: string
  accessPattern: AccessPattern
  averageSize: DataSize
  structureType: StructureType
}

const DEFAULT_FORM: FormState = {
  name: "",
  accessPattern: "read-heavy",
  averageSize: "small",
  structureType: "simple-kv",
}

export function DataContextPanel({ nodeId, dataFitProfile }: DataContextPanelProps) {
  const items = useArchitectureStore(
    useShallow((s) => s.dataContextItems.get(nodeId) ?? []),
  )
  const addItem = useArchitectureStore((s) => s.addDataContextItem)
  const updateItem = useArchitectureStore((s) => s.updateDataContextItem)
  const removeItem = useArchitectureStore((s) => s.removeDataContextItem)

  const [formMode, setFormMode] = useState<FormMode>("idle")
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const fitResults = useMemo(
    () => evaluateFitBatch(items, dataFitProfile),
    [items, dataFitProfile],
  )

  const atLimit = items.length >= MAX_DATA_CONTEXT_ITEMS_PER_NODE

  const handleAdd = useCallback(() => {
    setForm(DEFAULT_FORM)
    setFormMode("add")
  }, [])

  const handleEdit = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setForm({
      name: item.name,
      accessPattern: item.accessPattern,
      averageSize: item.averageSize,
      structureType: item.structureType,
    })
    setFormMode({ editingItemId: itemId })
  }, [items])

  const handleCancel = useCallback(() => {
    setFormMode("idle")
    setForm(DEFAULT_FORM)
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmedName = sanitizeDisplayString(form.name.trim(), DATA_CONTEXT_NAME_MAX_LENGTH)
    if (!trimmedName) return

    if (formMode === "add") {
      addItem(nodeId, {
        name: trimmedName,
        accessPattern: form.accessPattern,
        averageSize: form.averageSize,
        structureType: form.structureType,
      })
    } else if (typeof formMode === "object" && "editingItemId" in formMode) {
      updateItem(nodeId, formMode.editingItemId, {
        name: trimmedName,
        accessPattern: form.accessPattern,
        averageSize: form.averageSize,
        structureType: form.structureType,
      })
    }

    setFormMode("idle")
    setForm(DEFAULT_FORM)
  }, [form, formMode, nodeId, addItem, updateItem])

  return (
    <div data-testid="data-context-panel" className="space-y-2 py-2">
      {items.length === 0 && formMode === "idle" && (
        <p className="text-xs text-text-secondary">
          No data context items. Add one to see fit analysis.
        </p>
      )}

      {items.map((item, index) => (
        <div
          key={item.id}
          data-testid={`data-context-item-${item.id}`}
          className="space-y-1 rounded border border-archie-border p-2"
        >
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-text-primary">{item.name}</span>
              <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-text-secondary">
                <span>{item.accessPattern}</span>
                <span>·</span>
                <span>{item.averageSize}</span>
                <span>·</span>
                <span>{item.structureType}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                data-testid={`data-context-edit-${item.id}`}
                onClick={() => handleEdit(item.id)}
                aria-label={`Edit ${sanitizeDisplayString(item.name, DATA_CONTEXT_NAME_MAX_LENGTH)}`}
                className="h-6 w-6"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`data-context-delete-${item.id}`}
                onClick={() => removeItem(nodeId, item.id)}
                aria-label={`Delete ${sanitizeDisplayString(item.name, DATA_CONTEXT_NAME_MAX_LENGTH)}`}
                className="h-6 w-6"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {fitResults[index] && (
            <FitIndicator itemId={item.id} fitResult={fitResults[index]} />
          )}
        </div>
      ))}

      {formMode !== "idle" && (
        <div data-testid="data-context-form" className="space-y-2 rounded border border-archie-border p-2">
          <input
            type="text"
            placeholder="Data item name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            maxLength={DATA_CONTEXT_NAME_MAX_LENGTH}
            className="w-full rounded border border-archie-border bg-transparent px-2 py-1 text-xs text-text-primary placeholder:text-text-secondary"
          />
          <div className="grid grid-cols-3 gap-1">
            <select
              value={form.accessPattern}
              onChange={(e) => setForm((prev) => ({ ...prev, accessPattern: e.target.value as AccessPattern }))}
              className="rounded border border-archie-border bg-transparent px-1 py-1 text-[10px] text-text-primary"
              data-testid="data-context-select-access"
              aria-label="Access pattern"
            >
              {ACCESS_PATTERN_VALUES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select
              value={form.averageSize}
              onChange={(e) => setForm((prev) => ({ ...prev, averageSize: e.target.value as DataSize }))}
              className="rounded border border-archie-border bg-transparent px-1 py-1 text-[10px] text-text-primary"
              data-testid="data-context-select-size"
              aria-label="Average size"
            >
              {DATA_SIZE_VALUES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select
              value={form.structureType}
              onChange={(e) => setForm((prev) => ({ ...prev, structureType: e.target.value as StructureType }))}
              className="rounded border border-archie-border bg-transparent px-1 py-1 text-[10px] text-text-primary"
              data-testid="data-context-select-structure"
              aria-label="Structure type"
            >
              {STRUCTURE_TYPE_VALUES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              data-testid="data-context-form-submit"
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              className="h-6 px-2 text-[10px]"
            >
              {formMode === "add" ? "Add" : "Save"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-testid="data-context-form-cancel"
              onClick={handleCancel}
              className="h-6 px-2 text-[10px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          data-testid="data-context-add-button"
          onClick={handleAdd}
          disabled={atLimit || formMode !== "idle"}
          className="h-6 gap-1 px-2 text-[10px]"
        >
          <Plus className="h-3 w-3" />
          Add Data Item
        </Button>
        {atLimit && (
          <span className="text-[10px] text-amber-500">{items.length}/{MAX_DATA_CONTEXT_ITEMS_PER_NODE} max</span>
        )}
      </div>
    </div>
  )
}
