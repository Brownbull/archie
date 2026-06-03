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
import { CHALLENGE_TRACKS } from "@/lib/challengeTracks"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const TIER_LABELS = ["", "I", "II", "III", "IV", "V"]
const FONT_SCALE: Record<string, number> = { small: 1, medium: 1.15, large: 1.3 }
const NODE_R = 32
const ROW_GAP = 56
const HEADER_H = 24
const PAD_X = 50

const TRACK_COLORS: Record<string, string> = {
  foundations: "#3b82f6", data: "#22c55e", edge: "#06b6d4", realtime: "#ec4899",
  reliability: "#eab308", security: "#ef4444", aiml: "#a855f7",
}
const CATEGORY_COLORS: Record<string, string> = {
  "compute": "#3b82f6", "data-storage": "#22c55e", "caching": "#f97316",
  "messaging": "#a855f7", "delivery-network": "#06b6d4", "real-time": "#ec4899",
  "auth-security": "#ef4444", "monitoring": "#eab308", "search": "#14b8a6",
}

function getGrantColor(typeId: string): string {
  const t = COMPONENT_TYPES.get(typeId)
  return t ? (CATEGORY_COLORS[t.category] ?? "#6b7280") : "#6b7280"
}

interface NodePos { node: TechTreeNode; x: number; y: number; depth: number }

/** Layout by DAG depth — true tree, not a grid. */
function layoutTree(ordered: TechTreeNode[]) {
  const byId = new Map(ordered.map((n) => [n.challenge.id, n]))
  const depth = new Map<string, number>()

  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!
    const c = byId.get(id)
    if (!c || c.challenge.requires.length === 0) { depth.set(id, 0); return 0 }
    const d = 1 + Math.max(...c.challenge.requires.map((r) => getDepth(r)))
    depth.set(id, d)
    return d
  }
  for (const n of ordered) getDepth(n.challenge.id)

  const maxDepth = Math.max(...[...depth.values()], 0)
  const byDepth: TechTreeNode[][] = Array.from({ length: maxDepth + 1 }, () => [])
  for (const n of ordered) byDepth[depth.get(n.challenge.id) ?? 0].push(n)

  const maxWidth = Math.max(...byDepth.map((row) => row.length))
  const totalW = maxWidth * (NODE_R * 2 + 20) + PAD_X * 2

  const positions: NodePos[] = []
  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth[d]
    const rowW = row.length * (NODE_R * 2 + 20)
    const startX = PAD_X + (totalW - PAD_X * 2 - rowW) / 2 + NODE_R + 10
    for (let i = 0; i < row.length; i++) {
      positions.push({
        node: row[i],
        x: startX + i * (NODE_R * 2 + 20),
        y: HEADER_H + d * (NODE_R * 2 + ROW_GAP) + NODE_R,
        depth: d,
      })
    }
  }

  return {
    positions,
    width: totalW,
    height: HEADER_H + (maxDepth + 1) * (NODE_R * 2 + ROW_GAP) + ROW_GAP,
  }
}

