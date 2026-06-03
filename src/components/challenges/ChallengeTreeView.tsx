import { useMemo, useState } from "react"
import { Lock, Star, Gift, Scroll, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
  CHALLENGE_TRACKS, CHALLENGE_TRACK_IDS, MAX_CHALLENGE_TIER,
  rankForXp,
} from "@/lib/challengeTracks"
import { getTrackAvatar } from "@/lib/masteryAvatars"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const TIER_LABELS = ["", "I", "II", "III", "IV", "V"]
const NODE_R = 32
const NODE_D = NODE_R * 2
const COL_GAP = 24
const ROW_GAP = 36
const HEADER_H = 68
const TIER_LABEL_W = 32
const COL_W = NODE_D + COL_GAP

interface NodePos { node: TechTreeNode; x: number; y: number; col: number; row: number }

function layoutTree(ordered: TechTreeNode[]) {
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
    const cx = TIER_LABEL_W + ci * COL_W + COL_GAP / 2 + NODE_R
    for (let tier = 1; tier <= MAX_CHALLENGE_TIER; tier++) {
      const nodes = byTrackTier.get(`${trackId}-${tier}`) ?? []
      for (let i = 0; i < nodes.length; i++) {
        const cy = HEADER_H + (tier - 1) * (NODE_D + ROW_GAP) + NODE_R
        positions.push({ node: nodes[i], x: cx, y: cy, col: ci, row: tier })
      }
    }
  }
  const width = TIER_LABEL_W + CHALLENGE_TRACK_IDS.length * COL_W + COL_GAP
  const height = HEADER_H + MAX_CHALLENGE_TIER * (NODE_D + ROW_GAP) + ROW_GAP
  return { positions, width, height }
}

