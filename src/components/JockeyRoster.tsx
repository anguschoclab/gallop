import { useGame } from "@/game/store";
import { shallow } from "zustand/shallow";
import { JockeyCard } from "./JockeyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Filter,
  UserCheck,
  Users,
  Palette,
  Info,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  Zap,
} from "lucide-react";
import { JockeyArchetype, JockeySilkPattern } from "@/game/types";
import { cn } from "@/lib/utils";
import { NumericValue } from "@/components/HorseBits";

export function JockeyRoster() {
  const navigate = useNavigate();
  const jockeys = (useGame as any)((s: any) => s.jockeys, shallow);
  const hireJockey = useGame((s) => s.hireJockey);
  const releaseJockey = useGame((s) => s.releaseJockey);
  const [search, setSearch] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<JockeyArchetype | "all">("all");
  const [patternFilter, setPatternFilter] = useState<JockeySilkPattern | "all">("all");
  const [colorFilter, setColorFilter] = useState<string>("all");

  const myJockeys = jockeys?.filter((j: any) => !j.stableId && !!j.contractUntil) ?? [];
  const market = jockeys?.filter((j: any) => !j.stableId && !j.contractUntil) ?? [];

  const filterList = (list: typeof jockeys) => {
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

  const archetypes: JockeyArchetype[] = [
    "front_runner",
    "closer",
    "clinical",
    "finisher",
    "versatile",
  ];
  const patterns: JockeySilkPattern[] = [
    "solid",
    "stripes",
    "halves",
    "quarters",
    "chevron",
    "diamond",
    "star",
    "sash",
    "hoops",
  ];
  const commonColors = [
    { value: "all", label: "All Colours", hex: "#ffffff" },
    { value: "#ff0000", label: "Red", hex: "#ff0000" },
    { value: "#0000ff", label: "Blue", hex: "#0000ff" },
    { value: "#00ff00", label: "Green", hex: "#00ff00" },
    { value: "#ffff00", label: "Yellow", hex: "#ffff00" },
    { value: "#ffffff", label: "White", hex: "#ffffff" },
    { value: "#000000", label: "Black", hex: "#000000" },
    { value: "#ff8000", label: "Orange", hex: "#ff8000" },
    { value: "#800080", label: "Purple", hex: "#800080" },
  ];

  const PatternPreview = ({ pattern, color }: { pattern: JockeySilkPattern; color: string }) => {
    const baseStyle = { width: 24, height: 24, border: "1px solid rgba(255,255,255,0.1)" };
    switch (pattern) {
      case "solid":
        return <div style={{ ...baseStyle, backgroundColor: color }} />;
      default:
        return <div style={{ ...baseStyle, backgroundColor: color }} className="opacity-50" />;
    }
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
            <span>
              Signed: <NumericValue value={myJockeys.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Available: <NumericValue value={market.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Status: <span className="text-success font-black">Licensed</span>
            </span>
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
        {/* Left Pillar: Search & Filter */}
        <aside className="lg:col-span-3 space-y-8 lg:sticky lg:top-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Filter className="h-3.5 w-3.5 text-blue-400/60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
                Filters
              </h2>
            </div>
            <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-blue-400/40">
              <CardContent className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                    Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                    <Input
                      placeholder="Jockey name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-9 bg-slate-950/60 border-white/5 text-xs font-mono pl-8 uppercase tracking-tighter focus-visible:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                    Riding Style
                  </label>
                  <select
                    className="w-full h-9 bg-slate-950/60 border border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest text-cream px-2"
                    value={archetypeFilter}
                    onChange={(e) => setArchetypeFilter(e.target.value as JockeyArchetype | "all")}
                  >
                    <option value="all">All Styles</option>
                    {archetypes.map((a) => (
                      <option key={a} value={a}>
                        {a.replace("_", " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                    Silk Pattern
                  </label>
                  <select
                    className="w-full h-9 bg-slate-950/60 border border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest text-cream px-2"
                    value={patternFilter}
                    onChange={(e) => setPatternFilter(e.target.value as JockeySilkPattern | "all")}
                  >
                    <option value="all">All Patterns</option>
                    {patterns.map((p) => (
                      <option key={p} value={p}>
                        {p.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-blue-400/40 tracking-widest px-1">
                    Silk Colour
                  </label>
                  <select
                    className="w-full h-9 bg-slate-950/60 border border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest text-cream px-2"
                    value={colorFilter}
                    onChange={(e) => setColorFilter(e.target.value)}
                  >
                    {commonColors.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase tracking-[0.2em] text-cream/10 hover:text-cream/30 border border-dashed border-white/5 mt-2"
                  onClick={() => {
                    setSearch("");
                    setArchetypeFilter("all");
                    setPatternFilter("all");
                    setColorFilter("all");
                  }}
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          </section>

          <div className="p-4 bg-black/40 border border-white/5 text-center">
            <div className="text-[8px] font-black uppercase text-blue-400/40 tracking-[0.2em] mb-2 px-1">
              Rider Standards
            </div>
            <p className="text-[8px] font-mono text-cream/20 uppercase leading-relaxed italic">
              All retained riders must maintain active health certification and gear standards.
            </p>
          </div>
        </aside>

        {/* Right Pillar: Main Registry View */}
        <main className="lg:col-span-9 space-y-8">
          <Tabs defaultValue="my" className="w-full space-y-6">
            <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
              <TabsList className="bg-transparent h-10 gap-2">
                <TabsTrigger
                  value="my"
                  className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-6 transition-all"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  My Jockeys
                </TabsTrigger>
                <TabsTrigger
                  value="market"
                  className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-6 transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  Available
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="my"
              className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none"
            >
              {myJockeys.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filterList(myJockeys).map((j: any) => (
                    <JockeyCard
                      key={j.id}
                      jockey={j}
                      isRetained
                      actionLabel="Release"
                      onAction={(jockey) => releaseJockey(jockey.id)}
                      onClick={() => (window.location.href = `/jockey/${j.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
                  <Users className="h-16 w-16 mx-auto mb-6 text-cream/5" />
                  <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                    No Jockeys Signed
                  </p>
                  <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                    Browse the market to hire a jockey.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="market"
              className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filterList(market).map((j: any) => (
                  <JockeyCard
                    key={j.id}
                    jockey={j}
                    onAction={(jockey) => hireJockey(jockey.id, "retainer")}
                    actionLabel="Sign"
                    onClick={() =>
                      navigate({ to: "/jockey/$jockeyId", params: { jockeyId: j.id } })
                    }
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
