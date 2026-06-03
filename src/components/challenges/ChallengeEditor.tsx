import { useState, useMemo, useCallback } from "react"
import { Save, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CHALLENGE_TRACK_IDS, CHALLENGE_TRACKS, MIN_CHALLENGE_TIER, MAX_CHALLENGE_TIER } from "@/lib/challengeTracks"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import { useUserChallengeStore, namespaceUserId, stripUserPrefix } from "@/stores/userChallengeStore"
import { exportChallenge } from "@/services/challengeExporter"
import { BLOB_REVOKE_DELAY_MS } from "@/components/import-export/ExportButton"
import type { Challenge, ChallengeDifficulty } from "@/lib/challengeTypes"

const DIFFICULTIES: ChallengeDifficulty[] = ["beginner", "intermediate", "advanced"]
const BLOCK_IDS = [...COMPONENT_TYPES.keys()]
interface ChallengeEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingChallenge?: Challenge | null
}

function emptyDraft(): Omit<Challenge, "origin"> {
  return {
    id: "",
    title: "",
    brief: "",
    difficulty: "beginner",
    budgetCap: 100,
    durationSeconds: 60,
    trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 500 }],
    requiredComponents: [],
    minXp: 0,
    requiredTypes: [],
    targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 },
    scheduledEvents: [],
    hints: [],
    schemaVersion: 2,
    track: "foundations",
    tier: 1,
    requires: [],
    unlocks: [],
    availableBlocks: ["traffic-source", "compute"],
    grants: [],
    rewards: { xp: 100 },
  }
}

