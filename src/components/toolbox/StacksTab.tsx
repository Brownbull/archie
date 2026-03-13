import { Component, useMemo, type ErrorInfo, type ReactNode } from "react"
import { componentLibrary } from "@/services/componentLibrary"
import { useLibrary } from "@/hooks/useLibrary"
import { StackCard, type ResolvedStackComponent } from "@/components/toolbox/StackCard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import type { StackDefinition } from "@/schemas/stackSchema"

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

  if (!isReady) {
    return (
      <div data-testid="stacks-tab-loading" className="space-y-3 p-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const stacks = componentLibrary.getStacks()

  const resolvedMap = useMemo(
    () => new Map(stacks.map((s) => [s.id, resolveStackComponents(s)])),
    [stacks],
  )

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
        {stacks.map((stack) => (
          <StackCard
            key={stack.id}
            stack={stack}
            resolvedComponents={resolvedMap.get(stack.id) ?? []}
          />
        ))}
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
