import { useCallback, useEffect, useMemo, useRef, type DragEvent } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  applyEdgeChanges,
} from "@xyflow/react"
import type {
  NodeTypes,
  EdgeTypes,
  NodeMouseHandler,
  EdgeMouseHandler,
  OnConnect,
  OnEdgesChange,
  OnNodesDelete,
  OnEdgesDelete,
} from "@xyflow/react"
import {
  useArchitectureStore,
  type ArchieNode as ArchieNodeType,
  type ArchieEdge as ArchieEdgeType,
} from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { ArchieEdge } from "@/components/canvas/ArchieEdge"
import { EmptyCanvasState } from "@/components/canvas/EmptyCanvasState"
import {
  CANVAS_GRID_SIZE,
  CANVAS_MIN_ZOOM,
  CANVAS_MAX_ZOOM,
  EDGE_TYPE_CONNECTION,
  NODE_TYPE_COMPONENT,
} from "@/lib/constants"

const nodeTypes: NodeTypes = {
  [NODE_TYPE_COMPONENT]: ArchieNode,
}

function CanvasViewInner() {
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const onNodesChange = useArchitectureStore((s) => s.onNodesChange)
  const addNode = useArchitectureStore((s) => s.addNode)
  const addEdge = useArchitectureStore((s) => s.addEdge)
  const removeEdges = useArchitectureStore((s) => s.removeEdges)
  const removeNodes = useArchitectureStore((s) => s.removeNodes)
  const setEdges = useArchitectureStore((s) => s.setEdges)
  const setSelectedNodeId = useUiStore((s) => s.setSelectedNodeId)
  const setSelectedEdgeId = useUiStore((s) => s.setSelectedEdgeId)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const deselectAll = useArchitectureStore((s) => s.deselectAll)
  const { screenToFlowPosition } = useReactFlow()
  const containerRef = useRef<HTMLDivElement>(null)

  const edgeTypes: EdgeTypes = useMemo(
    () => ({ [EDGE_TYPE_CONNECTION]: ArchieEdge }),
    [],
  )

  const defaultEdgeOptions = useMemo(
    () => ({ type: EDGE_TYPE_CONNECTION }),
    [],
  )

  const handleNodeClick: NodeMouseHandler<ArchieNodeType> = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId],
  )

  const handleEdgeClick: EdgeMouseHandler<ArchieEdgeType> = useCallback(
    (_event, edge) => {
      setSelectedEdgeId(edge.id)
    },
    [setSelectedEdgeId],
  )

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      addEdge(connection)
    },
    [addEdge],
  )

  const handleEdgesChange: OnEdgesChange<ArchieEdgeType> = useCallback(
    (changes) => {
      // Only apply select and remove changes — edge creation is handled exclusively by onConnect
      const filteredChanges = changes.filter(
        (c) => c.type === "select" || c.type === "remove",
      )
      if (filteredChanges.length === 0) return
      const currentEdges = useArchitectureStore.getState().edges
      // applyEdgeChanges with select/remove changes preserves edge.data, so cast is safe
      const nextEdges = applyEdgeChanges(filteredChanges, currentEdges) as ArchieEdgeType[]
      setEdges(nextEdges)
    },
    [setEdges],
  )

  const handleNodesDelete: OnNodesDelete<ArchieNodeType> = useCallback(
    (deleted) => {
      removeNodes(deleted.map((n) => n.id))
    },
    [removeNodes],
  )

  const handleEdgesDelete: OnEdgesDelete<ArchieEdgeType> = useCallback(
    (deleted) => {
      removeEdges(deleted.map((e) => e.id))
    },
    [removeEdges],
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const componentId = event.dataTransfer.getData("application/archie-component")
      if (!componentId || componentId.length > 100 || !/^[a-z0-9-]+$/.test(componentId)) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(componentId, position)
    },
    [screenToFlowPosition, addNode],
  )

  const handlePaneClick = useCallback(() => {
    clearSelection()
    deselectAll()
  }, [clearSelection, deselectAll])

  // Escape key listener scoped to canvas container (AC-ARCH-PATTERN-13, AC-ARCH-NO-6)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection()
        deselectAll()
      }
    }

    container.addEventListener("keydown", handleKeyDown)
    return () => container.removeEventListener("keydown", handleKeyDown)
  }, [clearSelection, deselectAll])

  return (
    <div
      ref={containerRef}
      data-testid="canvas-panel"
      className="relative h-full w-full"
      tabIndex={-1}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={["Backspace", "Delete"]}
        snapToGrid
        snapGrid={[CANVAS_GRID_SIZE, CANVAS_GRID_SIZE]}
        minZoom={CANVAS_MIN_ZOOM}
        maxZoom={CANVAS_MAX_ZOOM}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={CANVAS_GRID_SIZE} />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Controls />
      </ReactFlow>
      <EmptyCanvasState />
    </div>
  )
}

export function CanvasView() {
  return (
    <ReactFlowProvider>
      <CanvasViewInner />
    </ReactFlowProvider>
  )
}
