import { AlertTriangle } from "lucide-react"

interface ConnectionWarningProps {
  reason: string | null
}

export function ConnectionWarning({ reason }: ConnectionWarningProps) {
  return (
    <div
      data-testid="connection-warning"
      title={reason ?? "Incompatible connection"}
      aria-label={reason ?? "Incompatible connection"}
      role="status"
      className="flex items-center justify-center rounded-full bg-amber-500/20 p-1"
    >
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
    </div>
  )
}
