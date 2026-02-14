import { create } from "zustand"
import type { Node, Edge, NodeChange, Connection } from "@xyflow/react"
import { applyNodeChanges } from "@xyflow/react"
import { toast } from "sonner"
import { componentLibrary } from "@/services/componentLibrary"
import { useUiStore } from "@/stores/uiStore"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { recalculationService } from "@/services/recalculationService"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import {
  CANVAS_GRID_SIZE,
  COMPONENT_CATEGORIES,
  EDGE_TYPE_CONNECTION,
  MAX_CANVAS_NODES,
  NODE_TYPE_COMPONENT,
  NODE_WIDTH,
  POSITION_EPSILON,
  RIPPLE_ANIMATION_DURATION_MS,
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
  const sameRowNodes = nodes.filter((n) => Math.abs(n.position.x - maxX) < POSITION_EPSILON)
  const y = sameRowNodes[0]?.position.y ?? 0

  return {
    x: snapToGrid(maxX + NODE_WIDTH + NODE_GAP),
    y: snapToGrid(y),
  }
}

interface ArchitectureState {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
  computedMetrics: Map<string, RecalculatedMetrics>
  previousMetrics: Map<string, RecalculatedMetrics>
  rippleActiveNodeIds: Set<string>
  recalcGeneration: number
  addNode: (componentId: string, position: { x: number; y: number }) => void
  addNodeSmartPosition: (componentId: string) => void
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void
  updateNodeConfigVariant: (nodeId: string, variantId: string) => void
  swapNodeComponent: (nodeId: string, newComponentId: string) => void
  removeNode: (nodeId: string) => void
  removeNodes: (nodeIds: string[]) => void
  addEdge: (connection: Connection) => void
  removeEdges: (edgeIds: string[]) => void
  triggerRecalculation: (changedNodeId: string) => void
  setNodes: (nodes: ArchieNode[]) => void
  setEdges: (edges: ArchieEdge[]) => void
  deselectAll: () => void
  onNodesChange: (changes: NodeChange<ArchieNode>[]) => void
}

