import type { ConfigVariant } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
      <label id="config-selector-label" className="text-xs font-medium text-text-secondary">
        Configuration
      </label>
      <Select value={activeVariantId} onValueChange={onVariantChange}>
        <SelectTrigger className="w-full" aria-labelledby="config-selector-label">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {variants.map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              {variant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
