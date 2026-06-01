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
        <TabsList className="mx-3 grid w-auto grid-cols-4">
          <TabsTrigger
            value="components"
            data-testid="toolbox-tab-components"
            className="text-xs"
            title="Logical building blocks — drag one onto the canvas, then pick a vendor"
          >
            Blocks
          </TabsTrigger>
          <TabsTrigger
            value="stacks"
            data-testid="toolbox-tab-stacks"
            className="text-xs"
            title="Small reusable patterns — drag to ADD a few connected components to your canvas"
          >
            Stacks
          </TabsTrigger>
          <TabsTrigger
            value="blueprints"
            data-testid="toolbox-tab-blueprints"
            className="text-xs"
            title="Complete starter architectures — Load one to REPLACE the canvas"
          >
            Blueprints
          </TabsTrigger>
          <TabsTrigger
            value="history"
            data-testid="toolbox-tab-history"
            className="text-xs"
            title="Your past challenge attempts and scores"
          >
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
