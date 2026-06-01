import type { ConfigVariant } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatVariantStats } from "@/lib/formatStats"

interface ConfigSelectorProps {
  variants: ConfigVariant[]
  activeVariantId: string
  onVariantChange: (variantId: string) => void
}

export function ConfigSelector({
  variants,
  activeVariantId,
  onVariantChange,
}: ConfigSelectorProps) {
  return (
    <div data-testid="config-selector" className="space-y-1">
      <label
        id="config-selector-label"
        className="text-xs font-medium text-text-secondary"
        title="Configuration tier — a cost vs. performance/scale trade-off for this provider. Each tier carries its own $/mo, throughput, and latency."
      >
        Configuration
      </label>
      <Select value={activeVariantId} onValueChange={onVariantChange}>
        <SelectTrigger className="w-full" aria-labelledby="config-selector-label">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {variants.map((variant) => {
            const stats = formatVariantStats(variant)
            return (
              <SelectItem key={variant.id} value={variant.id}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{variant.name}</span>
                  {stats && <span className="text-[0.625rem] text-text-secondary">{stats}</span>}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
