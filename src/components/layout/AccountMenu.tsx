import { useState } from "react"
import { CircleUser, LogOut, Trophy } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
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
  const name = user?.displayName ?? null
  const [profileOpen, setProfileOpen] = useState(false)

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
            <CircleUser className="h-4 w-4" />
            {name && <span className="max-w-[140px] truncate">{name}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid="account-menu-content">
          {name && <DropdownMenuLabel className="max-w-[200px] truncate">{name}</DropdownMenuLabel>}
          {name && <DropdownMenuSeparator />}
          <DropdownMenuItem data-testid="account-mastery-profile" onSelect={() => setProfileOpen(true)}>
            <Trophy className="mr-2 h-3.5 w-3.5" /> Mastery Profile
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
