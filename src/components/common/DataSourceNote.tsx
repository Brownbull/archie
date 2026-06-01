import { Info } from "lucide-react"
import { InspectorDisclosure } from "@/components/inspector/InspectorDisclosure"

export type DataSourceKind = "block" | "blueprint" | "stack"

/**
 * Provenance / "where does this info come from" note. Archie's component, blueprint, and stack
 * data are AI-compiled directional reference — illustrative estimates, NOT vendor-published
 * benchmarks. This collapse-by-default disclosure surfaces that honestly so users treat the
 * figures as a learning aid and verify before production decisions. Reused on the block
 * inspector and the Stacks / Blueprints toolbox tabs.
 */
function noteFor(kind: DataSourceKind): string {
  switch (kind) {
    case "block":
      return "Metrics, cost, latency, and throughput shown here are AI-compiled from general engineering knowledge as directional estimates — a learning aid for comparing options, not vendor-published benchmarks or guarantees. Verify against official docs before production decisions."
    case "blueprint":
      return "Blueprints are AI-assisted reference designs — illustrative starting points drawn from common architecture patterns, not prescriptions. Their components, connections, and any figures are directional. Adapt and validate them for your actual requirements."
    case "stack":
      return "Stacks are AI-assisted reference groupings — common component combinations with directional trade-off profiles, not benchmarks. Treat them as a starting point and verify the fit for your workload."
  }
}

export function DataSourceNote({ kind }: { kind: DataSourceKind }) {
  return (
    <InspectorDisclosure
      testId={`data-source-${kind}`}
      title={
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3 shrink-0 text-text-secondary" aria-hidden />
          Data source
        </span>
      }
    >
      <p className="pt-0.5 text-[0.6875rem] leading-snug text-text-secondary">{noteFor(kind)}</p>
    </InspectorDisclosure>
  )
}
