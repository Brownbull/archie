import { create } from "zustand"
import type { Node, Edge, NodeChange, Connection } from "@xyflow/react"
import { applyNodeChanges } from "@xyflow/react"
import { toast } from "sonner"
import { componentLibrary } from "@/services/componentLibrary"
import { useUiStore } from "@/stores/uiStore"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { recalculationService } from "@/services/recalculationService"
import { computeWeightedNodeScore, computeHeatmapStatus } from "@/engine/heatmapCalculator"
import { snapToGrid, findNextAvailablePosition } from "@/lib/canvasUtils"
import {
  COMPONENT_CATEGORIES,
  DEFAULT_WEIGHT_PROFILE,
  EDGE_TYPE_CONNECTION,
  MAX_CANVAS_NODES,
  NODE_TYPE_COMPONENT,
  NODE_WIDTH,
  RIPPLE_ANIMATION_DURATION_MS,
  type ComponentCategoryId,
  type Constraint,
  type ParsedConstraint,
  type WeightProfile,
  type DataContextItem,
  DATA_CONTEXT_NAME_MAX_LENGTH,
  MAX_DATA_CONTEXT_ITEMS_PER_NODE,
} from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"
import {
  getNodeCategoryAverages,
  evaluateAndSetTier as computeTierResult,
  evaluateAndGetViolations,
  recomputeScoringLayer as computeScoringLayer,
} from "@/stores/architectureStoreHelpers"
import type { ConstraintViolation, RecalculatedMetrics, HeatmapStatus, TierResult } from "@/stores/architectureStoreHelpers"

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
  labelOffset?: { x: number; y: number }
}

export type ArchieNode = Node<ArchieNodeData, typeof NODE_TYPE_COMPONENT>
export type ArchieEdge = Edge<ArchieEdgeData>

interface ArchitectureState {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
  computedMetrics: Map<string, RecalculatedMetrics>
  previousMetrics: Map<string, RecalculatedMetrics>
  heatmapColors: Map<string, HeatmapStatus>
  edgeHeatmapColors: Map<string, HeatmapStatus>
  rippleActiveNodeIds: Set<string>
  recalcGeneration: number
  currentTier: TierResult | null
  weightProfile: WeightProfile
  constraints: Constraint[]
  constraintViolations: ConstraintViolation[]
  violationsByNodeId: Map<string, ConstraintViolation[]>
  dataContextItems: Map<string, DataContextItem[]>
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
  placeStack: (nodes: ArchieNode[], edges: ArchieEdge[]) => void
  addEdge: (connection: Connection) => void
  removeEdges: (edgeIds: string[]) => void
  triggerRecalculation: (changedNodeId: string) => void
  setWeightProfile: (profile: WeightProfile) => void
  setWeightAndRecalculate: (profile: WeightProfile) => void
  loadArchitecture: (nodes: ArchieNode[], edges: ArchieEdge[], weightProfile?: WeightProfile, constraints?: ParsedConstraint[]) => void
  setNodes: (nodes: ArchieNode[]) => void
  setEdges: (edges: ArchieEdge[]) => void
  deselectAll: () => void
  updateEdgeLabelOffset: (edgeId: string, offset: { x: number; y: number }) => void
  onNodesChange: (changes: NodeChange<ArchieNode>[]) => void
  addConstraint: (constraint: Constraint) => void
  updateConstraint: (id: string, updates: Partial<Omit<Constraint, "id">>) => void
  removeConstraint: (id: string) => void
  setConstraints: (constraints: Constraint[]) => void
  addDataContextItem: (nodeId: string, item: Omit<DataContextItem, "id">) => void
  updateDataContextItem: (nodeId: string, itemId: string, updates: Partial<Omit<DataContextItem, "id">>) => void
  removeDataContextItem: (nodeId: string, itemId: string) => void
}

// Thin wrappers: delegate to pure helpers, adapt to store get/set pattern.
// Keeps call sites identical to pre-extraction code. (Story 7-1 Phase 0 refactor)

function evaluateAndSetTier(
  get: () => ArchitectureState,
  set: (partial: Partial<ArchitectureState>) => void,
  overrideMetrics?: Map<string, RecalculatedMetrics>,
): void {
  const { nodes, weightProfile, computedMetrics } = get()
  set({ currentTier: computeTierResult(nodes, weightProfile, computedMetrics, overrideMetrics) })
}

