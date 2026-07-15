import { createFileRoute } from "@tanstack/react-router";
import { FacilitiesPanel } from "@/components/facilities/FacilitiesPanel";
import { ImperialOutpostManager } from "@/components/facilities/ImperialOutpostManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hammer, Map, Building2, Globe } from "lucide-react";
import { useGame } from "@/game/store";
import { NumericValue } from "@/components/horse/HorseBits";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/facilities")({
  component: FacilitiesPage,
});

function FacilitiesPage() {
  const facilities = useGame((s) => s.facilities);
  const outposts = useGame((s) => s.outposts ?? []);
  const facilityCount = Object.keys(facilities ?? {}).length;
  const outpostCount = outposts.length;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Infrastructure Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Building2 className="h-3.5 w-3.5" />
            Infrastructure & Logistics
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Our Facilities
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Active Facilities: <NumericValue value={facilityCount} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Global Outposts: <NumericValue value={outpostCount} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Status: <span className="text-success font-black">Active</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="border-gold/30 text-gold-muted bg-gold/5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 h-8 rounded-none"
          >
            Access: Owner
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="classic" className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
          <TabsList className="bg-transparent h-10 gap-2">
            <TabsTrigger
              value="classic"
              className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-6 transition-all"
            >
              <Hammer className="w-3.5 h-3.5" />
              Central H.Q. Upgrades
            </TabsTrigger>
            <TabsTrigger
              value="outposts"
              className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-6 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              Imperial Outposts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="outposts"
          className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <ImperialOutpostManager />
        </TabsContent>

        <TabsContent
          value="classic"
          className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <FacilitiesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
