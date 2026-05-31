import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

interface InspectorDisclosureProps {
  title: ReactNode
  /** data-testid for the trigger button. */
  testId?: string
  defaultOpen?: boolean
  titleClassName?: string
  children: ReactNode
}

/**
 * Collapse-by-default disclosure for inspector sections (P3 density). The verbose detail
 * (IS / Gains / Costs / Recommendations / Metrics) lives behind these so the inspector
 * leads with the essentials. `forceMount` + `data-[state=closed]:hidden` keeps children in
 * the DOM when collapsed — content stays queryable/accessible and skips re-mount cost while
 * being visually hidden.
 */
export function InspectorDisclosure({
  title,
  testId,
  defaultOpen = false,
  titleClassName,
  children,
}: InspectorDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          aria-expanded={open}
          className="flex w-full items-center justify-between py-1 text-xs font-medium text-text-primary"
        >
          <span className={titleClassName}>{title}</span>
          {open ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
