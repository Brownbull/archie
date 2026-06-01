import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUiStore, type ToolboxTab } from "@/stores/uiStore"
import { SearchFilter } from "@/components/toolbox/SearchFilter"
import { PanelInfoButton } from "@/components/help/PanelInfoButton"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { StacksTab } from "@/components/toolbox/StacksTab"
import { BlueprintTab } from "@/components/toolbox/BlueprintTab"
import { HistoryTab } from "@/components/toolbox/HistoryTab"

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
        {/* 2×2 grid of square tab cells (icon over label) rather than one cramped row of 4. */}
        <TabsList className="mx-3 grid h-auto w-auto grid-cols-2 gap-1 p-1">
          <TabsTrigger
            value="components"
            data-testid="toolbox-tab-components"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Logical building blocks — drag one onto the canvas, then pick a vendor"
          >
            <img src="/icons/tabs/blocks.png" alt="" className="h-7 w-7 [image-rendering:pixelated]" />
            Blocks
          </TabsTrigger>
          <TabsTrigger
            value="stacks"
            data-testid="toolbox-tab-stacks"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Small reusable patterns — drag to ADD a few connected components to your canvas"
          >
            <img src="/icons/tabs/stacks.png" alt="" className="h-7 w-7 [image-rendering:pixelated]" />
            Stacks
          </TabsTrigger>
          <TabsTrigger
            value="blueprints"
            data-testid="toolbox-tab-blueprints"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Complete starter architectures — Load one to REPLACE the canvas"
          >
            <img src="/icons/tabs/blueprints.png" alt="" className="h-7 w-7 [image-rendering:pixelated]" />
            Blueprints
          </TabsTrigger>
          <TabsTrigger
            value="history"
            data-testid="toolbox-tab-history"
            className="h-auto flex-col gap-1 py-2 text-[0.6875rem]"
            title="Your past challenge attempts and scores"
          >
            <img src="/icons/tabs/history.png" alt="" className="h-7 w-7 [image-rendering:pixelated]" />
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
