import { useMemo, useState } from "react"
import { Lock, Star, Play, AlertCircle, CheckCircle2, Scroll, Gift } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getAllChallenges } from "@/services/challengeLoader"
import { resolveTechTree } from "@/engine/techTree"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { makeTrafficSourceNode, curvePeakRps } from "@/services/trafficSourceInjection"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import {
  CHALLENGE_TRACKS,
  CHALLENGE_TRACK_IDS,
  MAX_CHALLENGE_TIER,
  rankForXp,
  relativeLevelForTier,
  RELATIVE_LEVEL_COLORS,
  type RelativeLevel,
} from "@/lib/challengeTracks"
import { getTrackAvatar } from "@/lib/masteryAvatars"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const TIER_LABELS = ["", "I", "II", "III", "IV", "V"]

const NODE_W = 156
const NODE_H = 64
const COL_GAP = 20
const ROW_GAP = 28
const HEADER_H = 64
const TIER_LABEL_W = 40
const COL_W = NODE_W + COL_GAP

interface NodePos { node: TechTreeNode; x: number; y: number; col: number; row: number }

function layoutTree(ordered: TechTreeNode[]): { positions: NodePos[]; width: number; height: number } {
  const byTrackTier = new Map<string, TechTreeNode[]>()
  for (const n of ordered) {
    const key = `${n.challenge.track ?? "?"}-${n.challenge.tier ?? 0}`
    const arr = byTrackTier.get(key) ?? []
    arr.push(n)
    byTrackTier.set(key, arr)
  }
  const positions: NodePos[] = []
  for (let ci = 0; ci < CHALLENGE_TRACK_IDS.length; ci++) {
    const trackId = CHALLENGE_TRACK_IDS[ci]
    const colX = TIER_LABEL_W + ci * COL_W + COL_GAP / 2
    for (let tier = 1; tier <= MAX_CHALLENGE_TIER; tier++) {
      const nodes = byTrackTier.get(`${trackId}-${tier}`) ?? []
      for (let i = 0; i < nodes.length; i++) {
        positions.push({ node: nodes[i], x: colX, y: HEADER_H + (tier - 1) * (NODE_H + ROW_GAP), col: ci, row: tier })
      }
    }
  }
  const width = TIER_LABEL_W + CHALLENGE_TRACK_IDS.length * COL_W + COL_GAP
  const height = HEADER_H + MAX_CHALLENGE_TIER * (NODE_H + ROW_GAP)
  return { positions, width, height }
}

