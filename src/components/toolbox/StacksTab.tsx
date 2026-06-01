import { Component, useMemo, useState, type ErrorInfo, type ReactNode } from "react"
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { componentLibrary } from "@/services/componentLibrary"
import { useLibrary } from "@/hooks/useLibrary"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { maxTypeLevel, levelWithin } from "@/lib/componentTypes"
import { StackCard, type ResolvedStackComponent } from "@/components/toolbox/StackCard"
import { DataSourceNote } from "@/components/common/DataSourceNote"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import type { StackDefinition } from "@/schemas/stackSchema"

/** A stack's experience level = the highest level among its constituent block types. */
function stackLevel(stack: StackDefinition) {
  return maxTypeLevel(stack.components.map((sc) => componentLibrary.getComponent(sc.componentId)?.typeId))
}

// --- ErrorBoundary ---

interface ErrorBoundaryState {
  hasError: boolean
}

export class StacksErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("StacksTab error:", error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="stacks-tab-error"
          className="flex items-center justify-center p-6 text-sm text-text-secondary"
        >
          Could not load stacks. Try refreshing the page.
        </div>
      )
    }
    return this.props.children
  }
}

// --- Resolve component names from library ---

function resolveStackComponents(stack: StackDefinition): ResolvedStackComponent[] {
  return stack.components.map((sc) => {
    const comp = componentLibrary.getComponent(sc.componentId)
    const variant = comp?.configVariants.find((v) => v.id === sc.variantId)
    return {
      componentId: sc.componentId,
      variantId: sc.variantId,
      componentName: comp?.name ?? sc.componentId,
      variantName: variant?.name ?? sc.variantId,
      categoryId: comp?.category ?? "",
    }
  })
}

// --- StacksTabInner ---

function StacksTabInner() {
  const { isReady } = useLibrary()
  const experienceLevel = usePreferencesStore((s) => s.experienceLevel)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const { stacks, resolvedMap, levelMap } = useMemo(() => {
    const s = isReady ? componentLibrary.getStacks() : []
    return {
      stacks: s,
      resolvedMap: new Map(s.map((st) => [st.id, resolveStackComponents(st)])),
      levelMap: new Map(s.map((st) => [st.id, stackLevel(st)])),
    }
  }, [isReady])

  // P92/Phase D progressive disclosure: at/below-level stacks show; above-level ones collapse
  // into a "More advanced stacks" drawer so beginners aren't shown niche patterns up front.
  const inLevel = stacks.filter((st) => levelWithin(levelMap.get(st.id) ?? "beginner", experienceLevel))
  const advanced = stacks.filter((st) => !levelWithin(levelMap.get(st.id) ?? "beginner", experienceLevel))
  const advancedExpanded = advancedOpen || inLevel.length === 0

  if (!isReady) {
    return (
      <div data-testid="stacks-tab-loading" className="space-y-3 p-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (stacks.length === 0) {
    return (
      <div
        data-testid="stacks-tab-empty"
        className="flex items-center justify-center p-6 text-sm text-text-secondary"
      >
        No technology stacks available
      </div>
    )
  }

  return (
    <ScrollArea data-testid="stacks-tab" className="h-full">
      <div className="space-y-3 p-3">
        <DataSourceNote kind="stack" />
        {inLevel.map((stack) => (
          <StackCard
            key={stack.id}
            stack={stack}
            resolvedComponents={resolvedMap.get(stack.id) ?? []}
          />
        ))}

        {advanced.length > 0 && (
          <div data-testid="advanced-stacks">
            <button
              type="button"
              data-testid="advanced-stacks-toggle"
              aria-expanded={advancedExpanded}
              onClick={() => setAdvancedOpen((o) => !o)}
              className="mb-2 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 hover:bg-surface"
            >
              {advancedExpanded
                ? <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />
                : <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />}
              <Sparkles className="h-3.5 w-3.5 text-text-secondary" />
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
                More advanced stacks
              </h3>
              <span className="text-[0.625rem] text-text-secondary">({advanced.length})</span>
            </button>
            {advancedExpanded && (
              <div className="space-y-3">
                {advanced.map((stack) => (
                  <StackCard
                    key={stack.id}
                    stack={stack}
                    resolvedComponents={resolvedMap.get(stack.id) ?? []}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

// --- Public export ---

export function StacksTab() {
  return (
    <StacksErrorBoundary>
      <StacksTabInner />
    </StacksErrorBoundary>
  )
}