function TreeDefs() {
  return (
    <defs>
      <filter id="gl-a"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="gl-d"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="gl-g"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
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
          const edgeTrackColor = TRACK_COLORS[to.node.challenge.track ?? ""] ?? "#4a9eff"
          const x1 = from.x, y1 = from.y + NODE_R
          const x2 = to.x, y2 = to.y - NODE_R
          const my = (y1 + y2) / 2
          const d = Math.abs(x2 - x1) < 5
            ? `M${x1},${y1} L${x2},${y2}`
            : `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`
          return (
            <path key={`${reqId}->${to.node.challenge.id}`} d={d} fill="none"
              stroke={isDone ? edgeTrackColor : isLocked ? "#1a1e28" : "#2a3040"}
              strokeWidth={isDone ? 2 : 1.5} opacity={isLocked ? 0.3 : isDone ? 0.8 : 0.3}
              strokeDasharray={isLocked ? "5 4" : undefined}
              filter={isDone ? "url(#gl-a)" : undefined} />
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
  const trackColor = TRACK_COLORS[c.track ?? ""] ?? "#6b7280"

  // Track-colored borders: completed = bright track color, available = softer track color, locked = dark
  const borderColor = selected ? "#ffffff" : isCompleted ? trackColor : isAvailable ? trackColor : "#1e2530"
  const bgFill = isCompleted ? `${trackColor}10` : isAvailable ? `${trackColor}08` : "#0e1118"
  const glow = isCompleted ? "url(#gl-d)" : isAvailable ? "url(#gl-a)" : undefined

  return (
    <g onClick={onClick} style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      data-testid={`tree-node-${c.id}`} data-status={pos.node.status}>

      {/* Track color ring (outer) — pillar identity */}
      <circle cx={pos.x} cy={pos.y} r={NODE_R + 4} fill="none"
        stroke={isLocked ? "#141820" : `${trackColor}${isCompleted ? "" : "60"}`}
        strokeWidth={2} opacity={isLocked ? 0.2 : 0.8} />

      {/* Grant ring (between track and main circle) */}
      {grants.length > 0 && !isLocked && (
        <circle cx={pos.x} cy={pos.y} r={NODE_R + 1} fill="none"
          stroke={isCompleted ? grantColor : `${grantColor}40`}
          strokeWidth={1.5} strokeDasharray={isCompleted ? undefined : "3 2"}
          filter={isCompleted ? "url(#gl-g)" : undefined} />
      )}

      {/* Main circle */}
      <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={bgFill}
        stroke={borderColor} strokeWidth={selected ? 2.5 : 1.5}
        opacity={isLocked ? 0.25 : 1} filter={glow} />

      {/* Center content */}
      {isAvailable && (
        <text x={pos.x} y={pos.y + 1} fontSize={22} fontWeight={900} fill="#facc15"
          textAnchor="middle" dominantBaseline="central">!</text>
      )}
      {isCompleted && (
        <g transform={`translate(${pos.x - 12}, ${pos.y - 5})`}>
          {[0, 1, 2].map((i) => (
            <Star key={i} x={i * 10} y={0} width={8} height={8}
              fill={i < bestStars ? "#facc15" : "none"} stroke={i < bestStars ? "#facc15" : "#4b5563"} strokeWidth={1} />
          ))}
        </g>
      )}
      {isLocked && <Lock x={pos.x - 6} y={pos.y - 6} width={12} height={12} color="#2a3040" />}

      {/* Title + XP */}
      <text x={pos.x} y={pos.y + NODE_R + 14} fontSize={11} fontWeight={600}
        fill={isLocked ? "#2a3040" : "#c8cdd5"} textAnchor="middle">
        {c.title.length > 14 ? c.title.slice(0, 13) + "…" : c.title}
      </text>
      <text x={pos.x} y={pos.y + NODE_R + 25} fontSize={9} fill="#6b7280" textAnchor="middle">
        {c.rewards?.xp ?? 0} XP
      </text>

      {/* Grant badge — bottom-left */}
      {firstGrant && (
        <g transform={`translate(${pos.x - NODE_R - 6}, ${pos.y + NODE_R * 0.3})`}>
          <circle cx={9} cy={9} r={10} fill="#080c12" stroke={isCompleted ? grantColor : `${grantColor}40`} strokeWidth={1.5} />
          <circle cx={9} cy={9} r={7} fill={isCompleted ? `${grantColor}25` : "#0e1118"} />
          <text x={9} y={12} fontSize={7} fontWeight={800}
            fill={isCompleted ? grantColor : "#3a4050"} textAnchor="middle">
            {(grantLabel?.label ?? firstGrant).slice(0, 3).toUpperCase()}
          </text>
        </g>
      )}
    </g>
  )
}

function QuestDetailPanel({ node, bestStars, onStart }: { node: TechTreeNode; bestStars: number; onStart: () => void }) {
  const c = node.challenge
  const trackMeta = c.track ? CHALLENGE_TRACKS.get(c.track) : undefined
  const trackColor = TRACK_COLORS[c.track ?? ""] ?? "#6b7280"

  const isLocked = node.status === "locked"
  const panelBorderColor = isLocked ? "#2a3040" : `${trackColor}60`
  const panelBg = isLocked
    ? "linear-gradient(135deg, #12141a 0%, #181c24 100%)"
    : `linear-gradient(135deg, ${trackColor}08 0%, ${trackColor}04 50%, #1a1410 100%)`

  return (
    <div data-testid="tree-detail-panel" className="w-full h-full overflow-y-auto rounded-lg quest-scroll"
      style={{ border: `2px solid ${panelBorderColor}`, background: panelBg }}>
      <div className="px-4 py-3" style={{ borderBottom: `2px solid ${panelBorderColor}` }}>
        <div className="flex items-center gap-2">
          {node.status === "available" && <span className="text-xl font-black text-yellow-400">!</span>}
          {node.status === "completed" && <CheckCircle2 className="h-5 w-5 text-[#ffd700]" />}
          {node.status === "locked" && <Lock className="h-4 w-4 text-[#8b7355]" />}
          <h3 className="text-base font-bold text-[#f5deb3]">{c.title}</h3>
        </div>
        {trackMeta && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[0.625rem]">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: trackColor }} />
            <span style={{ color: trackColor }}>{trackMeta.name}</span>
            <span className="text-[#8b7355]">· Tier {TIER_LABELS[c.tier ?? 0]}</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto p-4 quest-scroll" style={{ maxHeight: "calc(85vh - 160px)" }}>
        <div>
          <div className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-[#c9a961]">
            <Scroll className="h-3 w-3" /> Quest
          </div>
          <p className={`mt-1 text-[0.75rem] leading-relaxed ${node.status === "locked" ? "text-[#6b7280]" : "text-[#d0c8b8]"}`}>{c.brief}</p>
        </div>
        {node.status !== "locked" && (<div>
          <div className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-yellow-400">
            <AlertCircle className="h-3 w-3" /> Objectives
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            {[
              `Maintain ≥ ${c.targetMetrics.uptimePercent}% uptime`,
              `Keep p99 ≤ ${c.targetMetrics.p99LatencyMs}ms`,
              `Budget ≤ $${c.budgetCap}/mo`,
              ...(c.requiredTypes.length > 0 ? [`Deploy: ${c.requiredTypes.map((t) => COMPONENT_TYPES.get(t)?.label ?? t).join(", ")}`] : []),
              ...(c.scheduledEvents.length > 0 ? [`Survive ${c.scheduledEvents.length} chaos event${c.scheduledEvents.length > 1 ? "s" : ""}`] : []),
            ].map((o, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[0.6875rem] text-[#d0c8b8]">
                <span className="text-[#c9a961]">•</span><span>{o}</span>
              </div>
            ))}
          </div>
        </div>)}
        {node.missingRequirements.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-400">
              <Lock className="h-3 w-3" /> Prerequisites
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {node.missingRequirements.map((r) => (
                <span key={r} className="text-[0.6875rem] text-amber-400">• {r}</span>
              ))}
            </div>
          </div>
        )}
        {node.status !== "locked" && c.availableBlocks.length > 0 && (
          <div>
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-[#c9a961]">Components</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.availableBlocks.map((b) => {
                const cat = COMPONENT_TYPES.get(b)?.category
                const col = cat ? (CATEGORY_COLORS[cat] ?? "#6b7280") : "#6b7280"
                return (
                  <span key={b} className="rounded border px-1.5 py-0.5 text-[0.5625rem]"
                    style={{ borderColor: `${col}40`, color: col, backgroundColor: `${col}08` }}>
                    {COMPONENT_TYPES.get(b)?.label ?? b}
                  </span>
                )
              })}
            </div>
          </div>
        )}
        <div className="rounded border border-[#c9a961]/30 bg-[#c9a96108] p-2.5">
          <div className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-[#ff8a3d]">
            <Gift className="h-3 w-3" /> Rewards
          </div>
          <div className="mt-1 flex flex-col gap-1 text-[0.6875rem]">
            {c.rewards?.xp && <span className="text-[#4a9eff]">+{c.rewards.xp} XP ({Math.ceil(c.rewards.xp / 3)}/★)</span>}
            {c.grants.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.grants.map((g) => {
                  const col = getGrantColor(g)
                  return (
                    <span key={g} className="rounded-full px-2 py-0.5 text-[0.5625rem] font-bold"
                      style={{ backgroundColor: `${col}18`, color: col, border: `1px solid ${col}40` }}>
                      {COMPONENT_TYPES.get(g)?.label ?? g}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {bestStars > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[0.6rem] text-[#8b7355]">Best:</span>
            {[1, 2, 3].map((n) => (
              <Star key={n} className={`h-3 w-3 ${n <= bestStars ? "fill-yellow-400 text-yellow-400" : "text-[#8b7355]"}`} />
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
  const bestStars = useChallengeStore((s) => s.bestStars)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  const userId = useCurrentUserId()
  const fontSize = usePreferencesStore((s) => s.fontSize)
  const scale = FONT_SCALE[fontSize] ?? 1
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const totalXp = Object.values(useUserProgressStore.getState().trackXp).reduce((s, v) => s + v, 0)
  const tree = useMemo(() => resolveTechTree(challenges, completedChallenges, undefined, totalXp), [challenges, completedChallenges, totalXp])
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
          <DialogDescription className="text-[#6b7280]">
            {challenges.length} quests · {completedChallenges.length} completed
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-0" style={{ height: "calc(85vh - 80px)" }}>
          {/* Left: quest tree — always visible, fixed position */}
          <div className="flex-1 overflow-auto quest-scroll" style={{ minWidth: 0 }}>
            <div className="flex justify-center py-2">
              <svg width={layout.width * scale} height={layout.height * scale}
                viewBox={`0 0 ${layout.width} ${layout.height}`} className="select-none">
              <TreeDefs />
              <TreeEdges positions={layout.positions} />
              {layout.positions.map((pos) => (
                <TreeNode key={pos.node.challenge.id} pos={pos}
                  selected={selectedId === pos.node.challenge.id}
                  bestStars={bestStars[pos.node.challenge.id] ?? 0}
                  onClick={() => setSelectedId(pos.node.challenge.id)} />
              ))}
            </svg>
            </div>
          </div>
          {/* Right: quest detail — always visible, shows placeholder when nothing selected */}
          <div className="w-80 shrink-0 border-l border-[#1e2530]">
            {selectedNode ? (
              <QuestDetailPanel node={selectedNode}
                bestStars={bestStars[selectedNode.challenge.id] ?? 0}
                onStart={() => startChallenge(selectedNode.challenge)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="text-3xl">!</span>
                <p className="text-sm text-[#6b7280]">Select a quest from the tree to see its details</p>
                <p className="text-[0.625rem] text-[#4b5563]">{challenges.length} quests · {completedChallenges.length} completed</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
