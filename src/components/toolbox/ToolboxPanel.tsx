import { createElement } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUiStore, type ToolboxTab } from "@/stores/uiStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { getTabLucideIcon } from "@/icons/officialTypeIcons"
import { SearchFilter } from "@/components/toolbox/SearchFilter"
import { PanelInfoButton } from "@/components/help/PanelInfoButton"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { StacksTab } from "@/components/toolbox/StacksTab"
import { BlueprintTab } from "@/components/toolbox/BlueprintTab"
import { HistoryTab } from "@/components/toolbox/HistoryTab"

/** A toolbox tab's icon: pixel-art PNG in `pixel` mode, a Lucide line icon in `official` mode. */
function TabIcon({ tab, src }: { tab: ToolboxTab; src: string }) {
  const iconSet = usePreferencesStore((s) => s.iconSet)
  if (iconSet === "official") {
    // createElement (not <JSX>) — dynamically-resolved component ref; see react-hooks/static-components.
    return createElement(getTabLucideIcon(tab), { className: "h-7 w-7", "aria-hidden": true })
  }
  return <img src={src} alt="" className="h-7 w-7 [image-rendering:pixelated]" />
}

export function ToolboxPanel() {
  const toolboxTab = useUiStore((s) => s.toolboxTab)
  const setToolboxTab = useUiStore((s) => s.setToolboxTab)

  return (
    <div data-testid="toolbox-panel" className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-text-secondary">Toolbox</span>
        <PanelInfoButton guideId="toolbox" side="bottom" />
      </div>
      <SearchFilter />
      <Tabs
        value={toolboxTab}
        onValueChange={(v) => setToolboxTab(v as ToolboxTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* 2×2 grid of square tab cells (icon over label) rather than one cramped row of 4.
            The h-auto override neutralizes tabsListVariants' fixed `h-9` (which otherwise clamps
            the grid to 36px and spills row 2 over the palette below). */}
        <TabsList className="mx-3 grid h-auto w-auto grid-cols-2 gap-1 p-1 group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsTrigger
            value="components"
            data-testid="toolbox-tab-components"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Logical building blocks — drag one onto the canvas, then pick a vendor"
          >
            <TabIcon tab="components" src="/icons/tabs/blocks.png" />
            Blocks
          </TabsTrigger>
          <TabsTrigger
            value="stacks"
            data-testid="toolbox-tab-stacks"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Small reusable patterns — drag to ADD a few connected components to your canvas"
          >
            <TabIcon tab="stacks" src="/icons/tabs/stacks.png" />
            Stacks
          </TabsTrigger>
          <TabsTrigger
            value="blueprints"
            data-testid="toolbox-tab-blueprints"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Complete starter architectures — Load one to REPLACE the canvas"
          >
            <TabIcon tab="blueprints" src="/icons/tabs/blueprints.png" />
            Blueprints
          </TabsTrigger>
          <TabsTrigger
            value="history"
            data-testid="toolbox-tab-history"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Your past challenge attempts and scores"
          >
            <TabIcon tab="history" src="/icons/tabs/history.png" />
            History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="flex-1 overflow-hidden">
          <ComponentTab />
        </TabsContent>
        <TabsContent value="stacks" className="flex-1 overflow-hidden">
          <StacksTab />
        </TabsContent>
        <TabsContent value="blueprints" className="flex-1 overflow-hidden">
          <BlueprintTab />
        </TabsContent>
        <TabsContent value="history" className="flex-1 overflow-hidden">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
