import { createFileRoute } from "@tanstack/react-router";
import { FacilitiesPanel } from "@/components/FacilitiesPanel";
import { ImperialOutpostManager } from "@/components/ImperialOutpostManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hammer, Map } from "lucide-react";

export const Route = createFileRoute("/facilities")({
  component: FacilitiesPage,
});

function FacilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Facilities
        </h1>
        <p className="text-muted-foreground mt-1">
          Upgrade your stable infrastructure and manage global outposts
        </p>
      </div>

      <Tabs defaultValue="outposts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outposts" className="gap-2">
            <Map className="w-4 h-4" /> Outpost Management
          </TabsTrigger>
          <TabsTrigger value="classic" className="gap-2">
            <Hammer className="w-4 h-4" /> Detailed Upgrades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outposts">
          <ImperialOutpostManager />
        </TabsContent>

        <TabsContent value="classic">
          <FacilitiesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
