import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, getDocs, getDoc, getCountFromServer, doc, where } from "firebase/firestore"
import { Trophy, Star, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { db } from "@/lib/firebase"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { resolveAvatarSrc } from "@/lib/masteryAvatars"

interface LeaderboardRow {
  uid: string
  name: string
  avatar: string | null
  threeStarQuests: number
  xp: number
  /** Competition ranking: equal XP shares a rank; next rank skips (1,1,3). */
  rank: number
}

const CACHE_TTL_MS = 60_000
let cachedRows: LeaderboardRow[] | null = null
let cacheStamp = 0

export function __resetLeaderboardCache(): void {
  cachedRows = null
  cacheStamp = 0
}

function assignRanks(rows: LeaderboardRow[]): void {
  let rank = 0
  for (let i = 0; i < rows.length; i++) {
    if (i === 0 || rows[i].xp !== rows[i - 1].xp) rank = i + 1
    rows[i].rank = rank
  }
}

function docToRow(uid: string, data: Record<string, unknown>): LeaderboardRow | null {
  if (data.isTestAccount === true) return null
  const totalXp = (data.totalXp as number) ?? 0
  const trackXp = (data.trackXp as Record<string, number>) ?? {}
  const xp = totalXp > 0
    ? totalXp
    : Object.values(trackXp).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0)
  if (xp <= 0) return null
  const best = (data.bestStarsCloud as Record<string, number>) ?? {}
  const threeStarQuests = Object.values(best).filter((v) => v === 3).length
  return {
    uid,
    name: (data.nickname as string) || (data.displayName as string) || "Anonymous architect",
    avatar: resolveAvatarSrc((data.equippedAvatar as string) ?? null, xp),
    threeStarQuests,
    xp,
    rank: 0,
  }
}

export function LeaderboardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const userId = useCurrentUserId()
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      if (cachedRows && Date.now() - cacheStamp < CACHE_TTL_MS) {
        setRows(cachedRows)
        return
      }

      setRows(null)
      setError(null)
      try {
        const ref = collection(db, "userProgress")
        // Fetch slightly more than 10 to account for test accounts filtered client-side.
        // Single-field index on totalXp (desc) — Firestore creates it automatically.
        const topQuery = query(ref, orderBy("totalXp", "desc"), limit(15))
        const snap = await getDocs(topQuery)
        if (cancelled) return

        const out: LeaderboardRow[] = []
        snap.forEach((d) => {
          const row = docToRow(d.id, d.data())
          if (row) out.push(row)
        })

        out.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        assignRanks(out)

        if (userId && !out.some((r) => r.uid === userId)) {
          const myDoc = await getDoc(doc(db, "userProgress", userId))
          if (!cancelled && myDoc.exists()) {
            const myRow = docToRow(userId, myDoc.data())
            if (myRow) {
              // Count docs with strictly higher XP (aggregation — zero doc reads)
              const aboveQuery = query(ref, where("totalXp", ">", myRow.xp))
              const countSnap = await getCountFromServer(aboveQuery)
              if (!cancelled) {
                myRow.rank = countSnap.data().count + 1
                out.push(myRow)
              }
            }
          }
        }

        if (!cancelled) {
          cachedRows = out
          cacheStamp = Date.now()
          setRows(out)
        }
      } catch {
        if (!cancelled) setError("Couldn't load the leaderboard — try again in a moment.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, userId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="leaderboard-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#c9a961]" /> Leaderboard
          </DialogTitle>
          <DialogDescription>
            Ranked by experience — earned only through play.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {!rows && !error && <p className="text-xs text-text-secondary">Loading…</p>}
        {rows && rows.length === 0 && (
          <p className="text-xs text-text-secondary">No ranked architects yet — clear a quest and claim the top spot.</p>
        )}
        {rows && rows.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-archie-border text-left text-[0.625rem] uppercase tracking-wide text-text-secondary">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Architect</th>
                  <th className="py-1 pr-2 text-right"><span className="inline-flex items-center gap-1" title="The ranking axis — only play grants XP"><Sparkles className="h-3 w-3 text-sky-300" />XP</span></th>
                  <th className="py-1 text-right"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />3★</span></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const top = rows.slice(0, 10)
                  const mine = rows.find((r) => r.uid === userId)
                  const mineOutside = mine && !top.some((r) => r.uid === userId)
                  const renderRow = (r: LeaderboardRow, key: string) => (
                    <tr
                      key={key}
                      data-testid={`leaderboard-row-${key}`}
                      className={`border-b border-archie-border/40 ${r.uid === userId ? "bg-[#c9a961]/10 font-semibold text-[#c9a961]" : "text-text-primary"}`}
                    >
                      <td className="py-1.5 pr-2 tabular-nums">{r.rank}</td>
                      <td className="py-1.5 pr-2">
                        <span className="flex items-center gap-1.5">
                          {r.avatar && <img src={r.avatar} alt="" className="h-4 w-4 rounded-full" style={{ imageRendering: "pixelated" }} />}
                          {r.name}{r.uid === userId ? " (you)" : ""}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.xp.toLocaleString()}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.threeStarQuests}</td>
                    </tr>
                  )
                  return (
                    <>
                      {top.map((r, i) => renderRow(r, String(i + 1)))}
                      {mineOutside && (
                        <>
                          <tr data-testid="leaderboard-ellipsis">
                            <td colSpan={4} className="py-1 text-center text-text-secondary">…</td>
                          </tr>
                          {renderRow(mine, "you")}
                        </>
                      )}
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
