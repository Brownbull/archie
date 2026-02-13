import { create } from "zustand"
import type { Node, Edge, NodeChange, Connection } from "@xyflow/react"
import { applyNodeChanges } from "@xyflow/react"
import { componentLibrary } from "@/services/componentLibrary"
import { useUiStore } from "@/stores/uiStore"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import {
  CANVAS_GRID_SIZE,
  COMPONENT_CATEGORIES,
  EDGE_TYPE_CONNECTION,
  NODE_TYPE_COMPONENT,
  NODE_WIDTH,
  type ComponentCategoryId,
} from "@/lib/constants"

export interface ArchieNodeData extends Record<string, unknown> {
  archieComponentId: string
  activeConfigVariantId: string
  componentName: string
  componentCategory: ComponentCategoryId
}

export interface ArchieEdgeData extends Record<string, unknown> {
  isIncompatible: boolean
  incompatibilityReason: string | null
  sourceArchieComponentId: string
  targetArchieComponentId: string
}

export type ArchieNode = Node<ArchieNodeData, typeof NODE_TYPE_COMPONENT>
export type ArchieEdge = Edge<ArchieEdgeData>

function snapToGrid(value: number): number {
  return Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
}

const NODE_GAP = CANVAS_GRID_SIZE * 2 // 32px between nodes

function findNextAvailablePosition(nodes: ArchieNode[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 }

  // Place to the right of the rightmost node, snapped to grid
  const maxX = Math.max(...nodes.map((n) => n.position.x))
  const sameRowNodes = nodes.filter((n) => n.position.x === maxX)
  const y = sameRowNodes[0]?.position.y ?? 0

  return {
    x: snapToGrid(maxX + NODE_WIDTH + NODE_GAP),
    y: snapToGrid(y),
  }
}

interface ArchitectureState {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
  addNode: (componentId: string, position: { x: number; y: number }) => void
  addNodeSmartPosition: (componentId: string) => void
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void
  updateNodeConfigVariant: (nodeId: string, variantId: string) => void
  swapNodeComponent: (nodeId: string, newComponentId: string) => void
  removeNode: (nodeId: string) => void
  addEdge: (connection: Connection) => void
  removeEdges: (edgeIds: string[]) => void
  setNodes: (nodes: ArchieNode[]) => void
  setEdges: (edges: ArchieEdge[]) => void
  deselectAll: () => void
  onNodesChange: (changes: NodeChange<ArchieNode>[]) => void
}

export const useArchitectureStore = create<ArchitectureState>()((set, get) => ({
  nodes: [],
  edges: [],

  addNodeSmartPosition: (componentId) => {
    const position = findNextAvailablePosition(get().nodes)
    get().addNode(componentId, position)
  },

  addNode: (componentId, position) => {
    const component = componentLibrary.getComponent(componentId)
    if (!component) return

    const defaultVariant = component.configVariants[0]
    if (!defaultVariant) return

    const newNode: ArchieNode = {
      id: crypto.randomUUID(),
      type: NODE_TYPE_COMPONENT,
      position: {
        x: snapToGrid(position.x),
        y: snapToGrid(position.y),
      },
      data: {
        archieComponentId: component.id,
        activeConfigVariantId: defaultVariant.id,
        componentName: component.name,
        componentCategory: (component.category in COMPONENT_CATEGORIES
          ? component.category
          : "compute") as ComponentCategoryId,
      },
      width: NODE_WIDTH,
    }

    set({ nodes: [...get().nodes, newNode] })
  },

  // NOTE: Edge compatibility is NOT re-evaluated on swap.
  // Recalculation deferred to Epic 2 (Story 2-1).
  swapNodeComponent: (nodeId, newComponentId) => {
    const newComponent = componentLibrary.getComponent(newComponentId)
    if (!newComponent) return

    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node || node.data.archieComponentId === newComponentId) return

    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                archieComponentId: newComponentId,
                activeConfigVariantId: newComponent.configVariants[0]?.id || "",
                componentName: newComponent.name,
                componentCategory: (newComponent.category in COMPONENT_CATEGORIES
                  ? newComponent.category
                  : "compute") as ComponentCategoryId,
              },
            }
          : n,
      ),
    })
  },

  updateNodeConfigVariant: (nodeId, variantId) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node || node.data.activeConfigVariantId === variantId) return

    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, activeConfigVariantId: variantId } }
          : n,
      ),
    })
  },

  updateNodePosition: (nodeId, position) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position: {
                x: snapToGrid(position.x),
                y: snapToGrid(position.y),
              },
            }
          : node,
      ),
    })
  },

  removeNode: (nodeId) => {
    if (useUiStore.getState().selectedNodeId === nodeId) {
      useUiStore.getState().setSelectedNodeId(null)
    }
    const selectedEdgeId = useUiStore.getState().selectedEdgeId
    if (selectedEdgeId) {
      const edgeBeingRemoved = get().edges.find(
        (e) => e.id === selectedEdgeId && (e.source === nodeId || e.target === nodeId),
      )
      if (edgeBeingRemoved) {
        useUiStore.getState().setSelectedEdgeId(null)
      }
    }
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      ),
    })
  },

  addEdge: (connection) => {
    if (!connection.source || !connection.target) return
    if (connection.source === connection.target) return

    const existingEdge = get().edges.find(
      (e) => e.source === connection.source && e.target === connection.target,
    )
    if (existingEdge) return

    const sourceNode = get().nodes.find((n) => n.id === connection.source)
    const targetNode = get().nodes.find((n) => n.id === connection.target)

    const sourceComponentId = sourceNode?.data.archieComponentId ?? ""
    const targetComponentId = targetNode?.data.archieComponentId ?? ""

    const sourceComponent = sourceComponentId
      ? componentLibrary.getComponent(sourceComponentId)
      : undefined
    const targetComponent = targetComponentId
      ? componentLibrary.getComponent(targetComponentId)
      : undefined

    const result = checkCompatibility(sourceComponent, targetComponent)

    const newEdge: ArchieEdge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      type: EDGE_TYPE_CONNECTION,
      data: {
        isIncompatible: !result.isCompatible,
        incompatibilityReason: result.reason || null,
        sourceArchieComponentId: sourceComponentId,
        targetArchieComponentId: targetComponentId,
      },
    }

    set({ edges: [...get().edges, newEdge] })
  },

  removeEdges: (edgeIds) => {
    const idsToRemove = new Set(edgeIds)
    set({ edges: get().edges.filter((e) => !idsToRemove.has(e.id)) })
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  deselectAll: () => {
    const { nodes, edges } = get()
    const hasSelected = nodes.some((n) => n.selected) || edges.some((e) => e.selected)
    if (!hasSelected) return
    set({
      nodes: nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
    })
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },
}))
