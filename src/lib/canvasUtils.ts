import { CANVAS_GRID_SIZE, NODE_WIDTH, POSITION_EPSILON } from "@/lib/constants"

export function snapToGrid(value: number): number {
  return Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
}

const NODE_GAP = CANVAS_GRID_SIZE * 2 // 32px between nodes

export function findNextAvailablePosition(nodes: { position: { x: number; y: number } }[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 }

  const maxX = Math.max(...nodes.map((n) => n.position.x))
  const sameRowNodes = nodes.filter((n) => Math.abs(n.position.x - maxX) < POSITION_EPSILON)
  const y = sameRowNodes[0]?.position.y ?? 0

  return {
    x: snapToGrid(maxX + NODE_WIDTH + NODE_GAP),
    y: snapToGrid(y),
  }
}