function _evaluateAndSetViolations(
  get: () => ArchitectureState,
  set: (partial: Partial<ArchitectureState>) => void,
  overrideMetrics?: Map<string, RecalculatedMetrics>,
): void {
  const { constraints, weightProfile, nodes, computedMetrics, constraintViolations } = get()
  if (constraints.length === 0 || nodes.length === 0) {
    if (constraintViolations.length > 0) {
      set({ constraintViolations: [], violationsByNodeId: new Map() })
    }
    return
  }
  set(evaluateAndGetViolations(constraints, weightProfile, nodes, computedMetrics, overrideMetrics))
}

function recomputeScoringLayer(
  get: () => ArchitectureState,
  set: (partial: Partial<ArchitectureState>) => void,
): void {
  const { nodes, weightProfile, computedMetrics, constraints } = get()
  set(computeScoringLayer(nodes, weightProfile, computedMetrics, constraints))
}

// Module-level tracking for ripple setTimeout IDs (TD-2-2b)
// Kept outside store state to avoid triggering subscriber re-renders on timeout bookkeeping
const pendingRippleTimeouts = new Set<ReturnType<typeof setTimeout>>()

function clearPendingRippleTimeouts() {
  for (const id of pendingRippleTimeouts) {
    clearTimeout(id)
  }
  pendingRippleTimeouts.clear()
}

