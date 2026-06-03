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
  CHALLENGE_TRACKS, CHALLENGE_TRACK_IDS, MAX_CHALLENGE_TIER, rankForXp,
} from "@/lib/challengeTracks"
import { getTrackAvatar } from "@/lib/masteryAvatars"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const TIER_LABELS = ["", "I", "II", "III", "IV", "V"]
const NODE_R = 30
const NODE_D = NODE_R * 2
const COL_GAP = 28
const ROW_GAP = 40
const HEADER_H = 64
const TIER_LABEL_W = 28
const COL_W = NODE_D + COL_GAP

const CATEGORY_COLORS: Record<string, string> = {
  "compute": "#3b82f6", "data-storage": "#22c55e", "caching": "#f97316",
  "messaging": "#a855f7", "delivery-network": "#06b6d4", "real-time": "#ec4899",
  "auth-security": "#ef4444", "monitoring": "#eab308", "search": "#14b8a6",
}

function getGrantColor(typeId: string): string {
  const typeMeta = COMPONENT_TYPES.get(typeId)
  if (!typeMeta) return "#6b7280"
  return CATEGORY_COLORS[typeMeta.category] ?? "#6b7280"
}

interface NodePos { node: TechTreeNode; x: number; y: number; col: number; row: number }

function layoutTree(ordered: TechTreeNode[]) {
  const byTrackTier = new Map<string, TechTreeNode[]>()
  for (const n of ordered) {
    const key = `${n.challenge.track ?? "?"}-${n.challenge.tier ?? 0}`
    ;(byTrackTier.get(key) ?? (byTrackTier.set(key, []), byTrackTier.get(key)!)).push(n)
  }
  const positions: NodePos[] = []
  for (let ci = 0; ci < CHALLENGE_TRACK_IDS.length; ci++) {
    const trackId = CHALLENGE_TRACK_IDS[ci]
    const cx = TIER_LABEL_W + ci * COL_W + COL_GAP / 2 + NODE_R
    for (let tier = 1; tier <= MAX_CHALLENGE_TIER; tier++) {
      const nodes = byTrackTier.get(`${trackId}-${tier}`) ?? []
      for (const n of nodes) {
        positions.push({ node: n, x: cx, y: HEADER_H + (tier - 1) * (NODE_D + ROW_GAP) + NODE_R, col: ci, row: tier })
      }
    }
  }
  return {
    positions,
    width: TIER_LABEL_W + CHALLENGE_TRACK_IDS.length * COL_W + COL_GAP,
    height: HEADER_H + MAX_CHALLENGE_TIER * (NODE_D + ROW_GAP) + ROW_GAP,
  }
}

