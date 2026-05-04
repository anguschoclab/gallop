import { useGame } from "@/game/store";
import { JockeyCard } from "./JockeyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Filter, UserCheck, Users } from "lucide-react";
import { JockeyArchetype } from "@/game/types";

export function JockeyRoster() {
  const jockeys = useGame((s) => s.jockeys);
  const hireJockey = useGame((s) => s.hireJockey);
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<JockeyArchetype | "all">("all");

  const myJockeys = jockeys.filter(j => j.contractUntil && !j.stableId); // undefined stableId = player
  const market = jockeys.filter(j => !j.stableId && !j.contractUntil);

  const filterList = (list: typeof jockeys) => {
    return list.filter(j => {
      const matchesSearch = j.name.toLowerCase().includes(search.toLowerCase());
      const matchesArchetype = archetypeFilter === "all" || j.archetype === archetypeFilter;
      return matchesSearch && matchesArchetype;
    });
  };

  const archetypes: JockeyArchetype[] = ["front_runner", "closer", "clinical", "finisher", "versatile"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic text-primary">Jockey Roster</h2>
          <p className="text-muted-foreground text-sm font-medium">Manage your retained riders and scout the free agent market.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search jockeys..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-white/10"
            />
          </div>
          <select 
            className="bg-card border border-white/10 rounded-md px-3 text-sm font-medium"
            value={archetypeFilter}
            onChange={(e) => setArchetypeFilter(e.target.value as any)}
          >
            <option value="all">All Styles</option>
            {archetypes.map(a => (
              <option key={a} value={a}>{a.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <Tabs defaultValue="my" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-card border border-white/5">
          <TabsTrigger value="my" className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px]">
            <UserCheck size={14} />
            My Jockeys ({myJockeys.length})
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px]">
            <Users size={14} />
            Market ({market.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-4 focus-visible:outline-none">
          {myJockeys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filterList(myJockeys).map(j => (
                <JockeyCard 
                  key={j.id} 
                  jockey={j} 
                  isRetained 
                  actionLabel="Contract Details" 
                  onAction={() => {}} 
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-card/30 rounded-xl border border-dashed border-white/10">
              <Users size={48} className="text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground font-bold">You haven't retained any jockeys yet.</p>
              <p className="text-sm text-muted-foreground/60">Scout the market to find the best talent for your stable.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="market" className="space-y-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filterList(market).map(j => (
              <JockeyCard 
                key={j.id} 
                jockey={j} 
                onAction={(jockey) => hireJockey(jockey.id)}
                actionLabel="Sign Retainer"
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