export const useArchitectureStore = create<ArchitectureState>()((set, get) => ({
  nodes: [],
  edges: [],
  computedMetrics: new Map<string, RecalculatedMetrics>(),
  previousMetrics: new Map<string, RecalculatedMetrics>(),
  rippleActiveNodeIds: new Set<string>(),
  recalcGeneration: 0,

  triggerRecalculation: (changedNodeId) => {
    const generation = get().recalcGeneration + 1
    set({
      recalcGeneration: generation,
      previousMetrics: new Map(get().computedMetrics),
    })

    const { nodes, edges } = get()
    const result = recalculationService.run(nodes, edges, changedNodeId)

    // Immediate update for changed node (hop 0)
    const changedNodeMetrics = result.metrics.get(changedNodeId)
    if (changedNodeMetrics) {
      set({
        computedMetrics: new Map([
          ...get().computedMetrics,
          [changedNodeId, changedNodeMetrics],
        ]),
      })
    }

    // Sequential ripple for remaining nodes
    for (const hop of result.propagationHops.filter(
      (h) => h.hopIndex > 0,
    )) {
      const hopMetrics = result.metrics.get(hop.nodeId)
      if (!hopMetrics) continue

      setTimeout(() => {
        // Stale check — skip if a newer recalculation has started
        if (get().recalcGeneration !== generation) return
        // Node existence check — skip if node was deleted during propagation
        if (!get().nodes.some((n) => n.id === hop.nodeId)) return

        set((state) => ({
          computedMetrics: new Map([
            ...state.computedMetrics,
            [hop.nodeId, hopMetrics],
          ]),
          rippleActiveNodeIds: new Set([
            ...state.rippleActiveNodeIds,
            hop.nodeId,
          ]),
        }))

        // Clear ripple indicator after animation
        setTimeout(() => {
          if (get().recalcGeneration !== generation) return
          set((state) => {
            const next = new Set(state.rippleActiveNodeIds)
            next.delete(hop.nodeId)
            return { rippleActiveNodeIds: next }
          })
        }, RIPPLE_ANIMATION_DURATION_MS)
      }, hop.delayMs)
    }
  },

  addNodeSmartPosition: (componentId) => {
    // Early exit avoids unnecessary position calculation when canvas is full (TD-1-3a)
    if (get().nodes.length >= MAX_CANVAS_NODES) {
      toast.warning(`Canvas limit reached (${MAX_CANVAS_NODES} components)`)
      return
    }
    const position = findNextAvailablePosition(get().nodes)
    get().addNode(componentId, position)
  },

  addNode: (componentId, position) => {
    // Defense-in-depth: prevent client-side performance degradation (TD-1-3a)
    if (get().nodes.length >= MAX_CANVAS_NODES) {
      toast.warning(`Canvas limit reached (${MAX_CANVAS_NODES} components)`)
      return
    }
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

  swapNodeComponent: (nodeId, newComponentId) => {
    const newComponent = componentLibrary.getComponent(newComponentId)
    if (!newComponent) return

    // Guard: reject swap to component with no config variants (TD-1-6a)
    if (newComponent.configVariants.length === 0) {
      console.warn(
        `swapNodeComponent: "${newComponentId}" has no configVariants — swap rejected`,
      )
      return
    }

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
                activeConfigVariantId: newComponent.configVariants[0].id,
                componentName: newComponent.name,
                componentCategory: (newComponent.category in COMPONENT_CATEGORIES
                  ? newComponent.category
                  : "compute") as ComponentCategoryId,
              },
            }
          : n,
      ),
    })
    get().triggerRecalculation(nodeId)
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
    get().triggerRecalculation(nodeId)
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

  // CROSS-STORE COUPLING (TD-1-3a, also tracked in TD-1-4a Item 2):
  // removeNode directly reads/writes uiStore to clear selection state when the
  // deleted node (or its connected edge) is currently selected. This prevents
  // stale selection references in the inspector panel.
  //
  // This coupling is intentional for correctness but creates a tight dependency
  // between architectureStore and uiStore. If more stores need to react to node
  // removal in the future, consider an event/subscription pattern or a thin
  // coordination layer. TD-1-4a Item 2 tracks potential decoupling.
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
    // Capture neighbor node IDs BEFORE removal (Story 2-1)
    const neighborNodeIds = new Set<string>()
    for (const edge of get().edges) {
      if (edge.source === nodeId) neighborNodeIds.add(edge.target)
      if (edge.target === nodeId) neighborNodeIds.add(edge.source)
    }
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      ),
    })
    // Clean up computedMetrics for the removed node
    const currentComputed = get().computedMetrics
    if (currentComputed.has(nodeId)) {
      const next = new Map(currentComputed)
      next.delete(nodeId)
      set({ computedMetrics: next })
    }
    // Trigger recalculation for surviving neighbors AFTER removal
    for (const neighborId of neighborNodeIds) {
      if (get().nodes.some((n) => n.id === neighborId)) {
        get().triggerRecalculation(neighborId)
      }
    }
  },

  removeNodes: (nodeIds) => {
    if (nodeIds.length === 0) return
    const idsToRemove = new Set(nodeIds)

    const selectedNodeId = useUiStore.getState().selectedNodeId
    if (selectedNodeId && idsToRemove.has(selectedNodeId)) {
      useUiStore.getState().setSelectedNodeId(null)
    }

    const currentEdges = get().edges
    const survivingEdges = currentEdges.filter(
      (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target),
    )

    const selectedEdgeId = useUiStore.getState().selectedEdgeId
    if (selectedEdgeId) {
      const edgeStillExists = survivingEdges.some((e) => e.id === selectedEdgeId)
      if (!edgeStillExists) {
        useUiStore.getState().setSelectedEdgeId(null)
      }
    }

    set({
      nodes: get().nodes.filter((n) => !idsToRemove.has(n.id)),
      edges: survivingEdges,
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
    get().triggerRecalculation(connection.source)
    get().triggerRecalculation(connection.target)
  },

  removeEdges: (edgeIds) => {
    const idsToRemove = new Set(edgeIds)
    // Capture affected endpoint nodes BEFORE filtering (Story 2-1)
    const affectedNodeIds = new Set<string>()
    for (const edge of get().edges) {
      if (idsToRemove.has(edge.id)) {
        affectedNodeIds.add(edge.source)
        affectedNodeIds.add(edge.target)
      }
    }
    set({ edges: get().edges.filter((e) => !idsToRemove.has(e.id)) })
    // Trigger recalculation for affected endpoints AFTER edge removal
    for (const nodeId of affectedNodeIds) {
      get().triggerRecalculation(nodeId)
    }
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
