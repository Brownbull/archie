import { ArrowUp, ArrowDown, Minus } from "lucide-react"

interface DeltaChipProps {
  testid: string
  label: string
  value: number
  decimals: number
  unit: string
  /** True for metrics where lower is better (cost, latency); false where higher is better (uptime). */
  goodWhenNegative: boolean
}

/**
 * A single labelled delta chip. Tone, icon, and sign are ALL derived from the value AFTER it is
 * rounded to display precision, so they never contradict each other (a −0.06ms delta rounds to 0
 * and reads as neutral, not as a green "+0"). `goodWhenNegative` for metrics where lower is better.
 */
export function DeltaChip({ testid, label, value, decimals, unit, goodWhenNegative }: DeltaChipProps) {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor || 0 // `|| 0` normalizes -0 → 0
  const neutral = rounded === 0
  const improved = goodWhenNegative ? rounded < 0 : rounded > 0
  const tone = neutral ? "text-text-secondary" : improved ? "text-emerald-400" : "text-red-400"
  const Icon = neutral ? Minus : rounded > 0 ? ArrowUp : ArrowDown
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : ""
  return (
    <div data-testid={testid} data-tone={neutral ? "neutral" : improved ? "good" : "bad"} className={`flex items-center gap-1 text-[0.6875rem] ${tone}`}>
      <Icon className="h-3 w-3" />
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium">{`${sign}${Math.abs(rounded).toFixed(decimals)} ${unit}`}</span>
    </div>
  )
}
