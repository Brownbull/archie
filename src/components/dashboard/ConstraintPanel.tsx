import { useMemo, useState } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { METRIC_CATEGORIES, type Constraint, type ConstraintOperator, type MetricCategoryId } from "@/lib/constants"
import { CATEGORY_LOOKUP } from "@/lib/categoryLookup"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react"

const OPERATOR_LABELS: Record<ConstraintOperator, string> = {
  lte: "at most",
  gte: "at least",
}

interface ConstraintFormState {
  categoryId: MetricCategoryId
  operator: ConstraintOperator
  threshold: string
  label: string
}

interface ConstraintFormProps {
  formState: ConstraintFormState
  onFormChange: (patch: Partial<ConstraintFormState>) => void
  editingId: string | null
  onSave: () => void
  onCancel: () => void
}

function ConstraintForm({
  formState, onFormChange,
  editingId, onSave, onCancel,
}: ConstraintFormProps) {
  return (
    <div className="space-y-2 rounded-md border border-archie-border p-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          data-testid="constraint-category-select"
          value={formState.categoryId}
          onChange={(e) => onFormChange({ categoryId: e.target.value as MetricCategoryId })}
          className="rounded-md border border-archie-border bg-surface px-2 py-1 text-sm"
        >
          {METRIC_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          data-testid="constraint-operator-select"
          value={formState.operator}
          onChange={(e) => onFormChange({ operator: e.target.value as ConstraintOperator })}
          className="rounded-md border border-archie-border bg-surface px-2 py-1 text-sm"
        >
          <option value="lte">at most (≤)</option>
          <option value="gte">at least (≥)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          data-testid="constraint-threshold-input"
          type="number"
          min={1}
          max={10}
          step={0.1}
          value={formState.threshold}
          onChange={(e) => onFormChange({ threshold: e.target.value })}
          placeholder="Threshold (1-10)"
          className="h-8 text-sm"
        />
        <Input
          data-testid="constraint-label-input"
          type="text"
          maxLength={100}
          value={formState.label}
          onChange={(e) => onFormChange({ label: e.target.value })}
          placeholder="Label (optional)"
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSave}
          data-testid="constraint-save-button"
          className="h-7"
        >
          {editingId ? "Update" : "Add"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          data-testid="constraint-cancel-button"
          className="h-7"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface ConstraintPanelProps {
  onCloseOverlay?: () => void
}

export function ConstraintPanel({ onCloseOverlay }: ConstraintPanelProps) {
  const constraints = useArchitectureStore((s) => s.constraints)
  const constraintViolations = useArchitectureStore((s) => s.constraintViolations)
  const nodes = useArchitectureStore((s) => s.nodes)
  const addConstraint = useArchitectureStore((s) => s.addConstraint)
  const updateConstraint = useArchitectureStore((s) => s.updateConstraint)
  const removeConstraint = useArchitectureStore((s) => s.removeConstraint)

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state (TD-6-3b: grouped into single object)
  const defaultFormState: ConstraintFormState = {
    categoryId: METRIC_CATEGORIES[0].id,
    operator: "lte",
    threshold: "5",
    label: "",
  }
  const [formState, setFormState] = useState<ConstraintFormState>(defaultFormState)
  function onFormChange(patch: Partial<ConstraintFormState>) {
    setFormState((prev) => ({ ...prev, ...patch }))
  }

  const nodeNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of nodes) {
      map.set(node.id, node.data.componentName)
    }
    return map
  }, [nodes])

  const constraintMap = useMemo(() => {
    const map = new Map<string, Constraint>()
    for (const c of constraints) map.set(c.id, c)
    return map
  }, [constraints])

  function resetForm() {
    setFormState(defaultFormState)
  }

  function handleAdd() {
    setIsAdding(true)
    setEditingId(null)
    resetForm()
  }

  function handleEdit(constraint: Constraint) {
    setEditingId(constraint.id)
    setIsAdding(false)
    setFormState({
      categoryId: constraint.categoryId,
      operator: constraint.operator,
      threshold: String(constraint.threshold),
      label: constraint.label,
    })
  }

  function handleSave() {
    const threshold = Math.min(10, Math.max(1, Number(formState.threshold) || 5))
    const validCategoryId = METRIC_CATEGORIES.some((c) => c.id === formState.categoryId) ? formState.categoryId : METRIC_CATEGORIES[0].id
    const validOperator: ConstraintOperator = formState.operator === "gte" ? "gte" : "lte"
    const catMeta = CATEGORY_LOOKUP.get(validCategoryId)
    const autoLabel = `${catMeta?.name ?? validCategoryId} ${OPERATOR_LABELS[validOperator]} ${threshold}`
    const label = (formState.label.trim() || autoLabel).slice(0, 100)

    if (editingId) {
      updateConstraint(editingId, {
        categoryId: validCategoryId,
        operator: validOperator,
        threshold,
        label,
      })
      setEditingId(null)
    } else {
      addConstraint({
        id: crypto.randomUUID(),
        categoryId: validCategoryId,
        operator: validOperator,
        threshold,
        label,
      })
      setIsAdding(false)
    }
    resetForm()
  }

  function handleCancel() {
    setIsAdding(false)
    setEditingId(null)
    resetForm()
  }

  function handleViolationClick(nodeId: string) {
    useUiStore.getState().setPendingNavNodeId(nodeId)
    onCloseOverlay?.()
  }

  const violationCount = constraintViolations.length

  return (
    <div data-testid="constraint-panel" className="space-y-3">
      {/* Status */}
      <div data-testid="constraint-status" className="flex items-center gap-2 text-sm">
        {constraints.length === 0 ? (
          <span className="text-text-secondary">No constraints defined</span>
        ) : violationCount > 0 ? (
          <>
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>
              {constraints.length} active, {violationCount} violation{violationCount !== 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <span>
            {constraints.length} active, <span className="text-green-600">All clear</span>
          </span>
        )}
      </div>

      {/* Constraint list */}
      {constraints.map((c) => {
        const catMeta = CATEGORY_LOOKUP.get(c.categoryId)
        const IconComponent = catMeta ? getCategoryIcon(catMeta.iconName) : null

        if (editingId === c.id) {
          return (
            <div key={c.id} data-testid={`constraint-item-${c.id}`}>
              <ConstraintForm
                formState={formState} onFormChange={onFormChange}
                editingId={editingId} onSave={handleSave} onCancel={handleCancel}
              />
            </div>
          )
        }

        return (
          <div
            key={c.id}
            data-testid={`constraint-item-${c.id}`}
            className="flex items-center gap-2 rounded-md border border-archie-border px-2 py-1.5 text-sm"
          >
            {IconComponent && (
              <IconComponent className="h-3.5 w-3.5 shrink-0" style={{ color: catMeta?.color }} />
            )}
            <span className="truncate font-medium">{c.label}</span>
            <span className="ml-auto shrink-0 text-text-secondary">
              {OPERATOR_LABELS[c.operator]} <span className="font-semibold">{c.threshold}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleEdit(c)}
              data-testid={`constraint-edit-${c.id}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => removeConstraint(c.id)}
              data-testid={`constraint-delete-${c.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )
      })}

      {/* Inline add form */}
      {isAdding && (
        <div data-testid="constraint-form">
          <ConstraintForm
            formState={formState} onFormChange={onFormChange}
            editingId={editingId} onSave={handleSave} onCancel={handleCancel}
          />
        </div>
      )}

      {/* Add button */}
      {!isAdding && !editingId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          data-testid="constraint-add-button"
          className="w-full"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Constraint
        </Button>
      )}

      {/* Violation list */}
      {violationCount > 0 && (
        <div data-testid="constraint-violation-list" className="space-y-1">
          <p className="text-xs font-medium text-text-secondary">Violations</p>
          {constraintViolations.map((v) => {
            const nodeName = nodeNameMap.get(v.nodeId) ?? v.nodeId
            const constraint = constraintMap.get(v.constraintId)
            return (
              <button
                key={`${v.constraintId}-${v.nodeId}`}
                data-testid={`constraint-violation-entry-${v.nodeId}`}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/50"
                onClick={() => handleViolationClick(v.nodeId)}
              >
                <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
                <span className="truncate font-medium">{nodeName}</span>
                {constraint && (
                  <span className="truncate text-xs text-text-secondary">
                    {constraint.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
