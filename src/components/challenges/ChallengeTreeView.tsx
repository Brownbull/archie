import { useMemo, useState } from "react"
import { Lock, Star, Play } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAllChallenges } from "@/services/challengeLoader"
import { resolveTechTree } from "@/engine/techTree"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { makeTrafficSourceNode, curvePeakRps } from "@/services/trafficSourceInjection"
import {
  CHALLENGE_TRACKS,
  CHALLENGE_TRACK_IDS,
  MAX_CHALLENGE_TIER,
  rankForXp,
  relativeLevelForTier,
  RELATIVE_LEVEL_COLORS,
  type RelativeLevel,
} from "@/lib/challengeTracks"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const TIER_LABELS = ["", "I", "II", "III", "IV", "V"]

const NODE_W = 140
const NODE_H = 56
const GAP_X = 24
const GAP_Y = 20
const TIER_HEADER_H = 28

interface NodePos {
  node: TechTreeNode
  x: number
  y: number
  tier: number
  trackIdx: number
}

function layoutTree(ordered: TechTreeNode[]): { positions: NodePos[]; width: number; height: number } {
  const byTrackTier = new Map<string, TechTreeNode[]>()
  for (const n of ordered) {
    const key = `${n.challenge.track ?? "unknown"}-${n.challenge.tier ?? 0}`
    const list = byTrackTier.get(key) ?? []
    list.push(n)
    byTrackTier.set(key, list)
  }

  const positions: NodePos[] = []
  let maxX = 0

  for (let trackIdx = 0; trackIdx < CHALLENGE_TRACK_IDS.length; trackIdx++) {
    const trackId = CHALLENGE_TRACK_IDS[trackIdx]
    const baseY = trackIdx * (NODE_H + GAP_Y + TIER_HEADER_H) + TIER_HEADER_H

    for (let tier = 1; tier <= MAX_CHALLENGE_TIER; tier++) {
      const nodes = byTrackTier.get(`${trackId}-${tier}`) ?? []
      for (let i = 0; i < nodes.length; i++) {
        const x = (tier - 1) * (NODE_W + GAP_X) + i * (NODE_W + GAP_X / 2)
        positions.push({ node: nodes[i], x, y: baseY, tier, trackIdx })
        maxX = Math.max(maxX, x + NODE_W)
      }
    }
  }

  const height = CHALLENGE_TRACK_IDS.length * (NODE_H + GAP_Y + TIER_HEADER_H) + GAP_Y
  return { positions, width: maxX + GAP_X, height }
}

function TreeNode({
  pos,
  selected,
  playerRank,
  bestStars,
  onClick,
}: {
  pos: NodePos
  selected: boolean
  playerRank: number
  bestStars: number
  onClick: () => void
}) {
  const c = pos.node.challenge
  const isLocked = pos.node.status === "locked"
  const isCompleted = pos.node.status === "completed"
  const level: RelativeLevel = c.tier ? relativeLevelForTier(playerRank, c.tier) : "on-level"
  const color = RELATIVE_LEVEL_COLORS[level]

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={onClick}
      style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      data-testid={`tree-node-${c.id}`}
      data-status={pos.node.status}
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={6}
        fill={isLocked ? "#1a1d23" : isCompleted ? `${color}15` : "#1e2128"}
        stroke={selected ? "#3b82f6" : isCompleted ? color : isLocked ? "#333" : "#444"}
        strokeWidth={selected ? 2 : 1}
        opacity={isLocked ? 0.5 : 1}
      />
      <text x={8} y={16} fontSize={10} fontWeight={600} fill={isLocked ? "#666" : "#e8edf5"}>
        {c.title.length > 16 ? c.title.slice(0, 15) + "…" : c.title}
      </text>
      <text x={8} y={30} fontSize={8} fill="#9aa3b0">
        {c.rewards?.xp ? `${c.rewards.xp} XP` : ""} · Tier {TIER_LABELS[c.tier ?? 0]}
      </text>
      {isLocked && <Lock x={NODE_W - 18} y={6} width={12} height={12} color="#666" />}
      {isCompleted && (
        <g transform={`translate(${NODE_W - 42}, ${NODE_H - 16})`}>
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              x={i * 12}
              y={0}
              width={10}
              height={10}
              fill={i < bestStars ? "#facc15" : "none"}
              stroke={i < bestStars ? "#facc15" : "#555"}
              strokeWidth={1}
            />
          ))}
        </g>
      )}
      {!isLocked && !isCompleted && <Play x={NODE_W - 18} y={NODE_H - 18} width={12} height={12} color={color} />}
    </g>
  )
}