function BlockPicker({ selected, onChange, label }: { selected: string[]; onChange: (v: string[]) => void; label: string }) {
  const toggle = useCallback((id: string) => {
    onChange(selected.includes(id) ? selected.filter((b) => b !== id) : [...selected, id])
  }, [selected, onChange])

  return (
    <div>
      <label className="text-[0.625rem] font-medium text-text-secondary">{label}</label>
      <div className="mt-1 flex flex-wrap gap-1">
        {BLOCK_IDS.map((id) => {
          const type = COMPONENT_TYPES.get(id)
          const active = selected.includes(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`rounded-full px-2 py-0.5 text-[0.5625rem] transition-colors ${
                active ? "bg-blue-500/30 text-blue-300" : "bg-surface text-text-secondary hover:bg-surface/80"
              }`}
            >
              {type?.label ?? id}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ChallengeEditor({ open, onOpenChange, editingChallenge }: ChallengeEditorProps) {
  const addChallenge = useUserChallengeStore((s) => s.addChallenge)
  const updateChallenge = useUserChallengeStore((s) => s.updateChallenge)
  const userChallenges = useUserChallengeStore((s) => s.challenges)

  // True only when editing a genuine, already-saved USER challenge. A clone of a built-in (or any
  // not-yet-saved "-copy") is a "Create from Template" — it generates a new id and origin "user".
  const isEditing = useMemo(() => {
    if (!editingChallenge || editingChallenge.origin !== "user") return false
    const nsId = namespaceUserId(editingChallenge.id)
    return userChallenges.some((c) => c.id === nsId)
  }, [editingChallenge, userChallenges])

  const [draft, setDraft] = useState<Omit<Challenge, "origin">>(() =>
    editingChallenge ? { ...editingChallenge, id: stripUserPrefix(editingChallenge.id) } : emptyDraft(),
  )

  const updateField = useCallback(<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  // A clone-from-template: an editingChallenge is provided but it is NOT a saved user challenge.
  const isTemplate = !!editingChallenge && !isEditing
  const editorTitle = isEditing ? "Edit Challenge" : isTemplate ? "Create from Template" : "Create Challenge"

  const isValid = useMemo(() => {
    return draft.id.trim().length > 0 && draft.title.trim().length > 0 && draft.brief.trim().length > 0
      && draft.availableBlocks.length > 0 && draft.track !== undefined
  }, [draft])

  const handleSave = useCallback(() => {
    if (!isValid) return
    const challenge: Challenge = { ...draft, origin: "user" }
    if (isEditing) {
      updateChallenge({ ...challenge, id: namespaceUserId(challenge.id) })
    } else {
      addChallenge(challenge)
    }
    toast.success(isEditing ? "Challenge updated" : "Challenge saved")
    onOpenChange(false)
  }, [draft, isValid, isEditing, addChallenge, updateChallenge, onOpenChange])

  const handleExport = useCallback(() => {
    try {
      const challenge: Challenge = { ...draft, origin: "user" }
      const yaml = exportChallenge(challenge)
      const blob = new Blob([yaml], { type: "application/x-yaml" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `challenge-${draft.id || "draft"}.yaml`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS)
      toast.success("Challenge exported as YAML")
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Unknown error" })
    }
  }, [draft])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="challenge-editor" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editorTitle}</DialogTitle>
          <DialogDescription>All fields are scoped to valid options. User challenges do not grant progression.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-3 pr-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">ID (slug)</label>
                <Input data-testid="editor-id" value={draft.id} onChange={(e) => updateField("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="my-challenge" className="mt-0.5 h-7 text-xs" />
              </div>
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">Title</label>
                <Input data-testid="editor-title" value={draft.title} onChange={(e) => updateField("title", e.target.value.slice(0, 100))} placeholder="Challenge Title" className="mt-0.5 h-7 text-xs" />
              </div>
            </div>

            <div>
              <label className="text-[0.625rem] font-medium text-text-secondary">Brief</label>
              <textarea
                data-testid="editor-brief"
                value={draft.brief}
                onChange={(e) => updateField("brief", e.target.value.slice(0, 600))}
                placeholder="Describe the challenge objective..."
                className="mt-0.5 w-full rounded-md border border-archie-border bg-surface px-2 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">Difficulty</label>
                <Select value={draft.difficulty} onValueChange={(v) => updateField("difficulty", v as ChallengeDifficulty)}>
                  <SelectTrigger data-testid="editor-difficulty" className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">Track</label>
                <Select value={draft.track ?? "foundations"} onValueChange={(v) => updateField("track", v)}>
                  <SelectTrigger data-testid="editor-track" className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_TRACK_IDS.map((id) => <SelectItem key={id} value={id}>{CHALLENGE_TRACKS.get(id)?.name ?? id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">Tier</label>
                <Select value={String(draft.tier ?? 1)} onValueChange={(v) => updateField("tier", Number(v))}>
                  <SelectTrigger data-testid="editor-tier" className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_CHALLENGE_TIER - MIN_CHALLENGE_TIER + 1 }, (_, i) => i + MIN_CHALLENGE_TIER).map((t) => (
                      <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">Budget cap ($)</label>
                <Input data-testid="editor-budget" type="number" min={0} max={100000} value={draft.budgetCap} onChange={(e) => updateField("budgetCap", Math.max(0, Math.min(100000, Number(e.target.value))))} className="mt-0.5 h-7 text-xs" />
              </div>
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">Duration (s)</label>
                <Input data-testid="editor-duration" type="number" min={10} max={3600} value={draft.durationSeconds} onChange={(e) => updateField("durationSeconds", Math.max(10, Math.min(3600, Number(e.target.value))))} className="mt-0.5 h-7 text-xs" />
              </div>
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">XP reward</label>
                <Input data-testid="editor-xp" type="number" min={0} max={1000} value={draft.rewards?.xp ?? 0} onChange={(e) => updateField("rewards", { xp: Math.max(0, Math.min(1000, Number(e.target.value))) })} className="mt-0.5 h-7 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">Uptime target (%)</label>
                <Input data-testid="editor-uptime" type="number" min={0} max={100} step={0.1} value={draft.targetMetrics.uptimePercent} onChange={(e) => updateField("targetMetrics", { ...draft.targetMetrics, uptimePercent: Math.max(0, Math.min(100, Number(e.target.value))) })} className="mt-0.5 h-7 text-xs" />
              </div>
              <div>
                <label className="text-[0.625rem] font-medium text-text-secondary">p99 latency target (ms)</label>
                <Input data-testid="editor-latency" type="number" min={0} max={60000} value={draft.targetMetrics.p99LatencyMs} onChange={(e) => updateField("targetMetrics", { ...draft.targetMetrics, p99LatencyMs: Math.max(0, Math.min(60000, Number(e.target.value))) })} className="mt-0.5 h-7 text-xs" />
              </div>
            </div>

            <BlockPicker selected={draft.availableBlocks} onChange={(v) => updateField("availableBlocks", v)} label="Available blocks (palette for this challenge)" />
          </div>
        </ScrollArea>

        <DialogFooter className="gap-1">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!isValid} className="gap-1">
            <Download className="h-3 w-3" /> Export YAML
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isValid} data-testid="editor-save" className="gap-1">
            <Save className="h-3 w-3" /> {isEditing ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
