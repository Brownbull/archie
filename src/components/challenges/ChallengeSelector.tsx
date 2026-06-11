import { useMemo, useState, useRef } from "react"
import { Trophy, Star, Lock, LogIn, Plus, Upload, Pencil, Trash2, PlayCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getAllChallenges } from "@/services/challengeLoader"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { makeChallengeCanvas } from "@/services/challengeCanvasSeed"
import { useUiStore } from "@/stores/uiStore"
import { resolveTechTree } from "@/engine/techTree"
import { rankForXp, relativeLevelForTier, RELATIVE_LEVEL_COLORS, CHALLENGE_TRACKS, type RelativeLevel } from "@/lib/challengeTracks"
import { useUserChallengeStore } from "@/stores/userChallengeStore"
import { importChallengeFile } from "@/services/challengeFileImport"
import { ChallengeEditor } from "@/components/challenges/ChallengeEditor"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const LEVEL_LABEL: Record<RelativeLevel, string> = {
  trivial: "Trivial",
  easy: "Easy",
  "on-level": "On Level",
  tough: "Tough",
  hard: "Hard",
  locked: "Locked",
}

function StarRow({ earned }: { earned: number }) {
  return (
    <div className="flex gap-0.5" data-testid="challenge-best-stars" aria-label={`${earned} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} className={`h-3 w-3 ${n <= earned ? "fill-yellow-400 text-yellow-400" : "text-text-secondary"}`} />
      ))}
    </div>
  )
}

function LevelBadge({ level }: { level: RelativeLevel }) {
  const color = RELATIVE_LEVEL_COLORS[level]
  return (
    <span
      data-testid="challenge-level-badge"
      className="rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {LEVEL_LABEL[level]}
    </span>
  )
}

export function ChallengeSelector({ hideTrigger = false }: { hideTrigger?: boolean } = {}) {
  const open = useUiStore((s) => s.challengesOpen)
  const setOpen = useUiStore((s) => s.setChallengesOpen)
  const challenges = getAllChallenges()
  const bestStars = useChallengeStore((s) => s.bestStars)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  const [pending, setPending] = useState<Challenge | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  // Bumped on every openEditor() so ChallengeEditor is keyed per session and REMOUNTS — its
  // draft useState initializer reads the current editingChallenge fresh each time. Without this,
  // the always-mounted editor keeps the draft from its first mount (empty), so clones/edits never
  // pre-fill the form.
  const [editorSession, setEditorSession] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const userId = useCurrentUserId()
  const userChallenges = useUserChallengeStore((s) => s.challenges)
  const addUserChallenge = useUserChallengeStore((s) => s.addChallenge)
  const removeUserChallenge = useUserChallengeStore((s) => s.removeChallenge)
  const completedChallenges = useUserProgressStore((s) => s.completedChallenges)
  const trackXp = useUserProgressStore((s) => s.trackXp)

  const totalXp = useMemo(() => Object.values(trackXp).reduce((s, v) => s + v, 0), [trackXp])
  const tree = useMemo(
    () => resolveTechTree(challenges, completedChallenges, undefined, totalXp),
    [challenges, completedChallenges, totalXp],
  )

  const startChallenge = (c: Challenge) => {
    try {
      useSimulationStore.getState().reset()
      // Seed the quest canvas: typed traffic nodes (ISAPivot), or the full inherited
      // architecture when the quest authors a brownfield start (P5-S1, D95).
      const seeded = makeChallengeCanvas(c)
      useArchitectureStore.getState().loadArchitecture(seeded.nodes, seeded.edges)
    } catch {
      // ignore
    }
    usePreferencesStore.getState().setExperienceLevel(c.difficulty)
    selectChallenge(c)
    setOpen(false)
    setPending(null)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!file) return
    const result = await importChallengeFile(file)
    if (!result.ok) {
      toast.error("Import failed", { description: result.error })
      return
    }
    addUserChallenge(result.challenge)
    toast.success(`Imported "${result.challenge.title}"`)
  }

  const openEditor = (challenge?: Challenge) => {
    setEditingChallenge(challenge ?? null)
    setEditorSession((n) => n + 1)
    setEditorOpen(true)
  }

  // Clone a challenge into the editor as a fresh USER draft: new id (`-copy` suffix), origin "user".
  // A built-in clone becomes a user challenge so it never grants XP or affects unlocks (D45).
  const cloneChallenge = (c: Challenge) => {
    const copy: Challenge = { ...c, id: `${c.id}-copy`, origin: "user" }
    openEditor(copy)
  }

  const onPick = (c: Challenge, node: TechTreeNode | undefined) => {
    if (!userId) return
    if (node?.status === "locked") return
    cloneChallenge(c)
  }

  // Play starts the challenge for real — clears the canvas (after confirm if work is in progress).
  const onPlay = (c: Challenge) => {
    if (!userId) return
    if (useArchitectureStore.getState().nodes.length > 0) {
      setOpen(false)
      setPending(c)
      return
    }
    startChallenge(c)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button data-testid="open-challenges" variant="ghost" size="sm" className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            Challenges
          </Button>
        </DialogTrigger>
      )}
      <DialogContent data-testid="challenge-selector" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Architecture Challenges</DialogTitle>
          <DialogDescription>Build to the brief, run the simulation, and earn up to 3 stars.</DialogDescription>
        </DialogHeader>

        {!userId ? (
          <div data-testid="challenge-login-required" className="flex flex-col items-center gap-3 py-8 text-center">
            <LogIn className="h-8 w-8 text-text-secondary" />
            <p className="text-sm text-text-secondary">Sign in to access Challenge Mode.</p>
            <p className="text-xs text-text-secondary">Your progress is saved to your account.</p>
          </div>
        ) : challenges.length === 0 ? (
          <p data-testid="challenge-empty" className="py-6 text-center text-sm text-text-secondary">
            No challenges available yet.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {tree.ordered.map((node) => {
              const c = node.challenge
              const isLocked = node.status === "locked"
              const playerRank = c.track ? rankForXp(trackXp[c.track] ?? 0).rank : 0
              const level = c.tier ? relativeLevelForTier(playerRank, c.tier) : "on-level"
              const trackMeta = c.track ? CHALLENGE_TRACKS.get(c.track) : undefined

              return (
                <div
                  key={c.id}
                  className={`relative flex flex-col rounded-md border transition-colors ${
                    isLocked
                      ? "border-archie-border/50 bg-surface/50 opacity-60"
                      : "border-archie-border bg-surface hover:border-blue-500/60"
                  }`}
                >
                  <button
                    type="button"
                    data-testid={`challenge-clone-${c.id}`}
                    data-status={node.status}
                    onClick={() => onPick(c, node)}
                    disabled={isLocked}
                    title={isLocked ? undefined : "Clone into the editor"}
                    className={`flex flex-col gap-1.5 p-3 pr-9 text-left ${
                      isLocked ? "cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-semibold text-text-primary">
                        {isLocked && <Lock className="mr-1 inline h-3 w-3 text-text-secondary" />}
                        {c.title}
                      </span>
                      <LevelBadge level={level} />
                    </div>

                    {trackMeta && (
                      <span className="text-[0.5625rem] text-text-secondary">
                        {trackMeta.name} · Tier {c.tier}
                      </span>
                    )}

                    <p className="line-clamp-2 text-[0.6875rem] text-text-secondary">{c.brief}</p>

                    {isLocked && node.missingRequirements.length > 0 && (
                      <p className="text-[0.5625rem] text-amber-400">
                        Requires: {node.missingRequirements.join(", ")}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[0.625rem] text-text-secondary">
                      <span>
                        ${c.budgetCap}/mo · {c.durationSeconds}s
                        {c.rewards?.xp ? ` · ${c.rewards.xp} XP` : ""}
                      </span>
                      <StarRow earned={bestStars[c.id] ?? 0} />
                    </div>
                  </button>

                  {!isLocked && (
                    <button
                      type="button"
                      data-testid={`challenge-play-${c.id}`}
                      title="Play this challenge"
                      aria-label="Play this challenge"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlay(c)
                      }}
                      className="absolute right-2 top-2 rounded p-1 text-text-secondary transition-colors hover:text-blue-400"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {userId && (
          <div className="mt-3 border-t border-archie-border pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-text-primary">Challenge Forge</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-6 gap-1 text-[0.625rem]" onClick={() => openEditor()} data-testid="forge-create">
                  <Plus className="h-3 w-3" /> Create
                </Button>
                <Button variant="outline" size="sm" className="h-6 gap-1 text-[0.625rem]" onClick={() => fileInputRef.current?.click()} data-testid="forge-import">
                  <Upload className="h-3 w-3" /> Import
                </Button>
                <input ref={fileInputRef} type="file" accept=".yaml,.yml" className="hidden" onChange={handleImport} />
              </div>
            </div>
            <p className="mb-2 text-[0.5625rem] text-text-secondary">Your challenges — playable and sharable, but do not grant XP or block unlocks.</p>
            {userChallenges.length > 0 && (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {userChallenges.map((c) => (
                  <div key={c.id} data-testid={`user-challenge-${c.id}`} className="flex items-center justify-between rounded-md border border-archie-border/50 bg-surface/50 p-2">
                    <button type="button" className="flex-1 text-left" onClick={() => startChallenge(c)}>
                      <span className="text-xs font-medium text-text-primary">{c.title}</span>
                      <span className="ml-1.5 text-[0.5rem] text-amber-400">user</span>
                    </button>
                    <div className="flex gap-0.5">
                      <button type="button" className="rounded p-0.5 text-text-secondary hover:text-text-primary" onClick={() => openEditor(c)} aria-label="Edit">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button type="button" className="rounded p-0.5 text-text-secondary hover:text-red-400" onClick={() => removeUserChallenge(c.id)} aria-label="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <ChallengeEditor key={editorSession} open={editorOpen} onOpenChange={setEditorOpen} editingChallenge={editingChallenge} />

      <Dialog open={pending !== null} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent data-testid="challenge-clear-confirm" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start &ldquo;{pending?.title}&rdquo;?</DialogTitle>
            <DialogDescription>
              Starting a challenge clears your current canvas and sets up a fresh diagram with a
              traffic source. Your in-progress work will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              data-testid="challenge-clear-confirm-start"
              onClick={() => pending && startChallenge(pending)}
            >
              Clear &amp; start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
