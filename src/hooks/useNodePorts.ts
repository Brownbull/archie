import { useMemo } from "react"
import { componentLibrary } from "@/services/componentLibrary"
import { PORT_SORT_ORDER, PORT_TYPES, type PortDefinition } from "@/lib/constants"

export interface ResolvedPort extends PortDefinition {
  label: string
  color: string
  sortIndex: number
}

export interface NodePorts {
  inputs: ResolvedPort[]
  outputs: ResolvedPort[]
  hasPorts: boolean
}

function resolvePort(port: PortDefinition): ResolvedPort {
  const meta = PORT_TYPES[port.type]
  return {
    ...port,
    label: meta.label,
    color: meta.color,
    sortIndex: PORT_SORT_ORDER.indexOf(port.type),
  }
}

function comparePorts(a: ResolvedPort, b: ResolvedPort): number {
  return a.sortIndex - b.sortIndex
}

export function useNodePorts(archieComponentId: string): NodePorts {
  return useMemo(() => {
    const component = componentLibrary.getComponent(archieComponentId)
    const ports = component?.ports
    if (!ports || ports.length === 0) {
      return { inputs: [], outputs: [], hasPorts: false }
    }

    const inputs: ResolvedPort[] = []
    const outputs: ResolvedPort[] = []

    for (const port of ports) {
      const resolved = resolvePort(port)
      if (port.direction === "in") {
        inputs.push(resolved)
      } else {
        outputs.push(resolved)
      }
    }

    inputs.sort(comparePorts)
    outputs.sort(comparePorts)

    return { inputs, outputs, hasPorts: true }
  }, [archieComponentId])
}
