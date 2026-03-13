import { componentLibrary } from "@/services/componentLibrary"
import type { Component } from "@/schemas/componentSchema"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { snapToGrid } from "@/lib/canvasUtils"
import { sanitizeDisplayString } from "@/lib/sanitize"
import {
  COMPONENT_CATEGORIES,
  EDGE_TYPE_CONNECTION,
  NODE_TYPE_COMPONENT,
  NODE_WIDTH,
  type ComponentCategoryId,
} from "@/lib/constants"
import type { StackDefinition } from "@/schemas/stackSchema"
import type { ArchieNode, ArchieNodeData, ArchieEdge, ArchieEdgeData } from "@/stores/architectureStore"

export interface StackPlacementResult {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
}

/**
 * Resolves a StackDefinition into concrete ArchieNodes and ArchieEdges,
 * positioned relative to the given drop point.
 *
 * Placed nodes are regular ArchieNodes — indistinguishable from manually placed components.
 * Missing components are skipped; connections referencing skipped components are also skipped.
 */
export function resolveStackPlacement(
  stackDef: StackDefinition,
  dropPoint: { x: number; y: number },
): StackPlacementResult {
  const nodes: ArchieNode[] = []
  const indexToNodeId = new Map<number, string>()
  const indexToComponentId = new Map<number, string>()
  const indexToComponent = new Map<number, Component>()

  // Phase 1: Resolve components to nodes
  for (let i = 0; i < stackDef.components.length; i++) {
    const sc = stackDef.components[i]
    const component = componentLibrary.getComponent(sc.componentId)

    if (!component) continue
    if (component.configVariants.length === 0) continue

    const nodeId = crypto.randomUUID()
    indexToNodeId.set(i, nodeId)
    indexToComponentId.set(i, sc.componentId)
    indexToComponent.set(i, component)

    // Resolve variant: use stack-specified variant, fall back to first
    const hasVariant = component.configVariants.some((v) => v.id === sc.variantId)
    const activeVariantId = hasVariant ? sc.variantId : component.configVariants[0].id

    const nodeData: ArchieNodeData = {
      archieComponentId: component.id,
      activeConfigVariantId: activeVariantId,
      componentName: sanitizeDisplayString(component.name),
      componentCategory: (component.category in COMPONENT_CATEGORIES
        ? component.category
        : "compute") as ComponentCategoryId,
    }

    const node: ArchieNode = {
      id: nodeId,
      type: NODE_TYPE_COMPONENT,
      position: {
        x: snapToGrid(dropPoint.x + sc.relativePosition.x),
        y: snapToGrid(dropPoint.y + sc.relativePosition.y),
      },
      data: nodeData,
      width: NODE_WIDTH,
    }

    nodes.push(node)
  }

  // Phase 2: Resolve connections to edges
  const edges: ArchieEdge[] = []

  for (const conn of stackDef.connections) {
    const sourceNodeId = indexToNodeId.get(conn.sourceComponentIndex)
    const targetNodeId = indexToNodeId.get(conn.targetComponentIndex)

    // Skip connections referencing missing/skipped components
    if (!sourceNodeId || !targetNodeId) continue

    const sourceComponentId = indexToComponentId.get(conn.sourceComponentIndex)!
    const targetComponentId = indexToComponentId.get(conn.targetComponentIndex)!

    // checkCompatibility accepts Component | undefined — Map.get returns undefined for skipped indices
    const sourceComponent = indexToComponent.get(conn.sourceComponentIndex)
    const targetComponent = indexToComponent.get(conn.targetComponentIndex)

    const result = checkCompatibility(sourceComponent, targetComponent)

    const edgeData: ArchieEdgeData = {
      isIncompatible: !result.isCompatible,
      incompatibilityReason: result.reason || null,
      sourceArchieComponentId: sourceComponentId,
      targetArchieComponentId: targetComponentId,
    }

    const edge: ArchieEdge = {
      id: crypto.randomUUID(),
      source: sourceNodeId,
      target: targetNodeId,
      type: EDGE_TYPE_CONNECTION,
      data: edgeData,
    }

    edges.push(edge)
  }

  return { nodes, edges }
}
