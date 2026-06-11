import { useMemo, useState } from "react"
import { Lock, Star, Gift, Scroll, AlertCircle, CheckCircle2, Hammer, Wrench } from "lucide-react"
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
import { makeChallengeCanvas } from "@/services/challengeCanvasSeed"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import { CHALLENGE_TRACKS } from "@/lib/challengeTracks"
import { BREAK_ATTRIBUTES, BREAK_ATTRIBUTE_LABELS, type BreaksRecord } from "@/engine/breakDetection"
import { getFailurePreset } from "@/services/failureLoader"
import { ShieldCheck } from "lucide-react"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const TIER_LABELS = ["", "I", "II", "III", "IV", "V", "VI"]
const FONT_SCALE: Record<string, number> = { small: 1, medium: 1.15, large: 1.3 }
const NODE_R = 32
const ROW_GAP = 56
const HEADER_H = 24
const PAD_X = 50
const NODE_W = NODE_R * 2 + 20 // horizontal slot per node
const SUBROW_H = NODE_R * 2 + ROW_GAP // vertical pitch per dependency sub-row
const NODE_FOOT = NODE_R * 2 + 32 // a node's real footprint: circle + title + XP label
const BAND_GAP = 44 // compact gap between a band's last element and the next tier separator
const SEP_OFFSET = 20 // separator line sits this far above its band's first row

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

interface NodePos { node: TechTreeNode; x: number; y: number; row: number }
interface TierBand { tier: number; y: number; label: string }

/**
 * Layout in vertical TIER BANDS (tier 1 at top → tier 5 at bottom, separators between), and within a
 * band, in dependency SUB-ROWS: a quest sits one row below any same-tier quest it requires (Rule 2).
 * Cross-tier dependencies are satisfied implicitly because a higher tier's band is entirely below a
 * lower one (Rule 1). Quests sharing a (tier, sub-row) spread horizontally, grouped by track.
 */
function layoutTree(ordered: TechTreeNode[]) {
  const byId = new Map(ordered.map((n) => [n.challenge.id, n]))
  const tierOf = (n: TechTreeNode) => n.challenge.tier ?? 0
  const tiers = [...new Set(ordered.map(tierOf))].sort((a, b) => a - b)

  // Sub-row within a tier = local dependency depth counting ONLY same-tier prerequisites.
  const subRow = new Map<string, number>()
  for (const t of tiers) {
    const memo = new Map<string, number>()
    const dep = (id: string): number => {
      const cached = memo.get(id)
      if (cached !== undefined) return cached
      const n = byId.get(id)
      const sameTierReqs = n ? n.challenge.requires.filter((r) => byId.has(r) && tierOf(byId.get(r)!) === t) : []
      const d = sameTierReqs.length === 0 ? 0 : 1 + Math.max(...sameTierReqs.map(dep))
      memo.set(id, d)
      return d
    }
    for (const n of ordered) if (tierOf(n) === t) subRow.set(n.challenge.id, dep(n.challenge.id))
  }

  // Stack tier bands top-to-bottom. Each band is sized to its ACTUAL content — (rows-1) sub-row
  // pitches plus one node footprint — so there's no empty slack between the last element and the next
  // tier separator. Bands are separated by a tight BAND_GAP that holds the separator + label.
  const bandY = new Map<number, number>()
  const bands: TierBand[] = []
  let y = HEADER_H + SEP_OFFSET + 8
  for (const t of tiers) {
    const rowsInTier = 1 + Math.max(0, ...ordered.filter((n) => tierOf(n) === t).map((n) => subRow.get(n.challenge.id)!))
    bandY.set(t, y)
    bands.push({ tier: t, y: y - SEP_OFFSET, label: `Tier ${TIER_LABELS[t] ?? t}` })
    y += (rowsInTier - 1) * SUBROW_H + NODE_FOOT + BAND_GAP
  }
  const totalHeight = y

  // Group by (tier, sub-row); spread each group horizontally, centered, grouped by track for legibility.
  const groups = new Map<string, TechTreeNode[]>()
  for (const n of ordered) {
    const key = `${tierOf(n)}:${subRow.get(n.challenge.id)}`
    const arr = groups.get(key)
    if (arr) arr.push(n)
    else groups.set(key, [n])
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) =>
      (a.challenge.track ?? "").localeCompare(b.challenge.track ?? "") || a.challenge.id.localeCompare(b.challenge.id))
  }
  const maxRowCount = Math.max(1, ...[...groups.values()].map((a) => a.length))
  const totalW = maxRowCount * NODE_W + PAD_X * 2

  const positions: NodePos[] = []
  for (const [key, arr] of groups) {
    const [t, lr] = key.split(":").map(Number)
    const rowW = arr.length * NODE_W
    const startX = PAD_X + (totalW - PAD_X * 2 - rowW) / 2 + NODE_R + 10
    const rowY = bandY.get(t)! + lr * SUBROW_H + NODE_R
    arr.forEach((node, i) => positions.push({ node, x: startX + i * NODE_W, y: rowY, row: lr }))
  }

  return { positions, width: totalW, height: totalHeight, bands }
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
              stroke={isDone ? edgeTrackColor : isLocked ? "#4a5468" : "#7184a6"}
              strokeWidth={isDone ? 2 : 1.75} opacity={isDone ? 0.9 : isLocked ? 0.5 : 0.72}
              strokeDasharray={isLocked ? "5 4" : undefined}
              filter={isDone ? "url(#gl-a)" : undefined} />
          )
        }),
      )}
    </>
  )
}

