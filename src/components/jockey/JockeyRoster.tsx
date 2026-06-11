import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import { JockeyFilterPanel } from "./JockeyFilterPanel";
import { JockeyRosterTabs } from "./JockeyRosterTabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { JockeyArchetype, JockeySilkPattern } from "@/game/types";
import { NumericValue } from "@/components/horse/HorseBits";
import { Briefcase } from "lucide-react";

export function JockeyRoster() {
  const jockeys = useGameWithShallow((s) => s.jockeys);
  const hireJockey = useGame((s) => s.hireJockey);
  const releaseJockey = useGame((s) => s.releaseJockey);
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<JockeyArchetype | "all">("all");
  const [patternFilter, setPatternFilter] = useState<JockeySilkPattern | "all">("all");
  const [colorFilter, setColorFilter] = useState<string>("all");

  const myJockeys = jockeys?.filter((j: any) => !j.stableId && !!j.contractUntil) ?? [];
  const market = jockeys?.filter((j: any) => !j.stableId && !j.contractUntil) ?? [];

  const filterList = (list: any[]) => {
    if (!list) return [];
    return list.filter((j: any) => {
      const matchesSearch = j.name.toLowerCase().includes(search.toLowerCase());
      const matchesArchetype = archetypeFilter === "all" || j.archetype === archetypeFilter;
      const matchesPattern = patternFilter === "all" || j.silk.pattern === patternFilter;
      const matchesColor =
        colorFilter === "all" || j.silk.primary.toLowerCase() === colorFilter.toLowerCase();
      return matchesSearch && matchesArchetype && matchesPattern && matchesColor;
    });
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Registry Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-500/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Briefcase className="h-3.5 w-3.5" />
            Jockey Market
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Jockeys
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>Signed: <NumericValue value={myJockeys.length} /></span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Available: <NumericValue value={market.length} /></span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Status: <span className="text-success font-black">Licensed</span></span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="border-blue-500/30 text-blue-400 bg-blue-500/5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 h-8 rounded-none"
          >
            Licence: Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <JockeyFilterPanel
          search={search}
          onSearchChange={setSearch}
          archetypeFilter={archetypeFilter}
          onArchetypeChange={setArchetypeFilter}
          patternFilter={patternFilter}
          onPatternChange={setPatternFilter}
          colorFilter={colorFilter}
          onColorChange={setColorFilter}
          onReset={() => {
            setSearch("");
            setArchetypeFilter("all");
            setPatternFilter("all");
            setColorFilter("all");
          }}
        />
        <JockeyRosterTabs
          myJockeys={myJockeys}
          market={market}
          filterList={filterList}
          onRelease={(id) => releaseJockey(id)}
          onHire={(id) => hireJockey(id, "retainer")}
        />
      </div>
    </div>
  );
}
