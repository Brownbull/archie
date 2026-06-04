import { useState, useMemo } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUserBlockDefaultsStore } from "@/stores/userBlockDefaultsStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { componentLibrary } from "@/services/componentLibrary"
import { COMPONENT_TYPES } from "@/lib/componentTypes"

interface SaveBlockDefaultButtonProps {
  /** The node's fundamental type (e.g. "relational-db"). */
  typeId: string
  /** The node's current provider component id (data.archieComponentId). */
  providerId: string
  /** The node's current config variant id (data.activeConfigVariantId). */
  variantId: string
}

/**
 * Top-right corner button on a canvas node: "save this provider + tier as my default for this
 * block TYPE". Highlights (amber) when the node's current config differs from the user's saved
 * default (or the system default if none saved). Pressing it confirms, then persists the choice
 * per-user — future blocks of this type start from it (architectureStore.addNode). Non-retroactive.
 */
export function SaveBlockDefaultButton({ typeId, providerId, variantId }: SaveBlockDefaultButtonProps) {
  const userId = useCurrentUserId()
  const saved = useUserBlockDefaultsStore((s) => s.defaults[typeId])
  const saveDefault = useUserBlockDefaultsStore((s) => s.saveDefault)
  const [open, setOpen] = useState(false)

  const typeLabel = COMPONENT_TYPES.get(typeId)?.label ?? "block"

  // Baseline to compare against: the user's saved default if present, else the SYSTEM default
  // for this type (its defaultProviderId + that provider's first variant). A freshly-dropped,
  // untouched node reads "clean" against the system default.
  const baseline = useMemo<{ providerId: string; variantId: string } | undefined>(() => {
    if (saved) return saved
    const sysProvider = COMPONENT_TYPES.get(typeId)?.defaultProviderId
    const comp = sysProvider ? componentLibrary.getComponent(sysProvider) : undefined
    const sysVariant = comp?.configVariants[0]?.id
    return sysProvider && sysVariant ? { providerId: sysProvider, variantId: sysVariant } : undefined
  }, [saved, typeId])

  const isDirty = !baseline || baseline.providerId !== providerId || baseline.variantId !== variantId

  const provider = componentLibrary.getComponent(providerId)
  const providerName = provider?.name ?? providerId
  const variantName = provider?.configVariants.find((v) => v.id === variantId)?.name ?? variantId

  const onConfirm = async () => {
    setOpen(false)
    if (!userId) {
      toast.error("Sign in to save block defaults")
      return
    }
    await saveDefault(userId, typeId, providerId, variantId)
    toast.success(`Saved as your default ${typeLabel}`)
  }

  return (
    <>
      <button
        type="button"
        data-testid="save-block-default"
        data-dirty={isDirty || undefined}
        aria-label={isDirty ? `Save ${providerName} as your default ${typeLabel}` : `${typeLabel} matches your saved default`}
        title={
          isDirty
            ? `Save "${providerName} · ${variantName}" as your default ${typeLabel}`
            : `This matches your saved default ${typeLabel}`
        }
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "nodrag absolute right-1 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded transition-colors",
          isDirty
            ? "text-amber-400 hover:bg-amber-400/10 hover:text-amber-300"
            : "text-text-secondary/40 opacity-0 hover:bg-white/5 hover:text-text-secondary group-hover:opacity-100",
        )}
      >
        <Save className="h-3 w-3" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="save-block-default-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save your default {typeLabel}?</DialogTitle>
            <DialogDescription>
              New {typeLabel} blocks you add will start as{" "}
              <strong className="text-text-primary">{providerName} · {variantName}</strong>.
              Blocks already on the canvas stay unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              No
            </Button>
            <Button size="sm" data-testid="save-block-default-confirm" onClick={onConfirm}>
              Yes, save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
