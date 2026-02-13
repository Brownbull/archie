import { useEffect } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useUiStore } from "@/stores/uiStore"
import { useLibrary } from "@/hooks/useLibrary"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import type { Component } from "@/schemas/componentSchema"
import { groupByCategory } from "@/lib/componentUtils"

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const setSearchQuery = useUiStore((s) => s.setSearchQuery)
  const setToolboxTab = useUiStore((s) => s.setToolboxTab)
  const { components } = useLibrary()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(!useUiStore.getState().commandPaletteOpen)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [setOpen])

  function handleSelect(component: Component) {
    setOpen(false)
    setToolboxTab("components")
    setSearchQuery(component.name)
  }

  const grouped = groupByCategory(components)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search components..." />
      <CommandList>
        <CommandEmpty>No components found.</CommandEmpty>
        {Object.entries(grouped).map(([categoryId, comps]) => {
          const category = COMPONENT_CATEGORIES[categoryId as ComponentCategoryId]
          return (
            <CommandGroup key={categoryId} heading={category?.label ?? categoryId}>
              {comps.map((comp) => (
                <CommandItem
                  key={comp.id}
                  value={comp.name}
                  onSelect={() => handleSelect(comp)}
                >
                  {comp.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
