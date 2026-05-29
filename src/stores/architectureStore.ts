import { create } from "zustand"
import type { Node, Edge, NodeChange, Connection } from "@xyflow/react"
import { applyNodeChanges } from "@xyflow/react"
import { toast } from "sonner"
import { componentLibrary } from "@/services/componentLibrary"
import { useUiStore } from "@/stores/uiStore"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { checkPortCompatibility } from "@/engine/portCompatibilityChecker"
import { recalculationService } from "@/services/recalculationService"
import { computeWeightedNodeScore, computeHeatmapStatus } from "@/engine/heatmapCalculator"
import { snapToGrid, findNextAvailablePosition } from "@/lib/canvasUtils"
import {
  CANVAS_GRID_SIZE,
  COMPONENT_CATEGORIES,
  DEFAULT_WEIGHT_PROFILE,
  EDGE_TYPE_CONNECTION,
  MAX_CANVAS_NODES,
  MIN_REPLICAS,
  MAX_REPLICAS,
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
  ACCESS_PATTERN_VALUES,
  DATA_SIZE_VALUES,
  STRUCTURE_TYPE_VALUES,
} from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"
import {
  getNodeCategoryAverages,
  evaluateAndSetTier as computeTierResult,
  evaluateAndGetViolations,
  recomputeScoringLayer as computeScoringLayer,
  clearPendingRippleTimeouts,
  addPendingRippleTimeout,
  removePendingRippleTimeout,
  getDemandProfileForScenario,
  getFailureModifiersForScenario,
  evaluateTopology,
} from "@/stores/architectureStoreHelpers"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"
import type { TopologyIssue } from "@/engine/topologyChecker"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import type { TierResult } from "@/lib/tierDefinitions"

export interface ArchieNodeData extends Record<string, unknown> {
  archieComponentId: string
  activeConfigVariantId: string
  componentName: string
  componentCategory: ComponentCategoryId
  // Epic 14: horizontal replica count for this node (default 1, range MIN_REPLICAS..MAX_REPLICAS)
  replicaCount: number
}

