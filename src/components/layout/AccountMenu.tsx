import { useState, useMemo } from "react"
import { CircleUser, LogOut, Trophy } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { rankForXp } from "@/lib/challengeTracks"
import { getMasteryAvatar, getTrackAvatar, getDisciplineAvatars } from "@/lib/masteryAvatars"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MasteryProfilePanel } from "@/components/challenges/MasteryProfilePanel"

export function AccountMenu() {
  const { user, signOut } = useAuth()
  // D105b follow-up: the public identity is the NICKNAME — the Google name stays private
  // (it only appears as the dropdown's sublabel so you know which account is signed in).
  const nickname = useUserProgressStore((s) => s.nickname)
  const name = nickname ?? user?.displayName ?? null
  const [profileOpen, setProfileOpen] = useState(false)
  const trackXp = useUserProgressStore((s) => s.trackXp)
  const equippedAvatar = useUserProgressStore((s) => s.equippedAvatar)
  const totalXp = Object.values(trackXp).reduce((sum, v) => sum + v, 0)
  const avatar = useMemo(() => {
    if (equippedAvatar?.startsWith("rank:")) return getMasteryAvatar(parseInt(equippedAvatar.slice(5), 10))
    if (equippedAvatar?.startsWith("discipline:")) {
      const parts = equippedAvatar.slice(11).split(":")
      return getDisciplineAvatars(parts[0]).find((a) => a.level === parseInt(parts[1], 10))?.src ?? getTrackAvatar(parts[0])
    }
    if (equippedAvatar?.startsWith("track:")) return getTrackAvatar(equippedAvatar.slice(6))
    return getMasteryAvatar(rankForXp(totalXp).rank)
  }, [equippedAvatar, totalXp])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="account-menu-trigger"
            aria-label="Account"
            title={name ?? "Account"}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-secondary hover:text-text-primary"
          >
            {avatar ? (
              <img src={avatar} alt="Profile" className="h-5 w-5 rounded-full" style={{ imageRendering: "pixelated" }} />
            ) : (
              <CircleUser className="h-4 w-4" />
            )}
            {name && <span className="max-w-[140px] truncate">{name}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid="account-menu-content">
          {name && (
            <DropdownMenuLabel className="max-w-[200px]">
              <span className="block truncate">{name}</span>
              {nickname && user?.displayName && (
                <span className="block truncate text-[0.625rem] font-normal text-text-secondary">{user.displayName}</span>
              )}
            </DropdownMenuLabel>
          )}
          {name && <DropdownMenuSeparator />}
          <DropdownMenuItem data-testid="account-mastery-profile" onSelect={() => setProfileOpen(true)}>
            <Trophy className="mr-2 h-3.5 w-3.5" /> Quest Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="account-sign-out" onSelect={() => signOut()}>
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MasteryProfilePanel open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  )
}