function TreeEdges({ positions }: { positions: NodePos[] }) {
  const posMap = new Map(positions.map((p) => [p.node.challenge.id, p]))
  return (
    <>
      {positions.flatMap((to) =>
        to.node.challenge.requires.map((reqId) => {
          const from = posMap.get(reqId)
          if (!from) return null
          const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H
          const x2 = to.x + NODE_W / 2, y2 = to.y
          const my = (y1 + y2) / 2
          const isLocked = to.node.status === "locked"
          return (
            <path
              key={`${reqId}->${to.node.challenge.id}`}
              d={from.col === to.col ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
              fill="none" stroke={isLocked ? "#374151" : "#6b7280"} strokeWidth={1.5}
              opacity={isLocked ? 0.3 : 0.5} strokeDasharray={isLocked ? "4 3" : undefined}
            />
          )
        }),
      )}
    </>
  )
}

function TreeNode({ pos, selected, playerRank, bestStars, onClick }: {
  pos: NodePos; selected: boolean; playerRank: number; bestStars: number; onClick: () => void
}) {
  const c = pos.node.challenge
  const isLocked = pos.node.status === "locked"
  const isCompleted = pos.node.status === "completed"
  const level: RelativeLevel = c.tier ? relativeLevelForTier(playerRank, c.tier) : "on-level"
  const color = RELATIVE_LEVEL_COLORS[level]
  const borderColor = selected ? "#3b82f6" : isCompleted ? color : isLocked ? "#374151" : "#4b5563"
  const grants = c.grants ?? []

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onClick={onClick}
      style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      data-testid={`tree-node-${c.id}`} data-status={pos.node.status}>
      <rect width={NODE_W} height={NODE_H} rx={8}
        fill={isCompleted ? `${color}10` : "#1e2128"}
        stroke={borderColor} strokeWidth={selected ? 2.5 : 1} opacity={isLocked ? 0.4 : 1} />
      {/* Quest exclamation mark for available quests */}
      {!isLocked && !isCompleted && (
        <text x={8} y={16} fontSize={14} fontWeight={700} fill="#facc15">!</text>
      )}
      <text x={grants.length > 0 || (!isLocked && !isCompleted) ? 22 : 10} y={20} fontSize={12} fontWeight={600}
        fill={isLocked ? "#6b7280" : "#e5e7eb"}>
        {c.title.length > 14 ? c.title.slice(0, 13) + "…" : c.title}
      </text>
      <text x={10} y={36} fontSize={10} fill="#9ca3af">
        {c.rewards?.xp ?? 0} XP · Tier {TIER_LABELS[c.tier ?? 0]}
      </text>
      {isLocked && <Lock x={NODE_W - 20} y={6} width={12} height={12} color="#6b7280" />}
      {isCompleted && (
        <g transform={`translate(${NODE_W - 46}, ${NODE_H - 18})`}>
          {[0, 1, 2].map((i) => (
            <Star key={i} x={i * 14} y={0} width={12} height={12}
              fill={i < bestStars ? "#facc15" : "none"} stroke={i < bestStars ? "#facc15" : "#4b5563"} strokeWidth={1} />
          ))}
        </g>
      )}
      {!isLocked && !isCompleted && (
        <Play x={NODE_W - 20} y={NODE_H - 20} width={12} height={12} color={color} fill={`${color}40`} />
      )}
      {/* Grant block icons in bottom-right */}
      {grants.length > 0 && (
        <g transform={`translate(${NODE_W - grants.length * 14 - 4}, ${NODE_H - 16})`}>
          {grants.map((g, i) => {
            const typeMeta = COMPONENT_TYPES.get(g)
            return (
              <g key={g} transform={`translate(${i * 14}, 0)`}>
                <rect width={12} height={12} rx={2}
                  fill={isCompleted ? "#ff8a3d20" : "#37415120"} stroke={isCompleted ? "#ff8a3d" : "#4b5563"} strokeWidth={0.5} />
                <text x={6} y={9} fontSize={6} fill={isCompleted ? "#ff8a3d" : "#6b7280"} textAnchor="middle">
                  {(typeMeta?.label ?? g).slice(0, 2).toUpperCase()}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </g>
  )
}

function TrackHeader({ trackId, x, xp }: { trackId: string; x: number; xp: number }) {
  const track = CHALLENGE_TRACKS.get(trackId)
  const avatar = getTrackAvatar(trackId)
  const { name: rankName } = rankForXp(xp)
  if (!track) return null
  return (
    <g transform={`translate(${x}, 0)`}>
      {avatar && <image href={avatar} x={(NODE_W - 24) / 2} y={2} width={24} height={24} style={{ imageRendering: "pixelated" }} />}
      <text x={NODE_W / 2} y={40} fontSize={11} fontWeight={700} fill="#e5e7eb" textAnchor="middle">{track.name}</text>
      <text x={NODE_W / 2} y={54} fontSize={9} fill="#9ca3af" textAnchor="middle">{rankName} · {xp} XP</text>
    </g>
  )
}

/** WoW-style quest detail panel */
function QuestDetailPanel({ node, bestStars, onStart }: { node: TechTreeNode; bestStars: number; onStart: () => void }) {
  const c = node.challenge
  const trackMeta = c.track ? CHALLENGE_TRACKS.get(c.track) : undefined

  return (
    <div data-testid="tree-detail-panel" className="w-72 shrink-0 overflow-y-auto rounded-lg border border-archie-border bg-surface">
      {/* Header — quest title + track */}
      <div className="border-b border-archie-border bg-panel/50 px-4 py-3">
        <div className="flex items-center gap-2">
          {node.status === "available" && <span className="text-lg font-bold text-yellow-400">!</span>}
          {node.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {node.status === "locked" && <Lock className="h-4 w-4 text-text-secondary" />}
          <h3 className="text-sm font-bold text-text-primary">{c.title}</h3>
        </div>
        {trackMeta && (
          <span className="text-[0.625rem] text-text-secondary">{trackMeta.name} · Tier {TIER_LABELS[c.tier ?? 0]}</span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Brief — the quest story */}
        <div>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-semibold text-text-secondary">
            <Scroll className="h-3 w-3" /> Quest
          </div>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-text-secondary">{c.brief}</p>
        </div>

        {/* Objectives */}
        <div>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-semibold text-yellow-400">
            <AlertCircle className="h-3 w-3" /> Objectives
          </div>
          <ul className="mt-1 flex flex-col gap-0.5 text-[0.625rem] text-text-secondary">
            <li>Uptime ≥ {c.targetMetrics.uptimePercent}%</li>
            <li>p99 latency ≤ {c.targetMetrics.p99LatencyMs}ms</li>
            <li>Budget ≤ ${c.budgetCap}/mo</li>
            {c.requiredTypes.length > 0 && (
              <li>Use: {c.requiredTypes.map((t) => COMPONENT_TYPES.get(t)?.label ?? t).join(", ")}</li>
            )}
            {c.scheduledEvents.length > 0 && <li>Survive {c.scheduledEvents.length} chaos event{c.scheduledEvents.length > 1 ? "s" : ""}</li>}
          </ul>
        </div>

        {/* Conditions */}
        {node.missingRequirements.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[0.625rem] font-semibold text-amber-400">
              <Lock className="h-3 w-3" /> Prerequisites
            </div>
            <ul className="mt-1 flex flex-col gap-0.5">
              {node.missingRequirements.map((r) => (
                <li key={r} className="text-[0.625rem] text-amber-400">• {r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Available blocks */}
        {c.availableBlocks.length > 0 && (
          <div>
            <div className="text-[0.625rem] font-semibold text-text-secondary">Available Blocks</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.availableBlocks.map((b) => (
                <span key={b} className="rounded bg-panel px-1.5 py-0.5 text-[0.5rem] text-text-secondary">
                  {COMPONENT_TYPES.get(b)?.label ?? b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="rounded-md border border-archie-border bg-panel p-2">
          <div className="flex items-center gap-1.5 text-[0.625rem] font-semibold text-[#ff8a3d]">
            <Gift className="h-3 w-3" /> Rewards
          </div>
          <div className="mt-1 flex flex-col gap-0.5 text-[0.625rem]">
            {c.rewards?.xp && <span className="text-blue-300">+{c.rewards.xp} XP ({Math.ceil(c.rewards.xp / 3)} per ★)</span>}
            {c.grants.length > 0 && (
              <span className="text-[#ff8a3d]">
                Unlocks: {c.grants.map((g) => COMPONENT_TYPES.get(g)?.label ?? g).join(", ")}
              </span>
            )}
            {c.grants.length === 0 && !c.rewards?.xp && (
              <span className="text-text-secondary">Experience only</span>
            )}
          </div>
        </div>

        {/* Stars earned */}
        {bestStars > 0 && (
          <div className="flex items-center gap-1 text-[0.625rem]">
            <span className="text-text-secondary">Best:</span>
            {[1, 2, 3].map((n) => (
              <Star key={n} className={`h-3 w-3 ${n <= bestStars ? "fill-yellow-400 text-yellow-400" : "text-text-secondary"}`} />
            ))}
          </div>
        )}

        {/* Status badge */}
        <span className={`inline-block self-start rounded-full px-2 py-0.5 text-[0.5625rem] font-medium ${
          node.status === "completed" ? "bg-emerald-500/20 text-emerald-300"
          : node.status === "available" ? "bg-yellow-500/20 text-yellow-300"
          : "bg-gray-500/20 text-gray-400"
        }`}>
          {node.status === "available" ? "Available" : node.status === "completed" ? "Completed" : "Locked"}
        </span>

        {node.status !== "locked" && (
          <Button size="sm" data-testid="tree-start-challenge" onClick={onStart} className="w-full">
            {node.status === "completed" ? "Replay Quest" : "Accept Quest"}
          </Button>
        )}
      </div>
    </div>
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
      <DialogContent data-testid="quest-log" className="max-w-[95vw]! max-h-[90vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg font-bold text-yellow-400">!</span> Quest Log
          </DialogTitle>
          <DialogDescription>Complete quests to master architecture patterns and unlock new blocks.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-4" style={{ height: "calc(85vh - 80px)" }}>
          <div className="flex-1 overflow-auto">
            <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} className="select-none">
              {CHALLENGE_TRACK_IDS.map((id, i) => (
                <TrackHeader key={id} trackId={id} x={TIER_LABEL_W + i * COL_W + COL_GAP / 2} xp={trackXp[id] ?? 0} />
              ))}
              {Array.from({ length: MAX_CHALLENGE_TIER }, (_, i) => i + 1).map((tier) => (
                <text key={tier} x={16} y={HEADER_H + (tier - 1) * (NODE_H + ROW_GAP) + NODE_H / 2 + 4}
                  fontSize={11} fontWeight={600} fill="#6b7280" textAnchor="middle">{TIER_LABELS[tier]}</text>
              ))}
              <TreeEdges positions={layout.positions} />
              {layout.positions.map((pos) => {
                const trackRank = pos.node.challenge.track ? rankForXp(trackXp[pos.node.challenge.track] ?? 0).rank : 0
                return (
                  <TreeNode key={pos.node.challenge.id} pos={pos} selected={selectedId === pos.node.challenge.id}
                    playerRank={trackRank} bestStars={bestStars[pos.node.challenge.id] ?? 0}
                    onClick={() => setSelectedId(pos.node.challenge.id)} />
                )
              })}
            </svg>
          </div>

          {selectedNode && (
            <QuestDetailPanel
              node={selectedNode}
              bestStars={bestStars[selectedNode.challenge.id] ?? 0}
              onStart={() => startChallenge(selectedNode.challenge)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
