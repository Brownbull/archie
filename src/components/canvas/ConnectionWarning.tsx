import { AlertTriangle, Unplug } from "lucide-react"

interface ConnectionWarningProps {
  reason: string | null
  isPortMismatch?: boolean
}

export function ConnectionWarning({ reason, isPortMismatch }: ConnectionWarningProps) {
  const Icon = isPortMismatch ? Unplug : AlertTriangle
  const defaultLabel = isPortMismatch ? "Port type mismatch" : "Incompatible connection"
  return (
    <div
      data-testid="connection-warning"
      data-port-mismatch={isPortMismatch || undefined}
      title={reason ?? defaultLabel}
      aria-label={reason ?? defaultLabel}
      role="status"
      className="flex items-center justify-center rounded-full bg-amber-500/20 p-1"
    >
      <Icon className="h-3.5 w-3.5 text-amber-500" />
    </div>
  )
}