function TierSeparators({ bands, width }: { bands: TierBand[]; width: number }) {
  return (
    <>
      {bands.map((b) => (
        <g key={b.tier} data-testid={`tier-separator-${b.tier}`}>
          <line x1={16} y1={b.y} x2={width - 16} y2={b.y} stroke="#2a3040" strokeWidth={1} strokeDasharray="2 6" opacity={0.7} />
          <text x={20} y={b.y - 7} fontSize={11} fontWeight={700} fill="#8b7355" letterSpacing={1.5}>
            {b.label.toUpperCase()}
          </text>
        </g>
      ))}
    </>
  )
}

function TreeNode({ pos, selected, bestStars, breaksCollected, onClick }: {
  pos: NodePos; selected: boolean; bestStars: number;
  /** Collected break-dials for this quest (0–4), or null when the quest has no authored traffic
   *  to break (legacy curve-only) — null hides the extra-challenge corner badge entirely. */
  breaksCollected: number | null;
  onClick: () => void
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

  // Track-colored borders at all states: bright when done/available, muted when locked
  const borderColor = selected ? "#ffffff" : isCompleted ? trackColor : isAvailable ? trackColor : `${trackColor}30`
  const bgFill = isCompleted ? `${trackColor}10` : isAvailable ? `${trackColor}08` : `${trackColor}05`
  const glow = isCompleted ? "url(#gl-d)" : isAvailable ? "url(#gl-a)" : undefined

  return (
    <g onClick={onClick} style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      data-testid={`tree-node-${c.id}`} data-status={pos.node.status}>

      {/* Track color ring (outer) — pillar identity, visible even when locked */}
      <circle cx={pos.x} cy={pos.y} r={NODE_R + 4} fill="none"
        stroke={trackColor}
        strokeWidth={2} opacity={isLocked ? 0.15 : isCompleted ? 0.9 : 0.5} />

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
      {isLocked && <Lock x={pos.x - 6} y={pos.y - 6} width={12} height={12} color={`${trackColor}40`} />}

      {/* Title + XP */}
      <text x={pos.x} y={pos.y + NODE_R + 14} fontSize={11} fontWeight={600}
        fill={isLocked ? `${trackColor}35` : "#c8cdd5"} textAnchor="middle">
        {c.title.length > 14 ? c.title.slice(0, 13) + "…" : c.title}
      </text>
      <text x={pos.x} y={pos.y + NODE_R + 25} fontSize={9} fill="#6b7280" textAnchor="middle">
        {c.rewards?.xp ?? 0} XP
      </text>

      {/* Extra-challenge corner badge — top-right (P4-S6, D94): a completed quest with authored
          traffic carries the break-it extras; the badge shows collection progress (N/4 dials).
          Orange once collecting started, dim until then — and NEVER a star (expert ≠ hint pool). */}
      {isCompleted && breaksCollected !== null && (
        <g data-testid={`break-badge-${c.id}`} transform={`translate(${pos.x + NODE_R - 4}, ${pos.y - NODE_R - 12})`}>
          <title>{`Break-it extras: ${breaksCollected} of 4 traffic dials collected — replay, hold 3★, then break it one dial at a time (+1 Expert each)`}</title>
          <circle cx={10} cy={10} r={10.5} fill="#080c12" stroke={breaksCollected > 0 ? "#f97316" : "#f9731640"} strokeWidth={1.5} />
          <Hammer x={3.5} y={5.5} width={8} height={8} color={breaksCollected > 0 ? "#f97316" : "#6b7280"} />
          <text x={13} y={13} fontSize={7} fontWeight={800} fill={breaksCollected > 0 ? "#f97316" : "#6b7280"} textAnchor="middle">
            {breaksCollected}
          </text>
        </g>
      )}

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

function QuestDetailPanel({ node, bestStars, breaksRecord, clearsRecord, onStart }: { node: TechTreeNode; bestStars: number; breaksRecord: BreaksRecord | undefined; clearsRecord: Readonly<Record<string, true>> | undefined; onStart: () => void }) {
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
        {/* Extra challenges (P4-S6, D94): the break-it extras on a completed quest with authored
            traffic — per-dial collection state + the expert payout. S7's resilience conditions will
            extend this same section. */}
        {node.status === "completed" && ((c.trafficSources?.length ?? 0) > 0 || (c.resilienceConditions?.length ?? 0) > 0) && (
          <div data-testid="quest-extra-challenges" className="rounded border border-orange-500/30 bg-orange-500/5 p-2.5">
            <div className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-orange-400">
              <Hammer className="h-3 w-3" /> Extra challenges
            </div>
            {(c.trafficSources?.length ?? 0) > 0 && (<>
            <p className="mt-1 text-[0.625rem] leading-snug text-[#d0c8b8]/80">
              Replay, hold 3★, then break your own build — ONE traffic dial at a time. Each dial that
              fells it pays <span className="font-semibold text-orange-300">1 Expert</span>.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {BREAK_ATTRIBUTES.map((a) => {
                const collected = !!breaksRecord?.[a]
                return (
                  <span key={a} data-testid={`extra-break-${a}`} data-collected={collected || undefined}
                    className={`rounded-full border px-2 py-0.5 text-[0.5625rem] font-medium ${
                      collected
                        ? "border-orange-500/60 bg-orange-500/20 text-orange-200"
                        : "border-[#3a4050] text-[#6b7280]"
                    }`}>
                    {BREAK_ATTRIBUTE_LABELS[a]}{collected ? " ✓" : ""}
                  </span>
                )
              })}
            </div>
            </>)}
            {/* P4-S7: curated resilience extras — survive the condition AT 3★ (+1 expert each). */}
            {(c.resilienceConditions?.length ?? 0) > 0 && (<>
            <p className="mt-1.5 flex items-center gap-1 text-[0.625rem] leading-snug text-[#d0c8b8]/80">
              <ShieldCheck className="h-3 w-3 shrink-0 text-violet-300" />
              Or harden it: re-earn 3★ with a build that survives the Test condition.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(c.resilienceConditions ?? []).map((id) => {
                const cleared = !!clearsRecord?.[id]
                return (
                  <span key={id} data-testid={`extra-resilience-${id}`} data-cleared={cleared || undefined}
                    className={`rounded-full border px-2 py-0.5 text-[0.5625rem] font-medium ${
                      cleared
                        ? "border-violet-500/60 bg-violet-500/20 text-violet-200"
                        : "border-[#3a4050] text-[#6b7280]"
                    }`}>
                    {getFailurePreset(id)?.name ?? id}{cleared ? " ✓" : ""}
                  </span>
                )
              })}
            </div>
            </>)}
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
  const breaksByChallenge = useUserProgressStore((s) => s.breaksByChallenge)
  const resilienceClears = useUserProgressStore((s) => s.resilienceClears)
  const expertCurrency = useUserProgressStore((s) => s.expertCurrency)
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
      useSimulationStore.getState().reset()
      // Seed the quest canvas: typed traffic nodes (ISAPivot), or the full inherited
      // architecture when the quest authors a brownfield start (P5-S1, D95).
      const seeded = makeChallengeCanvas(c)
      useArchitectureStore.getState().loadArchitecture(seeded.nodes, seeded.edges)
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
          {/* P4-S6 (D94): the expert wallet — wrench + orange, deliberately NOT a star (it never
              feeds the hint pool) — and the discipline color legend that decodes the tree's rings. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
            <span
              data-testid="quest-log-expert-count"
              title="Expert points — earned by breaking your 3★ builds one traffic dial at a time; spent on per-quest required-blocks filters"
              className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-orange-300"
            >
              <Wrench className="h-3 w-3" /> {expertCurrency} Expert
            </span>
            <div data-testid="quest-log-track-legend" className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {Object.entries(TRACK_COLORS).map(([trackId, color]) => (
                <span key={trackId} className="inline-flex items-center gap-1 text-[0.5625rem] text-[#8b9099]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {CHALLENGE_TRACKS.get(trackId)?.name ?? trackId}
                </span>
              ))}
            </div>
          </div>
        </DialogHeader>
        <div className="flex gap-0" style={{ height: "calc(85vh - 80px)" }}>
          {/* Left: quest tree — always visible, fixed position */}
          <div className="flex-1 overflow-auto quest-scroll" style={{ minWidth: 0 }}>
            <div className="flex justify-center py-2">
              <svg width={layout.width * scale} height={layout.height * scale}
                viewBox={`0 0 ${layout.width} ${layout.height}`} className="select-none">
              <TreeDefs />
              <TierSeparators bands={layout.bands} width={layout.width} />
              <TreeEdges positions={layout.positions} />
              {layout.positions.map((pos) => (
                <TreeNode key={pos.node.challenge.id} pos={pos}
                  selected={selectedId === pos.node.challenge.id}
                  bestStars={bestStars[pos.node.challenge.id] ?? 0}
                  breaksCollected={(pos.node.challenge.trafficSources?.length ?? 0) > 0
                    ? Object.keys(breaksByChallenge[pos.node.challenge.id] ?? {}).length
                    : null}
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
                breaksRecord={breaksByChallenge[selectedNode.challenge.id]}
                clearsRecord={resilienceClears[selectedNode.challenge.id]}
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