function TreeDefs() {
  return (
    <defs>
      <filter id="glow-available">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-completed">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  )
}

function TreeEdges({ positions }: { positions: NodePos[] }) {
  const posMap = new Map(positions.map((p) => [p.node.challenge.id, p]))
  return (
    <>
      {positions.flatMap((to) =>
        to.node.challenge.requires.map((reqId) => {
          const from = posMap.get(reqId)
          if (!from) return null
          const isLocked = to.node.status === "locked"
          const isCompleted = from.node.status === "completed" && to.node.status !== "locked"
          const my1 = from.y + (to.y - from.y) * 0.3
          const my2 = from.y + (to.y - from.y) * 0.7
          return (
            <path
              key={`${reqId}->${to.node.challenge.id}`}
              d={from.col === to.col
                ? `M${from.x},${from.y + NODE_R} L${to.x},${to.y - NODE_R}`
                : `M${from.x},${from.y + NODE_R} C${from.x},${my1} ${to.x},${my2} ${to.x},${to.y - NODE_R}`}
              fill="none"
              stroke={isCompleted ? "#4a9eff" : isLocked ? "#374151" : "#6b7280"}
              strokeWidth={isCompleted ? 2.5 : 1.5}
              opacity={isLocked ? 0.25 : isCompleted ? 0.7 : 0.4}
              strokeDasharray={isLocked ? "6 4" : undefined}
              filter={isCompleted ? "url(#glow-available)" : undefined}
            />
          )
        }),
      )}
    </>
  )
}

function TreeNode({ pos, selected, bestStars, onClick }: {
  pos: NodePos; selected: boolean; bestStars: number; onClick: () => void
}) {
  const c = pos.node.challenge
  const isLocked = pos.node.status === "locked"
  const isCompleted = pos.node.status === "completed"
  const isAvailable = pos.node.status === "available"
  const grants = c.grants ?? []
  const firstGrant = grants[0]
  const grantLabel = firstGrant ? COMPONENT_TYPES.get(firstGrant) : null

  const borderColor = selected ? "#3b82f6" : isCompleted ? "#ffd700" : isAvailable ? "#4a9eff" : "#374151"
  const bgColor = isCompleted ? "#2a2a1a" : isAvailable ? "#1a2030" : "#1a1a1a"
  const glowFilter = isCompleted ? "url(#glow-completed)" : isAvailable ? "url(#glow-available)" : undefined

  return (
    <g onClick={onClick} style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      data-testid={`tree-node-${c.id}`} data-status={pos.node.status}>
      {/* Circular node frame */}
      <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={bgColor}
        stroke={borderColor} strokeWidth={selected ? 3 : 2}
        opacity={isLocked ? 0.35 : 1} filter={glowFilter} />

      {/* Quest status icon in center */}
      {isAvailable && (
        <text x={pos.x} y={pos.y - 2} fontSize={22} fontWeight={900} fill="#facc15" textAnchor="middle" dominantBaseline="central">!</text>
      )}
      {isCompleted && (
        <g transform={`translate(${pos.x - 16}, ${pos.y - 10})`}>
          {[0, 1, 2].map((i) => (
            <Star key={i} x={i * 12} y={0} width={10} height={10}
              fill={i < bestStars ? "#facc15" : "none"} stroke={i < bestStars ? "#facc15" : "#4b5563"} strokeWidth={1} />
          ))}
        </g>
      )}
      {isLocked && <Lock x={pos.x - 8} y={pos.y - 8} width={16} height={16} color="#555" />}

      {/* Title below the circle */}
      <text x={pos.x} y={pos.y + NODE_R + 12} fontSize={10} fontWeight={600}
        fill={isLocked ? "#555" : "#e5e7eb"} textAnchor="middle">
        {c.title.length > 14 ? c.title.slice(0, 13) + "…" : c.title}
      </text>
      <text x={pos.x} y={pos.y + NODE_R + 24} fontSize={8} fill="#9ca3af" textAnchor="middle">
        {c.rewards?.xp ?? 0} XP
      </text>

      {/* Grant block badge — bottom-left of the circle */}
      {firstGrant && (
        <g transform={`translate(${pos.x - NODE_R - 2}, ${pos.y + NODE_R - 16})`}>
          <circle cx={10} cy={10} r={10}
            fill={isCompleted ? "#ff8a3d20" : "#1e212850"}
            stroke={isCompleted ? "#ff8a3d" : "#4b5563"} strokeWidth={1.5} />
          <text x={10} y={13} fontSize={7} fontWeight={700}
            fill={isCompleted ? "#ff8a3d" : "#6b7280"} textAnchor="middle">
            {(grantLabel?.label ?? firstGrant).slice(0, 3).toUpperCase()}
          </text>
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
    <g transform={`translate(${x - NODE_R}, 0)`}>
      {avatar && <image href={avatar} x={NODE_R - 12} y={2} width={24} height={24} style={{ imageRendering: "pixelated" }} />}
      <text x={NODE_R} y={40} fontSize={10} fontWeight={700} fill="#e5e7eb" textAnchor="middle">{track.name}</text>
      <text x={NODE_R} y={52} fontSize={8} fill="#9ca3af" textAnchor="middle">{rankName}</text>
    </g>
  )
}

function QuestDetailPanel({ node, bestStars, onStart }: { node: TechTreeNode; bestStars: number; onStart: () => void }) {
  const c = node.challenge
  const trackMeta = c.track ? CHALLENGE_TRACKS.get(c.track) : undefined

  return (
    <div data-testid="tree-detail-panel" className="w-80 shrink-0 overflow-y-auto rounded-lg border-2 border-[#8b7355] bg-gradient-to-b from-[#1a1410] to-[#2a2015]">
      {/* Parchment header */}
      <div className="border-b-2 border-[#8b7355] px-4 py-3">
        <div className="flex items-center gap-2">
          {node.status === "available" && <span className="text-xl font-black text-yellow-400">!</span>}
          {node.status === "completed" && <CheckCircle2 className="h-5 w-5 text-[#ffd700]" />}
          {node.status === "locked" && <Lock className="h-4 w-4 text-[#8b7355]" />}
          <h3 className="text-base font-bold text-[#f5deb3]">{c.title}</h3>
        </div>
        {trackMeta && <span className="text-[0.625rem] text-[#c9a961]">{trackMeta.name} · Tier {TIER_LABELS[c.tier ?? 0]}</span>}
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Quest story */}
        <div>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-[#c9a961]">
            <Scroll className="h-3 w-3" /> Quest
          </div>
          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[#d0c8b8]">{c.brief}</p>
        </div>

        {/* Objectives */}
        <div>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-yellow-400">
            <AlertCircle className="h-3 w-3" /> Objectives
          </div>
          <div className="mt-1.5 flex flex-col gap-1">
            {[
              `Maintain ≥ ${c.targetMetrics.uptimePercent}% uptime`,
              `Keep p99 latency ≤ ${c.targetMetrics.p99LatencyMs}ms`,
              `Stay under $${c.budgetCap}/mo budget`,
              ...(c.requiredTypes.length > 0 ? [`Deploy: ${c.requiredTypes.map((t) => COMPONENT_TYPES.get(t)?.label ?? t).join(", ")}`] : []),
              ...(c.scheduledEvents.length > 0 ? [`Survive ${c.scheduledEvents.length} chaos event${c.scheduledEvents.length > 1 ? "s" : ""}`] : []),
            ].map((obj, i) => (
              <div key={i} className="flex items-start gap-2 text-[0.6875rem] text-[#d0c8b8]">
                <span className="mt-0.5 text-[#c9a961]">•</span>
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        {node.missingRequirements.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-amber-400">
              <Lock className="h-3 w-3" /> Prerequisites
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {node.missingRequirements.map((r) => (
                <span key={r} className="text-[0.6875rem] text-amber-400">• Complete "{r}"</span>
              ))}
            </div>
          </div>
        )}

        {/* Available blocks */}
        {c.availableBlocks.length > 0 && (
          <div>
            <div className="text-[0.625rem] font-bold uppercase tracking-wider text-[#c9a961]">Allowed Components</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.availableBlocks.map((b) => (
                <span key={b} className="rounded border border-[#8b7355]/50 bg-[#1a1410] px-1.5 py-0.5 text-[0.5625rem] text-[#d0c8b8]">
                  {COMPONENT_TYPES.get(b)?.label ?? b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rewards — golden border section */}
        <div className="rounded border border-[#c9a961]/40 bg-[#c9a96110] p-3">
          <div className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-[#ff8a3d]">
            <Gift className="h-3 w-3" /> Rewards
          </div>
          <div className="mt-1.5 flex flex-col gap-1 text-[0.6875rem]">
            {c.rewards?.xp && <span className="text-[#4a9eff]">+{c.rewards.xp} XP ({Math.ceil(c.rewards.xp / 3)} per ★)</span>}
            {c.grants.length > 0 && (
              <span className="font-semibold text-[#ff8a3d]">
                Unlocks: {c.grants.map((g) => COMPONENT_TYPES.get(g)?.label ?? g).join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Best stars */}
        {bestStars > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[0.625rem] text-[#8b7355]">Best:</span>
            {[1, 2, 3].map((n) => (
              <Star key={n} className={`h-3.5 w-3.5 ${n <= bestStars ? "fill-yellow-400 text-yellow-400" : "text-[#8b7355]"}`} />
            ))}
          </div>
        )}

        {/* Action button */}
        {node.status !== "locked" && (
          <Button size="sm" data-testid="tree-start-challenge" onClick={onStart}
            className="w-full bg-[#c9a961] text-[#1a1410] hover:bg-[#d4b872] font-bold">
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
      <DialogContent data-testid="quest-log" className="max-w-[95vw]! max-h-[90vh] w-full bg-[#0a0e14]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#f5deb3]">
            <span className="text-xl font-black text-yellow-400">!</span> Quest Log
          </DialogTitle>
          <DialogDescription className="text-[#8b7355]">Complete quests to master architecture patterns and unlock new blocks.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-4" style={{ height: "calc(85vh - 80px)" }}>
          <div className="flex-1 overflow-auto">
            <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} className="select-none">
              <TreeDefs />
              {CHALLENGE_TRACK_IDS.map((id, i) => (
                <TrackHeader key={id} trackId={id} x={TIER_LABEL_W + i * COL_W + COL_GAP / 2 + NODE_R} xp={trackXp[id] ?? 0} />
              ))}
              {Array.from({ length: MAX_CHALLENGE_TIER }, (_, i) => i + 1).map((tier) => (
                <text key={tier} x={14} y={HEADER_H + (tier - 1) * (NODE_D + ROW_GAP) + NODE_R + 4}
                  fontSize={10} fontWeight={600} fill="#4b5563" textAnchor="middle">{TIER_LABELS[tier]}</text>
              ))}
              <TreeEdges positions={layout.positions} />
              {layout.positions.map((pos) => (
                <TreeNode key={pos.node.challenge.id} pos={pos} selected={selectedId === pos.node.challenge.id}
                  bestStars={bestStars[pos.node.challenge.id] ?? 0}
                  onClick={() => setSelectedId(pos.node.challenge.id)} />
              ))}
            </svg>
          </div>
          {selectedNode && (
            <QuestDetailPanel node={selectedNode} bestStars={bestStars[selectedNode.challenge.id] ?? 0}
              onStart={() => startChallenge(selectedNode.challenge)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
