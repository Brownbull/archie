import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUiStore, type ToolboxTab } from "@/stores/uiStore"
import { SearchFilter } from "@/components/toolbox/SearchFilter"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { StacksTab } from "@/components/toolbox/StacksTab"
import { BlueprintTab } from "@/components/toolbox/BlueprintTab"
import { HistoryTab } from "@/components/toolbox/HistoryTab"

export function ToolboxPanel() {
  const toolboxTab = useUiStore((s) => s.toolboxTab)
  const setToolboxTab = useUiStore((s) => s.setToolboxTab)

  return (
    <div data-testid="toolbox-panel" className="flex h-full flex-col">
      <SearchFilter />
      <Tabs
        value={toolboxTab}
        onValueChange={(v) => setToolboxTab(v as ToolboxTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-3 grid w-auto grid-cols-4">
          <TabsTrigger
            value="components"
            className="text-xs"
            title="Logical building blocks — drag one onto the canvas, then pick a vendor"
          >
            Blocks
          </TabsTrigger>
          <TabsTrigger
            value="stacks"
            className="text-xs"
            title="Small reusable patterns — drag to ADD a few connected components to your canvas"
          >
            Stacks
          </TabsTrigger>
          <TabsTrigger
            value="blueprints"
            className="text-xs"
            title="Complete starter architectures — Load one to REPLACE the canvas"
          >
            Blueprints
          </TabsTrigger>
          <TabsTrigger
            value="history"
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
