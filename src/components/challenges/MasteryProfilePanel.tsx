import { useMemo } from "react"
import { Shield, Lock } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { getAllChallenges } from "@/services/challengeLoader"
import { resolveTechTree } from "@/engine/techTree"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import {
  CHALLENGE_TRACKS, CHALLENGE_TRACK_IDS, MASTERY_RANKS, RANK_XP_THRESHOLDS,
  rankForXp, xpToNextRank, MAX_LEVEL,
} from "@/lib/challengeTracks"
import { getMasteryAvatar, getTrackAvatar, getDisciplineAvatars } from "@/lib/masteryAvatars"
import { ALL_EQUIPMENT_SLOTS, getBlockColor } from "@/lib/equipmentSlots"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

interface Props { open: boolean; onOpenChange: (open: boolean) => void }

const TRACK_COLORS: Record<string, string> = {
  foundations: "#3b82f6", data: "#22c55e", edge: "#06b6d4", realtime: "#ec4899",
  reliability: "#eab308", security: "#ef4444", aiml: "#a855f7",
}

function EquipmentSlotBox({ typeId, unlocked }: { typeId: string; unlocked: boolean }) {
  const typeMeta = COMPONENT_TYPES.get(typeId)
  const color = getBlockColor(typeId)
  const label = typeMeta?.label ?? typeId
  const abbr = label.slice(0, 3).toUpperCase()

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-md border-2 transition-all ${
        unlocked ? "bg-[#1a1a1a]" : "bg-[#0a0c10] opacity-30"
      }`}
      style={{ borderColor: unlocked ? color : `${color}30` }}
      title={unlocked ? `${label} (equipped)` : `${label} (locked)`}
    >
      {unlocked ? (
        <span className="text-[0.5rem] font-bold" style={{ color }}>{abbr}</span>
      ) : (
        <Lock className="h-3 w-3" style={{ color: `${color}40` }} />
      )}
    </div>
  )
}

function DisciplineRow({ trackId, xp, completedCount, totalCount, equippedAvatar, onEquip }: {
  trackId: string; xp: number; completedCount: number; totalCount: number
  equippedAvatar: string | null; onEquip: (key: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const track = CHALLENGE_TRACKS.get(trackId)
  if (!track) return null
  const color = TRACK_COLORS[trackId] ?? "#6b7280"
  const disciplineAvatars = getDisciplineAvatars(trackId)
  const highestUnlocked = [...disciplineAvatars].reverse().find((a) => completedCount >= a.level)
  const displaySrc = highestUnlocked?.src ?? null
  const anyUnlocked = !!highestUnlocked

  return (
    <div className="rounded-md border border-[#1e2530] p-2" style={{ backgroundColor: `${color}06` }}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => disciplineAvatars.length > 0 && setPickerOpen((v) => !v)}
          className={`relative shrink-0 rounded border-2 p-0.5 transition-all ${anyUnlocked ? "border-transparent hover:border-[#c9a961]/40" : "border-transparent"}`}
          title={anyUnlocked ? "Click to see discipline avatars" : `Unlocks at ${disciplineAvatars[0]?.level ?? "?"} quests`}>
          {displaySrc ? (
            <img src={displaySrc} alt={track.name} className="h-8 w-8 rounded" style={{ imageRendering: "pixelated" }} />
          ) : disciplineAvatars.length > 0 ? (
            <div className="relative">
              <img src={disciplineAvatars[0].src} alt={track.name} className="h-8 w-8 rounded grayscale brightness-[0.3]" style={{ imageRendering: "pixelated" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-3 w-3 text-[#6b7280]" />
              </div>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1a1a1a]"><Shield className="h-4 w-4 text-[#4b5563]" /></div>
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] font-semibold" style={{ color }}>{track.name}</span>
            <span className="text-[0.5625rem] text-[#6b7280]">{completedCount}/{totalCount}</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[#1a1a2e]">
            <div className="h-full rounded-full transition-all" style={{ backgroundColor: color, width: `${Math.min(100, xp > 0 ? 10 + (xp / 2000) * 90 : 0)}%` }} />
          </div>
          <span className="text-[0.5rem] text-[#4b5563]">{xp} XP</span>
        </div>
      </div>

      {pickerOpen && disciplineAvatars.length > 0 && (
        <div className="mt-2 flex gap-1 rounded-md border border-[#1e2530] bg-[#0a0c10] p-1.5">
          {disciplineAvatars.map((a) => {
            const unlocked = completedCount >= a.level
            const key = `discipline:${trackId}:${a.level}`
            const isThis = equippedAvatar === key
            return (
              <button key={a.level} type="button" onClick={() => { if (unlocked) { onEquip(key); setPickerOpen(false) } }}
                disabled={!unlocked}
                className={`relative rounded border-2 p-0.5 ${isThis ? "border-[#c9a961]" : unlocked ? "border-transparent hover:border-[#c9a961]/40" : "border-transparent"}`}
                title={unlocked ? `Tier ${a.level} avatar` : `Unlocks at ${a.level} quests completed`}>
                <img src={a.src} alt={`Tier ${a.level}`} className={`h-7 w-7 rounded ${unlocked ? "" : "grayscale brightness-[0.3]"}`} style={{ imageRendering: "pixelated" }} />
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-3 w-3 text-[#6b7280]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RankAvatarPicker({ currentRank, equippedAvatar, onEquip }: {
  currentRank: number; equippedAvatar: string | null; onEquip: (key: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const currentSrc = getMasteryAvatar(currentRank)

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setPickerOpen((v) => !v)}
        className="rounded border-2 border-transparent p-0.5 transition-all hover:border-[#c9a961]/40"
        title="Click to change rank avatar">
        {currentSrc ? (
          <img src={currentSrc} alt="Rank" className="h-10 w-10 rounded" style={{ imageRendering: "pixelated" }} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1a1a1a]"><Shield className="h-5 w-5 text-[#4b5563]" /></div>
        )}
      </button>
      {pickerOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-md border border-[#1e2530] bg-[#0a0c10] p-1.5">
          {MASTERY_RANKS.slice(0, 6).map((name, i) => {
            const rankLevel = i * 2
            const unlocked = currentRank >= rankLevel
            const key = `rank:${rankLevel}`
            const isThis = equippedAvatar === key
            const src = getMasteryAvatar(rankLevel)
            return (
              <button key={i} type="button" disabled={!unlocked}
                onClick={() => { if (unlocked) { onEquip(key); setPickerOpen(false) } }}
                className={`relative rounded border-2 p-0.5 ${isThis ? "border-[#c9a961]" : unlocked ? "border-transparent hover:border-[#c9a961]/40" : "border-transparent"}`}
                title={unlocked ? `${name} (rank ${rankLevel})` : `Unlocks at rank ${rankLevel}`}>
                {src ? (
                  <img src={src} alt={name} className={`h-8 w-8 rounded ${unlocked ? "" : "grayscale brightness-[0.3]"}`} style={{ imageRendering: "pixelated" }} />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1a1a1a]"><Shield className="h-4 w-4 text-[#4b5563]" /></div>
                )}
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-3.5 w-3.5 text-[#6b7280]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MasteryProfilePanel({ open, onOpenChange }: Props) {
  const trackXp = useUserProgressStore((s) => s.trackXp)
  const completedChallenges = useUserProgressStore((s) => s.completedChallenges)
  const equippedAvatar = useUserProgressStore((s) => s.equippedAvatar)
  const equipAvatar = useUserProgressStore((s) => s.equipAvatar)
  const userId = useCurrentUserId()

  const totalXp = Object.values(trackXp).reduce((sum, v) => sum + v, 0)
  const overallRank = rankForXp(totalXp)
  const toNext = xpToNextRank(totalXp)
  const challenges = getAllChallenges()
  const tree = useMemo(() => resolveTechTree(challenges, completedChallenges, undefined, totalXp), [challenges, completedChallenges, totalXp])

  const avatar = useMemo(() => {
    if (equippedAvatar?.startsWith("rank:")) return getMasteryAvatar(parseInt(equippedAvatar.slice(5), 10))
    if (equippedAvatar?.startsWith("discipline:")) {
      const parts = equippedAvatar.slice(11).split(":")
      const trackId = parts[0], level = parseInt(parts[1], 10)
      const avatars = getDisciplineAvatars(trackId)
      return avatars.find((a) => a.level === level)?.src ?? getTrackAvatar(trackId)
    }
    if (equippedAvatar?.startsWith("track:")) return getTrackAvatar(equippedAvatar.slice(6))
    return getMasteryAvatar(overallRank.rank)
  }, [equippedAvatar, overallRank.rank])

  const trackStats = useMemo(() => {
    const stats: Record<string, { completed: number; total: number }> = {}
    for (const id of CHALLENGE_TRACK_IDS) stats[id] = { completed: 0, total: 0 }
    for (const n of tree.ordered) {
      const t = n.challenge.track
      if (t && stats[t]) { stats[t].total++; if (n.status === "completed") stats[t].completed++ }
    }
    return stats
  }, [tree])

  const leftSlots = ALL_EQUIPMENT_SLOTS.filter((s) => s.position === "left")
  const rightSlots = ALL_EQUIPMENT_SLOTS.filter((s) => s.position === "right")

  const handleEquip = (key: string) => {
    if (userId) { void equipAvatar(userId, key); toast.success("Avatar equipped!") }
  }

  const threshold = RANK_XP_THRESHOLDS[overallRank.rank]
  const nextThreshold = overallRank.rank < MAX_LEVEL ? RANK_XP_THRESHOLDS[overallRank.rank + 1] : threshold
  const xpPct = nextThreshold > threshold ? Math.min(100, ((totalXp - threshold) / (nextThreshold - threshold)) * 100) : 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mastery-profile" className="max-w-2xl! bg-[#0a0c10]">
        <DialogHeader>
          <DialogTitle className="text-[#f5deb3]">Quest Profile</DialogTitle>
          <DialogDescription className="text-[#6b7280]">Your character, equipment, and progression.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Left: character + equipment */}
          <div className="flex flex-col items-center gap-2">
            {/* Character avatar */}
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt={overallRank.name} className="h-24 w-24 rounded-lg border-2 border-[#c9a961]"
                  style={{ imageRendering: "pixelated" }} />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-[#4b5563] bg-[#1a1a1a]">
                  <Shield className="h-12 w-12 text-[#4b5563]" />
                </div>
              )}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#c9a961] px-2 py-0.5 text-[0.5rem] font-bold text-[#1a1410]">
                Lv. {overallRank.rank}
              </div>
            </div>
            <span className="text-sm font-bold text-[#f5deb3]">{overallRank.name}</span>

            {/* Equipment grid: left column | character | right column */}
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1">
                {leftSlots.sort((a, b) => a.row - b.row).map((s) => (
                  <EquipmentSlotBox key={s.typeId} typeId={s.typeId} unlocked={tree.unlockedBlocks.has(s.typeId)} />
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {rightSlots.sort((a, b) => a.row - b.row).map((s) => (
                  <EquipmentSlotBox key={s.typeId} typeId={s.typeId} unlocked={tree.unlockedBlocks.has(s.typeId)} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: stats + tracks */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto quest-scroll" style={{ maxHeight: "70vh" }}>
            {/* XP bar with rank avatar picker */}
            <div className="flex items-start gap-2">
              <RankAvatarPicker currentRank={overallRank.rank} equippedAvatar={equippedAvatar} onEquip={handleEquip} />
              <div className="flex-1">
                <div className="flex items-center justify-between text-[0.75rem]">
                  <span className="font-semibold text-[#f5deb3]">{totalXp} XP</span>
                  <span className="text-[#6b7280]">
                    {toNext > 0 ? `${toNext} to ${MASTERY_RANKS[overallRank.rank + 1]}` : "Max Level"}
                  </span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#1a1a2e]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#c9a961] to-[#ffd700] transition-all"
                    style={{ width: `${xpPct}%` }} />
                </div>
                <div className="mt-0.5 text-[0.5625rem] text-[#6b7280]">
                  {completedChallenges.length} quests completed · {tree.unlockedBlocks.size} blocks unlocked
                </div>
              </div>
            </div>

            {/* Track progression — colored bars with clickable discipline avatars */}
            <div className="flex flex-col gap-2">
              <span className="text-[0.625rem] font-semibold text-[#6b7280]">Disciplines</span>
              {CHALLENGE_TRACK_IDS.map((id) => (
                <DisciplineRow key={id} trackId={id} xp={trackXp[id] ?? 0}
                  completedCount={trackStats[id]?.completed ?? 0} totalCount={trackStats[id]?.total ?? 0}
                  equippedAvatar={equippedAvatar} onEquip={handleEquip} />
              ))}
            </div>

            {/* Placeholder: Blueprints & Stacks unlocks */}
            <div className="rounded-md border border-dashed border-[#2a3040] p-3 text-center">
              <span className="text-[0.625rem] text-[#4b5563]">Blueprints & Stacks unlocks — coming in Season 2</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
