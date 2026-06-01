import { create } from "zustand"

/** Open-state for the keyboard-shortcuts help, shared by the `?` key and the Settings menu item. */
export const useShortcutsDialog = create<{
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
