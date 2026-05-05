import { useGame } from "@/game/store";
import { JockeyCard } from "./JockeyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Search, Filter, UserCheck, Users, Palette, Info } from "lucide-react";
import { JockeyArchetype, JockeySilkPattern } from "@/game/types";

export function JockeyRoster() {
  const jockeys = useGame((s) => s.jockeys);
  const hireJockey = useGame((s) => s.hireJockey);
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<JockeyArchetype | "all">("all");
  const [patternFilter, setPatternFilter] = useState<JockeySilkPattern | "all">("all");
  const [colorFilter, setColorFilter] = useState<string>("all");

  // Player jockeys: undefined stableId AND have an active contract (player-signed)
  const myJockeys = jockeys?.filter(j => !j.stableId && !!j.contractUntil) ?? [];
  // Free-agent market: not contracted to anyone
  const market = jockeys?.filter(j => !j.stableId && !j.contractUntil) ?? [];

  const filterList = (list: typeof jockeys) => {
    if (!list) return [];
    return list.filter(j => {
      const matchesSearch = j.name.toLowerCase().includes(search.toLowerCase());
      const matchesArchetype = archetypeFilter === "all" || j.archetype === archetypeFilter;
      const matchesPattern = patternFilter === "all" || j.silk.pattern === patternFilter;
      const matchesColor = colorFilter === "all" || j.silk.primary.toLowerCase() === colorFilter.toLowerCase();
      return matchesSearch && matchesArchetype && matchesPattern && matchesColor;
    });
  };

  const archetypes: JockeyArchetype[] = ["front_runner", "closer", "clinical", "finisher", "versatile"];
  const patterns: JockeySilkPattern[] = ["solid", "stripes", "halves", "quarters", "chevron", "diamond", "star", "sash", "hoops"];
  const commonColors = [
    { value: "all", label: "All Colors", hex: "#ffffff" },
    { value: "#ff0000", label: "Red", hex: "#ff0000" },
    { value: "#0000ff", label: "Blue", hex: "#0000ff" },
    { value: "#00ff00", label: "Green", hex: "#00ff00" },
    { value: "#ffff00", label: "Yellow", hex: "#ffff00" },
    { value: "#ffffff", label: "White", hex: "#ffffff" },
    { value: "#000000", label: "Black", hex: "#000000" },
    { value: "#ff8000", label: "Orange", hex: "#ff8000" },
    { value: "#800080", label: "Purple", hex: "#800080" },
    { value: "#ff00ff", label: "Pink", hex: "#ff00ff" },
    { value: "#00ffff", label: "Cyan", hex: "#00ffff" },
  ];

  // Visual representation of silk patterns
  const PatternPreview = ({ pattern, color }: { pattern: JockeySilkPattern; color: string }) => {
    const baseStyle = { width: 32, height: 32, border: '1px solid #333' };
    
    switch (pattern) {
      case 'solid':
        return <div style={{ ...baseStyle, backgroundColor: color }} />;
      case 'stripes':
        return (
          <div style={{ ...baseStyle, backgroundColor: color }}>
            <div style={{ height: '100%', background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #fff 4px, #fff 8px)' }} />
          </div>
        );
      case 'halves':
        return (
          <div style={{ ...baseStyle, background: `linear-gradient(90deg, ${color} 50%, #fff 50%)` }} />
        );
      case 'quarters':
        return (
          <div style={{ ...baseStyle, background: `linear-gradient(135deg, ${color} 50%, #fff 50%)` }} />
        );
      case 'chevron':
        return (
          <div style={{ ...baseStyle, backgroundColor: color }}>
            <div style={{ height: '100%', background: 'linear-gradient(180deg, transparent 40%, #fff 40%, #fff 60%, transparent 60%)' }} />
          </div>
        );
      case 'diamond':
        return (
          <div style={{ ...baseStyle, backgroundColor: color }}>
            <div style={{ height: '100%', backgroundImage: 'radial-gradient(circle, #fff 20%, transparent 20%)', backgroundSize: '16px 16px' }} />
          </div>
        );
      case 'star':
        return (
          <div style={{ ...baseStyle, backgroundColor: color }}>
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>★</div>
          </div>
        );
      case 'sash':
        return (
          <div style={{ ...baseStyle, backgroundColor: color }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent 40%, #fff 40%, #fff 60%, transparent 60%)' }} />
          </div>
        );
      case 'hoops':
        return (
          <div style={{ ...baseStyle, backgroundColor: color }}>
            <div style={{ height: '100%', background: 'repeating-linear-gradient(0deg, transparent, transparent 4px, #fff 4px, #fff 8px)' }} />
          </div>
        );
      default:
        return <div style={{ ...baseStyle, backgroundColor: color }} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic text-gold font-[family-name:var(--font-display)]">Jockey Roster</h2>
          <p className="text-cream-muted text-sm font-medium font-[family-name:var(--font-body)]">Manage your retained riders and scout the free agent market.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
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
          <select 
            className="bg-card border border-white/10 rounded-md px-3 text-sm font-medium"
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value as any)}
          >
            <option value="all">All Patterns</option>
            {patterns.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <select 
            className="bg-card border border-white/10 rounded-md px-3 text-sm font-medium"
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
          >
            {commonColors.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="bg-card border border-white/10 rounded-md px-3 py-2 hover:bg-white/5 transition-colors">
                  <Info size={16} className="text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-4 max-w-sm">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm mb-2">Silk Patterns</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {patterns.map(pattern => (
                      <div key={pattern} className="flex flex-col items-center gap-1">
                        <PatternPreview pattern={pattern} color="#ff0000" />
                        <span className="text-xs capitalize">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