function TreeEdges({ positions }: { positions: NodePos[] }) {
  const posMap = new Map(positions.map((p) => [p.node.challenge.id, p]))

  const edges: Array<{ from: NodePos; to: NodePos }> = []
  for (const pos of positions) {
    for (const reqId of pos.node.challenge.requires) {
      const from = posMap.get(reqId)
      if (from) edges.push({ from, to: pos })
    }
  }

  return (
    <>
      {edges.map(({ from, to }, i) => {
        const x1 = from.x + NODE_W
        const y1 = from.y + NODE_H / 2
        const x2 = to.x
        const y2 = to.y + NODE_H / 2
        const mx = (x1 + x2) / 2
        return (
          <path
            key={i}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none"
            stroke={to.node.status === "locked" ? "#333" : "#555"}
            strokeWidth={1}
            opacity={to.node.status === "locked" ? 0.4 : 0.7}
          />
        )
      })}
    </>
  )
}

export function ChallengeTreeView({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const challenges = getAllChallenges()
  const completedChallenges = useUserProgressStore((s) => s.completedChallenges)
  const trackXp = useUserProgressStore((s) => s.trackXp)
  const bestStars = useChallengeStore((s) => s.bestStars)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  const userId = useCurrentUserId()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const tree = useMemo(() => resolveTechTree(challenges, completedChallenges), [challenges, completedChallenges])
  const layout = useMemo(() => layoutTree(tree.ordered), [tree.ordered])

  const selectedNode = selectedId ? tree.nodes.get(selectedId) : null

  const startChallenge = (c: Challenge) => {
    if (!userId) return
    try {
      const peak = curvePeakRps(c.trafficCurve)
      const source = makeTrafficSourceNode(peak, { x: 64, y: 240 })
      useSimulationStore.getState().reset()
      useArchitectureStore.getState().loadArchitecture(source ? [source] : [], [])
    } catch { /* ignore */ }
    usePreferencesStore.getState().setExperienceLevel(c.difficulty)
    selectChallenge(c)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="challenge-tree-view" className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Challenge Journey</DialogTitle>
          <DialogDescription>Your progression through the Mastery Tracks tech tree. Click a challenge to select it, then start.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          <ScrollArea className="flex-1" style={{ height: "65vh" }}>
            <div style={{ minWidth: layout.width, minHeight: layout.height, position: "relative" }}>
              <svg width={layout.width} height={layout.height} className="absolute inset-0">
                <TreeEdges positions={layout.positions} />
                {layout.positions.map((pos) => {
                  const trackRank = pos.node.challenge.track ? rankForXp(trackXp[pos.node.challenge.track] ?? 0).rank : 0
                  return (
                    <TreeNode
                      key={pos.node.challenge.id}
                      pos={pos}
                      selected={selectedId === pos.node.challenge.id}
                      playerRank={trackRank}
                      bestStars={bestStars[pos.node.challenge.id] ?? 0}
                      onClick={() => setSelectedId(pos.node.challenge.id)}
                    />
                  )
                })}

                {CHALLENGE_TRACK_IDS.map((id, i) => {
                  const track = CHALLENGE_TRACKS.get(id)
                  const y = i * (NODE_H + GAP_Y + TIER_HEADER_H) + 4
                  return (
                    <text key={id} x={0} y={y} fontSize={9} fontWeight={700} fill="#9aa3b0" textAnchor="start">
                      {track?.name ?? id}
                    </text>
                  )
                })}
              </svg>
            </div>
          </ScrollArea>

          {selectedNode && (
            <div data-testid="tree-detail-panel" className="w-56 shrink-0 rounded-md border border-archie-border bg-surface p-3">
              <h3 className="text-sm font-bold text-text-primary">{selectedNode.challenge.title}</h3>
              <p className="mt-1 text-[0.625rem] text-text-secondary">{selectedNode.challenge.brief}</p>
              <div className="mt-2 flex flex-col gap-1 text-[0.5625rem] text-text-secondary">
                <span>Track: {CHALLENGE_TRACKS.get(selectedNode.challenge.track ?? "")?.name}</span>
                <span>Tier: {TIER_LABELS[selectedNode.challenge.tier ?? 0]}</span>
                <span>Budget: ${selectedNode.challenge.budgetCap}/mo</span>
                <span>Duration: {selectedNode.challenge.durationSeconds}s</span>
                {selectedNode.challenge.rewards?.xp && <span>Reward: {selectedNode.challenge.rewards.xp} XP</span>}
                <span>Status: {selectedNode.status}</span>
                {selectedNode.missingRequirements.length > 0 && (
                  <span className="text-amber-400">Requires: {selectedNode.missingRequirements.join(", ")}</span>
                )}
              </div>
              {selectedNode.status !== "locked" && (
                <button
                  type="button"
                  data-testid="tree-start-challenge"
                  onClick={() => startChallenge(selectedNode.challenge)}
                  className="mt-3 w-full rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Start Challenge
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
