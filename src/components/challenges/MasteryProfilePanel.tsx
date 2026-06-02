import { useMemo } from "react"
import { Shield, Star, Lock } from "lucide-react"
import { useUserProgressStore } from "@/stores/userProgressStore"
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
    <div className="h-1.5 w-full rounded-full bg-surface" data-testid="xp-bar">
      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function TrackRow({ trackId, xp, completedCount, totalCount }: { trackId: string; xp: number; completedCount: number; totalCount: number }) {
  const track = CHALLENGE_TRACKS.get(trackId)
  if (!track) return null
  const { rank, name } = rankForXp(xp)
  const toNext = xpToNextRank(xp)
  const threshold = RANK_XP_THRESHOLDS[rank]
  const nextThreshold = rank < MASTERY_RANKS.length - 1 ? RANK_XP_THRESHOLDS[rank + 1] : threshold
  const trackAvatar = getTrackAvatar(trackId)
  const isUnlocked = completedCount > 0

  return (
    <div data-testid={`track-row-${trackId}`} className="flex items-center gap-2 rounded-md border border-archie-border bg-surface p-2">
      <div className="relative h-8 w-8 shrink-0">
        {trackAvatar ? (
          <img
            src={trackAvatar}
            alt={track.name}
            className={`h-8 w-8 rounded ${isUnlocked ? "" : "grayscale opacity-40"}`}
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className={`flex h-8 w-8 items-center justify-center rounded bg-surface text-text-secondary ${isUnlocked ? "" : "opacity-40"}`}>
            <Shield className="h-4 w-4" />
          </div>
        )}
        {!isUnlocked && <Lock className="absolute -right-1 -bottom-1 h-3 w-3 text-text-secondary" />}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary">{track.name}</span>
          <span className="text-[0.5625rem] text-text-secondary">{name}</span>
        </div>
        <XpBar current={xp} threshold={threshold} next={nextThreshold} />
        <div className="flex items-center justify-between">
          <span className="text-[0.5rem] text-text-secondary">
            {xp} XP{toNext > 0 ? ` · ${toNext} to ${MASTERY_RANKS[rank + 1]}` : " · Max"}
          </span>
          <span className="text-[0.5rem] text-text-secondary">
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

  const challenges = getAllChallenges()
  const tree = useMemo(() => resolveTechTree(challenges, completedChallenges), [challenges, completedChallenges])

  const totalXp = Object.values(trackXp).reduce((sum, v) => sum + v, 0)
  const overallRank = rankForXp(totalXp)
  const avatar = getMasteryAvatar(overallRank.rank)

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mastery-profile" className="max-w-md">
        <DialogHeader className="flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <DialogTitle>Mastery Profile</DialogTitle>
            <DialogDescription>Your progression across all tracks.</DialogDescription>
            <div className="mt-1 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-400" />
              <span data-testid="overall-rank" className="text-sm font-bold text-text-primary">{overallRank.name}</span>
              <span className="text-xs text-text-secondary">
                · {totalXp} XP · {completedChallenges.length} cleared · {tree.unlockedBlocks.size} blocks
              </span>
            </div>
          </div>
          {avatar ? (
            <img
              src={avatar}
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

        <div className="flex flex-col gap-2">
          {CHALLENGE_TRACK_IDS.map((id) => (
            <TrackRow
              key={id}
              trackId={id}
              xp={trackXp[id] ?? 0}
              completedCount={trackStats[id]?.completed ?? 0}
              totalCount={trackStats[id]?.total ?? 0}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
