import { DollarSign } from "lucide-react"
import { ECONOMICS_DISCLAIMER } from "@/lib/constants"

interface BudgetHudProps {
  totalCost: number
  nodeCount: number
}

function getCostColor(totalCost: number): string {
  if (totalCost === 0) return "text-text-secondary"
  if (totalCost <= 200) return "text-emerald-400"
  if (totalCost <= 500) return "text-yellow-400"
  return "text-orange-400"
}

export function BudgetHud({ totalCost, nodeCount }: BudgetHudProps) {
  if (nodeCount === 0) return null

  const color = getCostColor(totalCost)
  const displayCost = totalCost === 0 ? "Free" : `$${totalCost}/mo`

  return (
    <div
      data-testid="budget-hud"
      className="flex items-center gap-1.5 px-3"
      title={ECONOMICS_DISCLAIMER}
      role="status"
      aria-label={`Total architecture cost: ${displayCost}`}
    >
      <DollarSign className="h-3.5 w-3.5 text-text-secondary" />
      <span data-testid="budget-hud-cost" className={`text-sm font-semibold ${color}`}>
        {displayCost}
      </span>
      <span className="text-[10px] text-text-secondary">~approx</span>
    </div>
  )
}
