import { Component, type ErrorInfo, type ReactNode } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("Canvas error caught by boundary:", error, errorInfo)
    }
  }

  handleReset = (): void => {
    useArchitectureStore.getState().setNodes([])
    useArchitectureStore.getState().setEdges([])
    useUiStore.getState().clearSelection()
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          data-testid="canvas-error-fallback"
          className="flex h-full w-full flex-col items-center justify-center gap-4 bg-canvas p-8"
        >
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-semibold text-text-primary">
            Something went wrong with the canvas
          </h2>
          <p className="text-sm text-text-secondary">
            An unexpected error occurred. You can reset the canvas to recover.
          </p>
          <Button
            data-testid="canvas-error-reset-button"
            onClick={this.handleReset}
            variant="outline"
          >
            Reset Canvas
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