export interface ArchieEdgeData extends Record<string, unknown> {
  isIncompatible: boolean
  isPortMismatch: boolean
  incompatibilityReason: string | null
  sourceArchieComponentId: string
  targetArchieComponentId: string
  sourceHandleId: string | null
  targetHandleId: string | null
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
  topologyIssues: TopologyIssue[]
  topologyIssuesByNodeId: Map<string, TopologyIssue[]>
  activeScenarioId: string | null
  activeFailureScenarioId: string | null
  addNode: (componentId: string, position: { x: number; y: number }) => void
  addNodeSmartPosition: (componentId: string) => void
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void
  updateNodeConfigVariant: (nodeId: string, variantId: string) => void
  setNodeReplicaCount: (nodeId: string, count: number) => void
  swapNodeComponent: (nodeId: string, newComponentId: string) => void
  duplicateNode: (nodeId: string) => string | null
  removeNode: (nodeId: string) => void
  removeNodes: (nodeIds: string[]) => void
  placeStack: (nodes: ArchieNode[], edges: ArchieEdge[]) => void
  addEdge: (connection: Connection) => void
  removeEdges: (edgeIds: string[]) => void
  triggerRecalculation: (changedNodeId: string) => void
  setActiveScenario: (scenarioId: string | null) => void
  setActiveFailureScenario: (failureScenarioId: string | null) => void
  setWeightProfile: (profile: WeightProfile) => void
  setWeightAndRecalculate: (profile: WeightProfile) => void
  loadArchitecture: (nodes: ArchieNode[], edges: ArchieEdge[], weightProfile?: WeightProfile, constraints?: ParsedConstraint[], dataContextItems?: Map<string, DataContextItem[]>, activeScenarioId?: string | null, activeFailureScenarioId?: string | null) => void
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

function _evaluateTopology(
  get: () => ArchitectureState,
  set: (partial: Partial<ArchitectureState>) => void,
): void {
  set(evaluateTopology(get().nodes, get().edges))
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
  topologyIssues: [],
  topologyIssuesByNodeId: new Map<string, TopologyIssue[]>(),
  activeScenarioId: null,
  activeFailureScenarioId: null,

  triggerRecalculation: (changedNodeId) => {
    // Cancel pending ripple timeouts from previous recalculation (TD-2-2b)
    clearPendingRippleTimeouts()

    const generation = get().recalcGeneration + 1
    const isStale = () => get().recalcGeneration !== generation
    set({
      recalcGeneration: generation,
      previousMetrics: new Map(get().computedMetrics),
    })

    const { nodes, edges, activeScenarioId, activeFailureScenarioId } = get()
    const demandProfile = getDemandProfileForScenario(activeScenarioId)
    const failureModifiers = getFailureModifiersForScenario(activeFailureScenarioId)
    const result = recalculationService.run(nodes, edges, changedNodeId, demandProfile, failureModifiers, activeFailureScenarioId)

    const changedNodeMetrics = result.metrics.get(changedNodeId)
    if (changedNodeMetrics) {
      const categoryAverages = getNodeCategoryAverages(changedNodeMetrics)
      const weightedScore = computeWeightedNodeScore(categoryAverages, get().weightProfile)
      const changedNodeHeatmap = computeHeatmapStatus(weightedScore)
      set({
        computedMetrics: new Map([
          ...get().computedMetrics,
          [changedNodeId, changedNodeMetrics],
        ]),
        heatmapColors: new Map([
          ...get().heatmapColors,
          [changedNodeId, changedNodeHeatmap],
        ]),
        edgeHeatmapColors: result.edgeHeatmap,
      })
    }

    const fullMetrics = new Map(get().computedMetrics)
    for (const [nodeId, nodeMetrics] of result.metrics) {
      fullMetrics.set(nodeId, nodeMetrics)
    }
    evaluateAndSetTier(get, set, fullMetrics)
    _evaluateAndSetViolations(get, set, fullMetrics)

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
        removePendingRippleTimeout(rippleId)
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
          removePendingRippleTimeout(clearId)
          if (isStale()) return
          set((state) => {
            const next = new Set(state.rippleActiveNodeIds)
            next.delete(hop.nodeId)
            return { rippleActiveNodeIds: next }
          })
        }, RIPPLE_ANIMATION_DURATION_MS)
        addPendingRippleTimeout(clearId)
      }, hop.delayMs)
      addPendingRippleTimeout(rippleId)
    }
  },

  setActiveScenario: (scenarioId) => {
    const prev = get().activeScenarioId
    if (prev === scenarioId) return
    set({ activeScenarioId: scenarioId })
    for (const node of get().nodes) {
      get().triggerRecalculation(node.id)
    }
  },

  setActiveFailureScenario: (failureScenarioId) => {
    const prev = get().activeFailureScenarioId
    if (prev === failureScenarioId) return
    // AC-7: reject unknown failure preset IDs (defense-in-depth)
    if (failureScenarioId && !getFailureModifiersForScenario(failureScenarioId)) return
    set({ activeFailureScenarioId: failureScenarioId })
    for (const node of get().nodes) {
      get().triggerRecalculation(node.id)
    }
  },

  addNodeSmartPosition: (componentId) => {
    if (get().nodes.length >= MAX_CANVAS_NODES) {
      toast.warning(`Canvas limit reached (${MAX_CANVAS_NODES} components)`)
      return
    }
    const position = findNextAvailablePosition(get().nodes)
    get().addNode(componentId, position)
  },

  addNode: (componentId, position) => {
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
        replicaCount: MIN_REPLICAS,
      },
      width: NODE_WIDTH,
    }

    set({ nodes: [...get().nodes, newNode] })
    evaluateAndSetTier(get, set)
    _evaluateAndSetViolations(get, set)
    _evaluateTopology(get, set)
  },

  placeStack: (newNodes, newEdges) => {
    if (get().nodes.length + newNodes.length > MAX_CANVAS_NODES) {
      toast.warning(`Cannot place stack: would exceed canvas limit (${MAX_CANVAS_NODES} components)`)
      return
    }
    set({
      nodes: [...get().nodes, ...newNodes],
      edges: [...get().edges, ...newEdges],
    })
    evaluateAndSetTier(get, set)
    _evaluateAndSetViolations(get, set)
    _evaluateTopology(get, set)
    for (const node of newNodes) {
      get().triggerRecalculation(node.id)
    }
  },

  swapNodeComponent: (nodeId, newComponentId) => {
    const newComponent = componentLibrary.getComponent(newComponentId)
    if (!newComponent) return

    if (newComponent.configVariants.length === 0) {
      console.warn(
        `swapNodeComponent: "${newComponentId}" has no configVariants — swap rejected`,
      )
      return
    }

    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node || node.data.archieComponentId === newComponentId) return

    // dataContextItems intentionally preserved on swap — user may want to evaluate
    // same data against new component's fit profile (Story 7-1 review decision)
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

  setNodeReplicaCount: (nodeId, count) => {
    // Reject non-finite input (NaN/Infinity from unparsed UI text) before clamping —
    // NaN survives Math.max/min and the !== guard below, corrupting node state (Epic 14)
    if (!Number.isFinite(count)) return
    // Clamp to valid bounds — guards against UI/import out-of-range values (Epic 14)
    const clamped = Math.max(MIN_REPLICAS, Math.min(MAX_REPLICAS, Math.floor(count)))
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node || node.data.replicaCount === clamped) return

    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, replicaCount: clamped } }
          : n,
      ),
    })
    get().triggerRecalculation(nodeId)
    // Replica count feeds the 'replicas-without-lb' topology check (Epic 14)
    _evaluateTopology(get, set)
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

  duplicateNode: (nodeId) => {
    if (get().nodes.length >= MAX_CANVAS_NODES) {
      toast.warning(`Canvas limit reached (${MAX_CANVAS_NODES} components)`)
      return null
    }
    const source = get().nodes.find((n) => n.id === nodeId)
    if (!source) return null

    const newNode: ArchieNode = {
      id: crypto.randomUUID(),
      type: NODE_TYPE_COMPONENT,
      position: {
        x: snapToGrid(source.position.x + NODE_WIDTH + CANVAS_GRID_SIZE * 2),
        y: snapToGrid(source.position.y),
      },
      data: { ...source.data },
      width: NODE_WIDTH,
    }

    set({ nodes: [...get().nodes, newNode] })
    get().triggerRecalculation(newNode.id)
    return newNode.id
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
    const currentComputed = get().computedMetrics
    if (currentComputed.has(nodeId)) {
      const next = new Map(currentComputed)
      next.delete(nodeId)
      set({ computedMetrics: next })
    }
    const currentHeatmap = get().heatmapColors
    if (currentHeatmap.has(nodeId)) {
      const nextHeatmap = new Map(currentHeatmap)
      nextHeatmap.delete(nodeId)
      set({ heatmapColors: nextHeatmap })
    }
    if (get().dataContextItems.has(nodeId)) {
      const nextDci = new Map(get().dataContextItems)
      nextDci.delete(nodeId)
      set({ dataContextItems: nextDci })
    }
    if (get().nodes.length === 0) {
      set({ currentTier: null, constraintViolations: [], violationsByNodeId: new Map() })
    }
    for (const neighborId of neighborNodeIds) {
      if (get().nodes.some((n) => n.id === neighborId)) {
        get().triggerRecalculation(neighborId)
      }
    }
    if (neighborNodeIds.size === 0 && get().nodes.length > 0) {
      evaluateAndSetTier(get, set)
      _evaluateAndSetViolations(get, set)
    }
    _evaluateTopology(get, set)
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
    const currentDci = get().dataContextItems
    const hasDciToClean = [...idsToRemove].some((id) => currentDci.has(id))
    if (hasDciToClean) {
      const nextDci = new Map(currentDci)
      for (const id of idsToRemove) nextDci.delete(id)
      set({ dataContextItems: nextDci })
    }
    if (get().nodes.length === 0) {
      set({ currentTier: null, constraintViolations: [], violationsByNodeId: new Map() })
    } else {
      evaluateAndSetTier(get, set)
      _evaluateAndSetViolations(get, set)
    }
    _evaluateTopology(get, set)
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

    const categoryResult = checkCompatibility(sourceComponent, targetComponent)
    const portResult = checkPortCompatibility(
      connection.sourceHandle, connection.targetHandle, sourceComponent, targetComponent,
    )
    const isIncompatible = !categoryResult.isCompatible || !portResult.isCompatible
    const reason = portResult.reason || categoryResult.reason || null

    const newEdge: ArchieEdge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: EDGE_TYPE_CONNECTION,
      data: {
        isIncompatible,
        isPortMismatch: portResult.isPortMismatch,
        incompatibilityReason: reason,
        sourceArchieComponentId: sourceComponentId,
        targetArchieComponentId: targetComponentId,
        sourceHandleId: connection.sourceHandle ?? null,
        targetHandleId: connection.targetHandle ?? null,
      },
    }

    set({ edges: [...get().edges, newEdge] })
    _evaluateTopology(get, set)
    get().triggerRecalculation(connection.source)
    get().triggerRecalculation(connection.target)
  },

  removeEdges: (edgeIds) => {
    const idsToRemove = new Set(edgeIds)
    const affectedNodeIds = new Set<string>()
    for (const edge of get().edges) {
      if (idsToRemove.has(edge.id)) {
        affectedNodeIds.add(edge.source)
        affectedNodeIds.add(edge.target)
      }
    }
    set({ edges: get().edges.filter((e) => !idsToRemove.has(e.id)) })
    _evaluateTopology(get, set)
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

  loadArchitecture: (nodes, edges, weightProfile?, constraints?, dataContextItems?, activeScenarioId?, activeFailureScenarioId?) => {
    clearPendingRippleTimeouts()
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
      dataContextItems: dataContextItems ?? new Map(),
      activeScenarioId: activeScenarioId ?? null,
      activeFailureScenarioId: activeFailureScenarioId ?? null,
    })

    useUiStore.getState().setSelectedNodeId(null)
    useUiStore.getState().setSelectedEdgeId(null)
    _evaluateTopology(get, set)

    for (const node of nodes) {
      get().triggerRecalculation(node.id)
    }
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => {
    set({ edges })
    // Edge changes affect topology (incl. 'replicas-without-lb'); keep issues fresh (Epic 14 review)
    _evaluateTopology(get, set)
  },

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
    if (!current.some((item) => item.id === itemId)) return
    // Runtime enum validation — TS types erased at runtime (review 7-3 fix #2)
    if (updates.accessPattern !== undefined && !(ACCESS_PATTERN_VALUES as readonly string[]).includes(updates.accessPattern)) return
    if (updates.averageSize !== undefined && !(DATA_SIZE_VALUES as readonly string[]).includes(updates.averageSize)) return
    if (updates.structureType !== undefined && !(STRUCTURE_TYPE_VALUES as readonly string[]).includes(updates.structureType)) return
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
export interface ArchitectureSkeleton {
  nodes: ArchieNode[]
  edges: ArchieEdge[]
  weightProfile: WeightProfile
  constraints: Constraint[]
  dataContextItems: Map<string, DataContextItem[]>
  activeScenarioId: string | null
  activeFailureScenarioId: string | null
}

export function getArchitectureSkeleton(): ArchitectureSkeleton {
  const state = useArchitectureStore.getState()
  return { nodes: state.nodes, edges: state.edges, weightProfile: state.weightProfile, constraints: state.constraints, dataContextItems: state.dataContextItems, activeScenarioId: state.activeScenarioId, activeFailureScenarioId: state.activeFailureScenarioId }
}