function TreeDefs() {
  return (
    <defs>
      <filter id="glow-avail"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="glow-done"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="glow-grant"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
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
          const isDone = from.node.status === "completed" && to.node.status !== "locked"
          const x1 = from.x, y1 = from.y + NODE_R
          const x2 = to.x, y2 = to.y - NODE_R
          const sameCol = from.col === to.col
          // Avoid overlapping: offset control points horizontally for cross-track edges
          const cpOffset = sameCol ? 0 : (to.col - from.col) * 8
          const d = sameCol
            ? `M${x1},${y1} L${x2},${y2}`
            : `M${x1},${y1} C${x1 + cpOffset},${y1 + (y2 - y1) * 0.4} ${x2 - cpOffset},${y1 + (y2 - y1) * 0.6} ${x2},${y2}`
          return (
            <path key={`${reqId}->${to.node.challenge.id}`} d={d} fill="none"
              stroke={isDone ? "#4a9eff" : isLocked ? "#1e2530" : "#3a4050"}
              strokeWidth={isDone ? 2 : 1.5}
              opacity={isLocked ? 0.3 : isDone ? 0.8 : 0.35}
              strokeDasharray={isLocked ? "5 4" : undefined}
              filter={isDone ? "url(#glow-avail)" : undefined} />
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
  const grantColor = firstGrant ? getGrantColor(firstGrant) : "#6b7280"
  const hasGrants = grants.length > 0

  const borderColor = selected ? "#ffffff" : isCompleted ? "#ffd700" : isAvailable ? "#4a9eff" : "#2a3040"
  const bgFill = isCompleted ? "#1c1a10" : isAvailable ? "#101828" : "#111418"
  const glowFilter = isCompleted ? "url(#glow-done)" : isAvailable ? "url(#glow-avail)" : undefined
  // Quests with grants get a special double-ring border
  const outerR = NODE_R + (hasGrants ? 4 : 0)

  return (
    <g onClick={onClick} style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      data-testid={`tree-node-${c.id}`} data-status={pos.node.status}>

      {/* Outer ring for quests that grant blocks — colored by grant category */}
      {hasGrants && !isLocked && (
        <circle cx={pos.x} cy={pos.y} r={outerR} fill="none"
          stroke={isCompleted ? grantColor : `${grantColor}60`}
          strokeWidth={2} strokeDasharray={isCompleted ? undefined : "3 2"}
          filter={isCompleted ? "url(#glow-grant)" : undefined} />
      )}

      {/* Main circle */}
      <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={bgFill}
        stroke={borderColor} strokeWidth={selected ? 3 : 1.5}
        opacity={isLocked ? 0.3 : 1} filter={glowFilter} />

      {/* Center content */}
      {isAvailable && (
        <text x={pos.x} y={pos.y + 1} fontSize={24} fontWeight={900} fill="#facc15"
          textAnchor="middle" dominantBaseline="central">!</text>
      )}
      {isCompleted && (
        <g transform={`translate(${pos.x - 14}, ${pos.y - 6})`}>
          {[0, 1, 2].map((i) => (
            <Star key={i} x={i * 11} y={0} width={9} height={9}
              fill={i < bestStars ? "#facc15" : "none"}
              stroke={i < bestStars ? "#facc15" : "#4b5563"} strokeWidth={1} />
          ))}
        </g>
      )}
      {isLocked && <Lock x={pos.x - 7} y={pos.y - 7} width={14} height={14} color="#3a4050" />}

      {/* Title + XP below */}
      <text x={pos.x} y={pos.y + NODE_R + 14} fontSize={9} fontWeight={600}
        fill={isLocked ? "#3a4050" : "#d0d5dd"} textAnchor="middle">
        {c.title.length > 15 ? c.title.slice(0, 14) + "…" : c.title}
      </text>
      <text x={pos.x} y={pos.y + NODE_R + 25} fontSize={8} fill="#6b7280" textAnchor="middle">
        {c.rewards?.xp ?? 0} XP
      </text>

      {/* Grant badge — bottom-left, colored by category */}
      {firstGrant && (
        <g transform={`translate(${pos.x - NODE_R - 4}, ${pos.y + NODE_R * 0.4})`}>
          <circle cx={10} cy={10} r={11} fill="#0a0e14"
            stroke={isCompleted ? grantColor : `${grantColor}50`} strokeWidth={2} />
          <circle cx={10} cy={10} r={8}
            fill={isCompleted ? `${grantColor}30` : "#111418"} />
          <text x={10} y={13} fontSize={6.5} fontWeight={800}
            fill={isCompleted ? grantColor : "#4b5563"} textAnchor="middle">
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
      {avatar && <image href={avatar} x={NODE_R - 12} y={0} width={24} height={24} style={{ imageRendering: "pixelated" }} />}
      <text x={NODE_R} y={38} fontSize={9} fontWeight={700} fill="#d0d5dd" textAnchor="middle">{track.name}</text>
      <text x={NODE_R} y={50} fontSize={7} fill="#6b7280" textAnchor="middle">{rankName}</text>
    </g>
  )
}

function QuestDetailPanel({ node, bestStars, onStart }: { node: TechTreeNode; bestStars: number; onStart: () => void }) {
  const c = node.challenge
  const trackMeta = c.track ? CHALLENGE_TRACKS.get(c.track) : undefined

  return (
    <div data-testid="tree-detail-panel" className="w-80 shrink-0 overflow-y-auto rounded-lg border-2 border-[#8b7355] bg-gradient-to-b from-[#1a1410] to-[#2a2015]">
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
        <div>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-[#c9a961]">
            <Scroll className="h-3 w-3" /> Quest
          </div>
          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[#d0c8b8]">{c.brief}</p>
        </div>
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
                <span className="mt-0.5 text-[#c9a961]">•</span><span>{obj}</span>
              </div>
            ))}
          </div>
        </div>
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
        {c.availableBlocks.length > 0 && (
          <div>
            <div className="text-[0.625rem] font-bold uppercase tracking-wider text-[#c9a961]">Allowed Components</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.availableBlocks.map((b) => {
                const cat = COMPONENT_TYPES.get(b)?.category
                const catColor = cat ? CATEGORY_COLORS[cat] ?? "#6b7280" : "#6b7280"
                return (
                  <span key={b} className="rounded border px-1.5 py-0.5 text-[0.5625rem]"
                    style={{ borderColor: `${catColor}40`, color: catColor, backgroundColor: `${catColor}10` }}>
                    {COMPONENT_TYPES.get(b)?.label ?? b}
                  </span>
                )
              })}
            </div>
          </div>
        )}
        <div className="rounded border border-[#c9a961]/40 bg-[#c9a96110] p-3">
          <div className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-[#ff8a3d]">
            <Gift className="h-3 w-3" /> Rewards
          </div>
          <div className="mt-1.5 flex flex-col gap-1 text-[0.6875rem]">
            {c.rewards?.xp && <span className="text-[#4a9eff]">+{c.rewards.xp} XP ({Math.ceil(c.rewards.xp / 3)} per ★)</span>}
            {c.grants.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.grants.map((g) => {
                  const color = getGrantColor(g)
                  return (
                    <span key={g} className="rounded-full px-2 py-0.5 text-[0.5625rem] font-bold"
                      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
                      {COMPONENT_TYPES.get(g)?.label ?? g}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {bestStars > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[0.625rem] text-[#8b7355]">Best:</span>
            {[1, 2, 3].map((n) => (
              <Star key={n} className={`h-3.5 w-3.5 ${n <= bestStars ? "fill-yellow-400 text-yellow-400" : "text-[#8b7355]"}`} />
            ))}
          </div>
        )}
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
      <DialogContent data-testid="quest-log" className="max-w-[95vw]! max-h-[90vh] w-full bg-[#080c12]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#f5deb3]">
            <span className="text-xl font-black text-yellow-400">!</span> Quest Log
          </DialogTitle>
          <DialogDescription className="text-[#6b7280]">Complete quests to master architecture patterns and unlock new blocks.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4" style={{ height: "calc(85vh - 80px)" }}>
          <div className="flex-1 overflow-auto">
            <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} className="select-none">
              <TreeDefs />
              {CHALLENGE_TRACK_IDS.map((id, i) => (
                <TrackHeader key={id} trackId={id} x={TIER_LABEL_W + i * COL_W + COL_GAP / 2 + NODE_R} xp={trackXp[id] ?? 0} />
              ))}
              {Array.from({ length: MAX_CHALLENGE_TIER }, (_, i) => i + 1).map((tier) => (
                <text key={tier} x={12} y={HEADER_H + (tier - 1) * (NODE_D + ROW_GAP) + NODE_R + 3}
                  fontSize={9} fontWeight={600} fill="#2a3040" textAnchor="middle">{TIER_LABELS[tier]}</text>
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
