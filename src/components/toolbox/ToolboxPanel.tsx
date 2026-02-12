import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUiStore, type ToolboxTab } from "@/stores/uiStore"
import { SearchFilter } from "@/components/toolbox/SearchFilter"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { StackTab } from "@/components/toolbox/StackTab"
import { BlueprintTab } from "@/components/toolbox/BlueprintTab"

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
        <TabsList className="mx-3 grid w-auto grid-cols-3">
          <TabsTrigger value="components" className="text-xs">Components</TabsTrigger>
          <TabsTrigger value="stacks" className="text-xs">Stacks</TabsTrigger>
          <TabsTrigger value="blueprints" className="text-xs">Blueprints</TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="flex-1 overflow-hidden">
          <ComponentTab />
        </TabsContent>
        <TabsContent value="stacks" className="flex-1">
          <StackTab />
        </TabsContent>
        <TabsContent value="blueprints" className="flex-1">
          <BlueprintTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
