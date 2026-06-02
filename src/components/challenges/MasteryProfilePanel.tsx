import { useMemo } from "react"
import { Shield, Star, Lock, Check } from "lucide-react"
import { toast } from "sonner"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { getAllChallenges } from "@/services/challengeLoader"
import { resolveTechTree } from "@/engine/techTree"
import {
  CHALLENGE_TRACKS,
  CHALLENGE_TRACK_IDS,
  MASTERY_RANKS,
  RANK_XP_THRESHOLDS,
  rankForXp,
  xpToNextRank,
} from "@/lib/challengeTracks"
import { getMasteryAvatar, getTrackAvatar } from "@/lib/masteryAvatars"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface MasteryProfilePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function XpBar({ current, threshold, next }: { current: number; threshold: number; next: number }) {
  const pct = next === 0 ? 100 : Math.min(100, ((current - threshold) / (next - threshold)) * 100)
  return (
    <div className="h-2 w-full rounded-full bg-surface" data-testid="xp-bar">
      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function AvatarOption({
  src,
  label,
  avatarKey,
  isUnlocked,
  isEquipped,
  onEquip,
}: {
  src: string | null
  label: string
  avatarKey: string
  isUnlocked: boolean
  isEquipped: boolean
  onEquip: (key: string) => void
}) {
  return (
    <button
      type="button"
      disabled={!isUnlocked}
      onClick={() => isUnlocked && onEquip(avatarKey)}
      title={isUnlocked ? `Equip ${label}` : `${label} (locked)`}
      className={`relative rounded-lg border-2 p-0.5 transition-all ${
        isEquipped
          ? "border-blue-500 ring-1 ring-blue-500/50"
          : isUnlocked
            ? "border-transparent hover:border-blue-500/40 cursor-pointer"
            : "border-transparent opacity-40 cursor-not-allowed"
      }`}
    >
      {src ? (
        <img src={src} alt={label} className={`h-10 w-10 rounded ${isUnlocked ? "" : "grayscale"}`} style={{ imageRendering: "pixelated" }} />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-surface">
          <Shield className="h-5 w-5 text-text-secondary" />
        </div>
      )}
      {!isUnlocked && <Lock className="absolute -right-1 -bottom-1 h-3 w-3 text-text-secondary" />}
      {isEquipped && <Check className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-blue-500 p-0.5 text-white" />}
    </button>
  )
}

function TrackRow({ trackId, xp, completedCount, totalCount, equippedAvatar, onEquip }: {
  trackId: string; xp: number; completedCount: number; totalCount: number
  equippedAvatar: string | null; onEquip: (key: string) => void
}) {
  const track = CHALLENGE_TRACKS.get(trackId)
  if (!track) return null
  const { rank, name } = rankForXp(xp)
  const toNext = xpToNextRank(xp)
  const threshold = RANK_XP_THRESHOLDS[rank]
  const nextThreshold = rank < MASTERY_RANKS.length - 1 ? RANK_XP_THRESHOLDS[rank + 1] : threshold
  const trackAvatar = getTrackAvatar(trackId)
  const isUnlocked = completedCount > 0
  const avatarKey = `track:${trackId}`

  return (
    <div data-testid={`track-row-${trackId}`} className="flex items-center gap-3 rounded-md border border-archie-border bg-surface p-2.5">
      <AvatarOption
        src={trackAvatar}
        label={track.name}
        avatarKey={avatarKey}
        isUnlocked={isUnlocked}
        isEquipped={equippedAvatar === avatarKey}
        onEquip={onEquip}
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">{track.name}</span>
          <span className="text-xs text-text-secondary">{name}</span>
        </div>
        <XpBar current={xp} threshold={threshold} next={nextThreshold} />
        <div className="flex items-center justify-between">
          <span className="text-[0.625rem] text-text-secondary">
            {xp} XP{toNext > 0 ? ` · ${toNext} to ${MASTERY_RANKS[rank + 1]}` : " · Max"}
          </span>
          <span className="text-[0.625rem] text-text-secondary">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>
    </div>
  )
}

export function MasteryProfilePanel({ open, onOpenChange }: MasteryProfilePanelProps) {
  const trackXp = useUserProgressStore((s) => s.trackXp)
  const completedChallenges = useUserProgressStore((s) => s.completedChallenges)
  const equippedAvatar = useUserProgressStore((s) => s.equippedAvatar)
  const equipAvatar = useUserProgressStore((s) => s.equipAvatar)
  const userId = useCurrentUserId()

  const challenges = getAllChallenges()
  const tree = useMemo(() => resolveTechTree(challenges, completedChallenges), [challenges, completedChallenges])

  const totalXp = Object.values(trackXp).reduce((sum, v) => sum + v, 0)
  const overallRank = rankForXp(totalXp)

  const displayAvatar = useMemo(() => {
    if (equippedAvatar?.startsWith("rank:")) {
      const r = parseInt(equippedAvatar.slice(5), 10)
      return getMasteryAvatar(r)
    }
    if (equippedAvatar?.startsWith("track:")) {
      return getTrackAvatar(equippedAvatar.slice(6))
    }
    return getMasteryAvatar(overallRank.rank)
  }, [equippedAvatar, overallRank.rank])

  const trackStats = useMemo(() => {
    const stats: Record<string, { completed: number; total: number }> = {}
    for (const id of CHALLENGE_TRACK_IDS) stats[id] = { completed: 0, total: 0 }
    for (const node of tree.ordered) {
      const t = node.challenge.track
      if (t && stats[t]) {
        stats[t].total++
        if (node.status === "completed") stats[t].completed++
      }
    }
    return stats
  }, [tree])

  const handleEquip = (avatarKey: string) => {
    if (!userId) return
    void equipAvatar(userId, avatarKey)
    toast.success("Avatar equipped!")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mastery-profile" className="max-w-md">
        <DialogHeader className="flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <DialogTitle>Mastery Profile</DialogTitle>
            <DialogDescription>Click an unlocked avatar to equip it.</DialogDescription>
            <div className="mt-1 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-400" />
              <span data-testid="overall-rank" className="text-sm font-bold text-text-primary">{overallRank.name}</span>
              <span className="text-xs text-text-secondary">
                · {totalXp} XP · {completedChallenges.length} cleared · {tree.unlockedBlocks.size} blocks
              </span>
            </div>
          </div>
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={`Rank: ${overallRank.name}`}
              data-testid="profile-avatar"
              className="h-16 w-16 shrink-0 rounded-lg border border-archie-border"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div data-testid="profile-avatar-placeholder" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-archie-border bg-surface">
              <Shield className="h-8 w-8 text-text-secondary" />
            </div>
          )}
        </DialogHeader>

        <div className="mb-2">
          <span className="text-[0.625rem] font-medium text-text-secondary">Rank avatars</span>
          <div className="mt-1 flex gap-1.5">
            {MASTERY_RANKS.map((name, i) => {
              const isUnlocked = overallRank.rank >= i
              const key = `rank:${i}`
              return (
                <AvatarOption
                  key={key}
                  src={getMasteryAvatar(i)}
                  label={name}
                  avatarKey={key}
                  isUnlocked={isUnlocked}
                  isEquipped={equippedAvatar === key}
                  onEquip={handleEquip}
                />
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {CHALLENGE_TRACK_IDS.map((id) => (
            <TrackRow
              key={id}
              trackId={id}
              xp={trackXp[id] ?? 0}
              completedCount={trackStats[id]?.completed ?? 0}
              totalCount={trackStats[id]?.total ?? 0}
              equippedAvatar={equippedAvatar}
              onEquip={handleEquip}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