export const useArchitectureStore = create<ArchitectureState>()((set, get) => ({
  nodes: [],
  edges: [],
  computedMetrics: new Map<string, RecalculatedMetrics>(),
  previousMetrics: new Map<string, RecalculatedMetrics>(),
  heatmapColors: new Map<string, HeatmapStatus>(),
  edgeHeatmapColors: new Map<string, HeatmapStatus>(),
  rippleActiveNodeIds: new Set<string>(),
  recalcGeneration: 0,
  currentTier: null,
  weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
  constraints: [],
  constraintViolations: [],
  violationsByNodeId: new Map<string, ConstraintViolation[]>(),
  dataContextItems: new Map<string, DataContextItem[]>(),

  triggerRecalculation: (changedNodeId) => {
    // Cancel pending ripple timeouts from previous recalculation (TD-2-2b)
    clearPendingRippleTimeouts()

    const generation = get().recalcGeneration + 1
    const isStale = () => get().recalcGeneration !== generation
    set({
      recalcGeneration: generation,
      previousMetrics: new Map(get().computedMetrics),
    })

    const { nodes, edges } = get()
    const result = recalculationService.run(nodes, edges, changedNodeId)

    // Immediate update for changed node (hop 0)
    const changedNodeMetrics = result.metrics.get(changedNodeId)
    if (changedNodeMetrics) {
      // Compute weighted heatmap for changed node (AC-ARCH-PATTERN-5)
      const categoryAverages = getNodeCategoryAverages(changedNodeMetrics)
      const weightedScore = computeWeightedNodeScore(categoryAverages, get().weightProfile)
      const changedNodeHeatmap = computeHeatmapStatus(weightedScore)
      set({
        computedMetrics: new Map([
          ...get().computedMetrics,
          [changedNodeId, changedNodeMetrics],
        ]),
        // Update heatmap for changed node immediately (weighted)
        heatmapColors: new Map([
          ...get().heatmapColors,
          [changedNodeId, changedNodeHeatmap],
        ]),
        // Edge heatmap updates fully (edges may span multiple hops)
        edgeHeatmapColors: result.edgeHeatmap,
      })
    }

    // Tier evaluation: merge ALL service results with existing metrics for full picture
    const fullMetrics = new Map(get().computedMetrics)
    for (const [nodeId, nodeMetrics] of result.metrics) {
      fullMetrics.set(nodeId, nodeMetrics)
    }
    evaluateAndSetTier(get, set, fullMetrics)
    _evaluateAndSetViolations(get, set, fullMetrics)

    // Sequential ripple for remaining nodes
    for (const hop of result.propagationHops.filter(
      (h) => h.hopIndex > 0,
    )) {
      const hopMetrics = result.metrics.get(hop.nodeId)
      if (!hopMetrics) continue

      // Pre-compute weighted heatmap for this hop (AC-ARCH-PATTERN-5)
      const hopCategoryAverages = getNodeCategoryAverages(hopMetrics)
      const hopWeightedScore = computeWeightedNodeScore(hopCategoryAverages, get().weightProfile)
      const hopHeatmap = computeHeatmapStatus(hopWeightedScore)

      const rippleId = setTimeout(() => {
        pendingRippleTimeouts.delete(rippleId)
        if (isStale()) return
        // Node existence check — skip if node was deleted during propagation
        if (!get().nodes.some((n) => n.id === hop.nodeId)) return

        set((state) => ({
          computedMetrics: new Map([
            ...state.computedMetrics,
            [hop.nodeId, hopMetrics],
          ]),
          // Update heatmap for this node in same set() call (AC-ARCH-PATTERN-12, weighted)
          heatmapColors: new Map([
            ...state.heatmapColors,
            [hop.nodeId, hopHeatmap],
          ]),
          rippleActiveNodeIds: new Set([
            ...state.rippleActiveNodeIds,
            hop.nodeId,
          ]),
        }))

        // Clear ripple indicator after animation
        const clearId = setTimeout(() => {
          pendingRippleTimeouts.delete(clearId)
          if (isStale()) return
          set((state) => {
            const next = new Set(state.rippleActiveNodeIds)
            next.delete(hop.nodeId)
            return { rippleActiveNodeIds: next }
          })
        }, RIPPLE_ANIMATION_DURATION_MS)
        pendingRippleTimeouts.add(clearId)
      }, hop.delayMs)
      pendingRippleTimeouts.add(rippleId)
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
    evaluateAndSetTier(get, set)
    _evaluateAndSetViolations(get, set)
  },

  placeStack: (newNodes, newEdges) => {
    if (get().nodes.length + newNodes.length > MAX_CANVAS_NODES) {
      toast.warning(`Cannot place stack: would exceed canvas limit (${MAX_CANVAS_NODES} components)`)
      return
    }
    // Single state update for all nodes and edges (AC-ARCH-PATTERN-5)
    set({
      nodes: [...get().nodes, ...newNodes],
      edges: [...get().edges, ...newEdges],
    })
    // Evaluate tier + constraints after batch update
    evaluateAndSetTier(get, set)
    _evaluateAndSetViolations(get, set)
    // Trigger recalculation for each placed node (same pattern as loadArchitecture).
    // O(n) BFS passes — acceptable for MAX_STACK_COMPONENTS; optimize if profiling flags this.
    for (const node of newNodes) {
      get().triggerRecalculation(node.id)
    }
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
    // Clean up heatmapColors for the removed node
    const currentHeatmap = get().heatmapColors
    if (currentHeatmap.has(nodeId)) {
      const nextHeatmap = new Map(currentHeatmap)
      nextHeatmap.delete(nodeId)
      set({ heatmapColors: nextHeatmap })
    }
    // Clean up dataContextItems for the removed node
    if (get().dataContextItems.has(nodeId)) {
      const nextDci = new Map(get().dataContextItems)
      nextDci.delete(nodeId)
      set({ dataContextItems: nextDci })
    }
    // Tier + constraints: clear if canvas is empty, otherwise neighbor recalculation handles it
    if (get().nodes.length === 0) {
      set({ currentTier: null, constraintViolations: [], violationsByNodeId: new Map() })
    }
    // Trigger recalculation for surviving neighbors AFTER removal
    for (const neighborId of neighborNodeIds) {
      if (get().nodes.some((n) => n.id === neighborId)) {
        get().triggerRecalculation(neighborId)
      }
    }
    // Re-evaluate tier + constraints when no neighbors triggered recalculation (e.g., isolated node removal)
    if (neighborNodeIds.size === 0 && get().nodes.length > 0) {
      evaluateAndSetTier(get, set)
      _evaluateAndSetViolations(get, set)
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

    // Clean up computedMetrics and heatmapColors for removed nodes (parity with removeNode)
    const currentComputed = get().computedMetrics
    const currentHeatmap = get().heatmapColors
    const hasComputedToClean = [...idsToRemove].some(
      (id) => currentComputed.has(id) || currentHeatmap.has(id),
    )
    if (hasComputedToClean) {
      const nextComputed = new Map(currentComputed)
      const nextHeatmap = new Map(currentHeatmap)
      for (const id of idsToRemove) {
        nextComputed.delete(id)
        nextHeatmap.delete(id)
      }
      set({ computedMetrics: nextComputed, heatmapColors: nextHeatmap })
    }
    // Clean up dataContextItems for removed nodes
    const currentDci = get().dataContextItems
    const hasDciToClean = [...idsToRemove].some((id) => currentDci.has(id))
    if (hasDciToClean) {
      const nextDci = new Map(currentDci)
      for (const id of idsToRemove) nextDci.delete(id)
      set({ dataContextItems: nextDci })
    }
    // Tier + constraints: clear if canvas is empty, otherwise re-evaluate
    if (get().nodes.length === 0) {
      set({ currentTier: null, constraintViolations: [], violationsByNodeId: new Map() })
    } else {
      evaluateAndSetTier(get, set)
      _evaluateAndSetViolations(get, set)
    }
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

  setWeightProfile: (profile) => {
    set({ weightProfile: profile })
  },

  setWeightAndRecalculate: (profile) => {
    set({ weightProfile: profile })
    recomputeScoringLayer(get, set)
  },

  loadArchitecture: (nodes, edges, weightProfile?, constraints?) => {
    // Cancel pending ripple timeouts from previous architecture
    clearPendingRippleTimeouts()

    // Clear all computed state and set new architecture
    set({
      nodes,
      edges,
      computedMetrics: new Map(),
      previousMetrics: new Map(),
      heatmapColors: new Map(),
      edgeHeatmapColors: new Map(),
      rippleActiveNodeIds: new Set(),
      recalcGeneration: get().recalcGeneration + 1,
      currentTier: null,
      weightProfile: weightProfile ?? get().weightProfile,
      constraints: (constraints ?? []).map((c) => ({ ...c, id: crypto.randomUUID() })),
      constraintViolations: [],
      violationsByNodeId: new Map(),
      dataContextItems: new Map(),
    })

    // Clear uiStore selection state (cross-store pattern from removeNode)
    useUiStore.getState().setSelectedNodeId(null)
    useUiStore.getState().setSelectedEdgeId(null)

    // Trigger full-graph recalculation for each node
    // Each triggerRecalculation handles its own BFS propagation
    for (const node of nodes) {
      get().triggerRecalculation(node.id)
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

  updateEdgeLabelOffset: (edgeId, offset) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId && e.data
          ? { ...e, data: { ...e.data, labelOffset: offset } as ArchieEdgeData }
          : e,
      ),
    })
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },

  // --- Constraint CRUD (Story 6-2 AC-ARCH-PATTERN-3) ---
  // Each action modifies constraints then re-evaluates violations from existing scores.
  // No BFS propagation (AC-ARCH-NO-3).

  addConstraint: (constraint) => {
    set({ constraints: [...get().constraints, constraint] })
    _evaluateAndSetViolations(get, set)
  },

  updateConstraint: (id, updates) => {
    set({
      constraints: get().constraints.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })
    _evaluateAndSetViolations(get, set)
  },

  removeConstraint: (id) => {
    set({ constraints: get().constraints.filter((c) => c.id !== id) })
    _evaluateAndSetViolations(get, set)
  },

  setConstraints: (constraints) => {
    set({ constraints })
    _evaluateAndSetViolations(get, set)
  },

  // --- Data Context CRUD (Story 7-1 AC-ARCH-PATTERN-5) ---

  addDataContextItem: (nodeId, item) => {
    const current = get().dataContextItems.get(nodeId) ?? []
    if (current.length >= MAX_DATA_CONTEXT_ITEMS_PER_NODE) {
      toast.warning(`Limit reached (${MAX_DATA_CONTEXT_ITEMS_PER_NODE} data items per component)`)
      return
    }
    const newItem: DataContextItem = {
      id: crypto.randomUUID(),
      name: sanitizeDisplayString(item.name, DATA_CONTEXT_NAME_MAX_LENGTH),
      accessPattern: item.accessPattern,
      averageSize: item.averageSize,
      structureType: item.structureType,
    }
    const next = new Map(get().dataContextItems)
    next.set(nodeId, [...current, newItem])
    set({ dataContextItems: next })
  },

  updateDataContextItem: (nodeId, itemId, updates) => {
    const current = get().dataContextItems.get(nodeId)
    if (!current) return
    const next = new Map(get().dataContextItems)
    next.set(
      nodeId,
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
              ...(updates.name !== undefined
                ? { name: sanitizeDisplayString(updates.name, DATA_CONTEXT_NAME_MAX_LENGTH) }
                : {}),
            }
          : item,
      ),
    )
    set({ dataContextItems: next })
  },

  removeDataContextItem: (nodeId, itemId) => {
    const current = get().dataContextItems.get(nodeId)
    if (!current) return
    const filtered = current.filter((item) => item.id !== itemId)
    const next = new Map(get().dataContextItems)
    if (filtered.length === 0) {
      next.delete(nodeId)
    } else {
      next.set(nodeId, filtered)
    }
    set({ dataContextItems: next })
  },
}))

/**
 * Pure selector: extracts the skeleton (nodes + edges) from the current store state.
 * Called on export button click — non-reactive read, not a store action.
 */
export function getArchitectureSkeleton(): { nodes: ArchieNode[]; edges: ArchieEdge[]; weightProfile: WeightProfile; constraints: Constraint[]; dataContextItems: Map<string, DataContextItem[]> } {
  const state = useArchitectureStore.getState()
  return { nodes: state.nodes, edges: state.edges, weightProfile: state.weightProfile, constraints: state.constraints, dataContextItems: state.dataContextItems }
}
