import { AlertTriangle } from "lucide-react"

interface ConstraintViolationBadgeProps {
  violationCount: number
  tooltipText?: string
}

export function ConstraintViolationBadge({
  violationCount,
  tooltipText,
}: ConstraintViolationBadgeProps) {
  if (violationCount <= 0) return null

  const label = `${violationCount} constraint violation${violationCount === 1 ? "" : "s"}`

  return (
    <div
      data-testid="constraint-violation-badge"
      role="status"
      aria-label={label}
      title={tooltipText}
      className="absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
    >
      <AlertTriangle className="h-3 w-3" />
      {violationCount}
    </div>
  )
}
