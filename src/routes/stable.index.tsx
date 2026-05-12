import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useHorses } from "@/game/hooks/useCoreState";
import { useAwards, useNpcStables } from "@/game/hooks/useSystemsState";
import { HorseCard } from "@/components/HorseCard";
import { TrophyCase } from "@/components/awards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumericValue, overall, HorseBit } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import {
  Building2,
  Users,
  ChevronRight,
  Search,
  Activity,
  Heart,
  Tag,
  X,
  Flame,
  LayoutGrid,
  List,
  Filter,
  Zap,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useGame } from "@/game/store";

const stableSearchSchema = z.object({
  tab: fallback(z.enum(["roster", "rivals"]), "roster").default("roster"),
  status: fallback(z.enum(["active", "retired", "auctioned", "all"]), "active").default("active"),
  rivalQ: fallback(z.string(), "").default(""),
  rivalTier: fallback(z.string(), "all").default("all"),
  view: fallback(z.enum(["ledger", "gallery"]), "ledger").default("ledger"),
});

export const Route = createFileRoute("/stable/")({
  validateSearch: zodValidator(stableSearchSchema),
  component: StablePage,
});

function StablePage() {
  const { tab, status, rivalQ, rivalTier, view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const horses = useHorses();
  const awards = useAwards();
  const npcStables = useNpcStables();
  const npcAIManager = useGame((s) => (s as any).npcAIManager);

  const myHorses = useMemo(() => horses.filter((h) => h.owned), [horses]);
  const playerAwards = useMemo(() => awards.filter((a) => !a.stableId), [awards]);

  const counts = useMemo(() => {
    const active = myHorses.filter(
      (h) => h.lifecycleStatus === "active" && !h.consignedSaleId,
    ).length;
    const retired = myHorses.filter((h) => h.lifecycleStatus === "retired").length;
    const auctioned = myHorses.filter((h) => !!h.consignedSaleId).length;
    return { active, retired, auctioned, all: myHorses.length };
  }, [myHorses]);

  const filteredMyHorses = useMemo(() => {
    let result = myHorses;
    if (status === "retired") result = myHorses.filter((h) => h.lifecycleStatus === "retired");
    else if (status === "auctioned") result = myHorses.filter((h) => !!h.consignedSaleId);
    else if (status === "active")
      result = myHorses.filter((h) => h.lifecycleStatus === "active" && !h.consignedSaleId);

    return result.sort((a, b) => overall(b) - overall(a));
  }, [myHorses, status]);

  const horseCountsByStable = useMemo(() => {
    const counts = new Map<string, number>();
    horses.forEach((h) => {
      if (h.stableId) counts.set(h.stableId, (counts.get(h.stableId) || 0) + 1);
    });
    return counts;
  }, [horses]);

  const filteredRivalStables = useMemo(() => {
    return npcStables.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(rivalQ.toLowerCase());
      const matchesTier = rivalTier === "all" || s.tier === rivalTier;
      return matchesSearch && matchesTier;
    });
  }, [npcStables, rivalQ, rivalTier]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Registry Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Users className="h-3 w-3" />
            Stability Division
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
            Registry of Assets
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Live Count: <NumericValue value={counts.active} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Retired: <NumericValue value={counts.retired} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Archived: <NumericValue value={counts.auctioned} />
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to="/scheduler">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-gold/20 hover:bg-gold/10 text-gold-muted font-bold uppercase text-[10px] tracking-widest"
            >
              <Clock className="h-3.5 w-3.5" />
              Campaign Logs
            </Button>
          </Link>
          <Link to="/stallions">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-pink-500/20 hover:bg-pink-500/10 text-pink-400 font-bold uppercase text-[10px] tracking-widest"
            >
              <Heart className="h-3.5 w-3.5" />
              Sire Watch
            </Button>
          </Link>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ search: (prev) => ({ ...prev, tab: v as "roster" | "rivals" }) })
        }
        className="space-y-4"
      >
        <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
          <TabsList className="bg-transparent h-9">
            <TabsTrigger
              value="roster"
              className="gap-2 uppercase text-[10px] font-black tracking-widest data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-6"
            >
              Main Registry
            </TabsTrigger>
            <TabsTrigger
              value="rivals"
              className="gap-2 uppercase text-[10px] font-black tracking-widest data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-6"
            >
              Rival Archives
            </TabsTrigger>
          </TabsList>

          {tab === "roster" && (
            <div className="flex items-center gap-1 pr-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 rounded",
                  view === "ledger" ? "bg-white/10 text-gold" : "text-cream/40",
                )}
                onClick={() => navigate({ search: (prev) => ({ ...prev, view: "ledger" }) })}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 rounded",
                  view === "gallery" ? "bg-white/10 text-gold" : "text-cream/40",
                )}
                onClick={() => navigate({ search: (prev) => ({ ...prev, view: "gallery" }) })}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <TabsContent
          value="roster"
          className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {playerAwards.length > 0 && <TrophyCase awards={playerAwards} variant="compact" />}

          {/* Registry Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-black/20 p-4 border border-white/5">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  {
                    key: "active",
                    label: "Operational",
                    count: counts.active,
                    icon: Activity,
                    color: "text-success",
                  },
                  {
                    key: "retired",
                    label: "Retired",
                    count: counts.retired,
                    icon: Heart,
                    color: "text-pink-400",
                  },
                  {
                    key: "auctioned",
                    label: "Archived",
                    count: counts.auctioned,
                    icon: Tag,
                    color: "text-warning",
                  },
                  {
                    key: "all",
                    label: "Global",
                    count: counts.all,
                    icon: Users,
                    color: "text-cream",
                  },
                ] as const
              ).map(({ key, label, count, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => navigate({ search: (prev) => ({ ...prev, status: key }) })}
                  className={cn(
                    "px-4 py-2 flex items-center gap-3 border font-mono text-[10px] uppercase font-bold tracking-widest transition-all",
                    status === key
                      ? "bg-white/5 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                      : "border-white/5 text-cream/40 hover:text-cream hover:bg-white/[0.02]",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", status === key ? color : "opacity-40")} />
                  {label}
                  <span className="opacity-40 ml-1">[{String(count).padStart(2, "0")}]</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                <Input
                  placeholder="Registry Search..."
                  className="h-8 bg-slate-950/50 border-white/5 text-[10px] font-mono pl-8 w-48 focus-visible:ring-gold/30 uppercase"
                />
              </div>
              <Button
                aria-label="Filter roster"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-white/5 text-cream/20 hover:text-cream"
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {view === "ledger" ? (
            <div className="border border-white/5 bg-slate-900/20 overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-muted/60">
                    <th className="px-6 py-3 font-black w-1">#</th>
                    <th className="px-4 py-3 font-black">Identified Asset</th>
                    <th className="px-4 py-3 font-black text-center">Age</th>
                    <th className="px-4 py-3 font-black text-center">Rating</th>
                    <th className="px-4 py-3 font-black text-center">Condition</th>
                    <th className="px-4 py-3 font-black text-center">Peaking</th>
                    <th className="px-6 py-3 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMyHorses.map((h, i) => {
                    const ovrVal = overall(h);
                    return (
                      <tr
                        key={h.id}
                        className="group hover:bg-white/[0.02] transition-colors relative"
                      >
                        <td className="px-6 py-4 font-mono text-[10px] text-cream/20 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            to="/stable/$horseId"
                            params={{ horseId: h.id }}
                            className="flex items-center gap-3"
                          >
                            <HorseBit horse={h} />
                            {h.activeInjury && (
                              <Badge
                                variant="destructive"
                                className="text-[8px] h-3.5 px-1 font-black animate-pulse"
                              >
                                INJURED
                              </Badge>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-xs text-cream/60">
                          {Math.floor(h.age)}Y
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div
                            className={cn(
                              "inline-block font-mono font-black text-sm tabular-nums",
                              ovrVal >= 80
                                ? "text-fame"
                                : ovrVal >= 70
                                  ? "text-success"
                                  : "text-cream",
                            )}
                          >
                            {ovrVal}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500",
                                  h.energy > 60
                                    ? "bg-success"
                                    : h.energy > 30
                                      ? "bg-warning"
                                      : "bg-destructive",
                                )}
                                style={{ width: `${h.energy}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-cream/40 uppercase">
                              E:{h.energy}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-black tracking-tighter uppercase h-5",
                              (h.peakingIndex ?? 0) > 20
                                ? "border-fame text-fame bg-fame/5"
                                : "border-white/10 text-cream/40",
                            )}
                          >
                            {(h.peakingIndex ?? 0) > 20 ? "PEAK" : "STD"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link to="/stable/$horseId" params={{ horseId: h.id }} hash="training">
                              <Button
                                aria-label={`Open training room for ${h.name}`}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-gold/10 hover:text-gold text-cream/20"
                                title="Training Room"
                              >
                                <Zap className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to="/scheduler">
                              <Button
                                aria-label={`Open mission plan for ${h.name}`}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-blue-400/10 hover:text-blue-400 text-cream/20"
                                title="Mission Plan"
                              >
                                <Clock className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to="/stable/$horseId" params={{ horseId: h.id }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 font-mono text-[9px] uppercase font-black tracking-tighter text-cream/40 group-hover:text-gold border border-transparent group-hover:border-gold/20"
                              >
                                View Record <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredMyHorses.length === 0 && (
                <div className="p-20 text-center space-y-4 bg-black/10">
                  <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Search className="h-6 w-6 text-cream/10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-cream/60 uppercase tracking-widest font-[family-name:var(--font-display)]">
                      No Records Located
                    </p>
                    <p className="text-[10px] font-mono text-cream/20 uppercase tracking-tighter">
                      Current filter parameters yielded zero matches in the registry.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyHorses.map((h) => (
                <HorseCard
                  key={h.id}
                  horse={h}
                  variant="full"
                  onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: h.id } })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="rivals"
          className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex flex-wrap items-center gap-3 bg-black/20 p-4 border border-white/5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/20" />
              <Input
                placeholder="Identify Rival Entity..."
                className="pl-9 h-10 bg-slate-950/50 border-white/10 text-sm font-mono uppercase tracking-tight focus-visible:ring-blue-500/30"
                value={rivalQ}
                onChange={(e) => navigate({ search: (p) => ({ ...p, rivalQ: e.target.value }) })}
              />
            </div>
            <Select
              value={rivalTier}
              onValueChange={(v) => navigate({ search: (p) => ({ ...p, rivalTier: v }) })}
            >
              <SelectTrigger className="h-10 w-40 bg-slate-950/50 border-white/10 text-xs font-bold uppercase tracking-widest">
                <SelectValue placeholder="Entity Tier" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10">
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="elite">Elite Class</SelectItem>
                <SelectItem value="mid">Mid-Tier Ops</SelectItem>
                <SelectItem value="budget">Budget Sector</SelectItem>
              </SelectContent>
            </Select>
            {(rivalQ || rivalTier !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate({ search: (p) => ({ ...p, rivalQ: "", rivalTier: "all" }) })
                }
                className="h-10 gap-2 text-cream/40 hover:text-cream uppercase text-[10px] font-black tracking-widest"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>

          {filteredRivalStables.length === 0 ? (
            <div className="p-20 text-center border border-dashed border-white/10 opacity-40">
              <p className="font-mono text-xs uppercase tracking-widest">
                No Intelligence Data Available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRivalStables.map((stable) => {
                const stableHorseCount = horseCountsByStable.get(stable.id) || 0;
                const stableAI = npcAIManager?.stableStates?.[stable.id];
                const friction = stableAI?.friction ?? 0;

                return (
                  <Card
                    key={stable.id}
                    className="bg-slate-900/20 border-white/5 hover:border-blue-500/40 transition-all duration-300 rounded-none group overflow-hidden"
                  >
                    <Link
                      to="/npc-stables/$stableId"
                      params={{ stableId: stable.id }}
                      className="block p-5"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-sm rotate-45 border border-white/20 shadow-lg shrink-0"
                            style={{ backgroundColor: stable.colors.primary }}
                          />
                          <div>
                            <h3 className="font-bold text-cream font-[family-name:var(--font-display)] group-hover:text-blue-400 transition-colors">
                              {stable.name}
                            </h3>
                            <p className="text-[10px] font-mono uppercase tracking-tighter text-cream/40">
                              {stable.personality} · {stable.tier}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-cream/20 group-hover:text-blue-400 transition-colors" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-cream/40 flex items-center gap-1.5">
                            <Flame
                              className={cn(
                                "h-3 w-3",
                                friction > 50 ? "text-red-500" : "text-cream/20",
                              )}
                            />
                            Relation
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase",
                              friction > 50
                                ? "text-red-400"
                                : friction < -30
                                  ? "text-success"
                                  : "text-cream/60",
                            )}
                          >
                            {friction > 70
                              ? "HATED"
                              : friction > 30
                                ? "TENSE"
                                : friction < -50
                                  ? "ALLY"
                                  : "NEUTRAL"}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-cream/40">
                            Assets: <span className="text-cream">{stableHorseCount}</span>
                          </span>
                          <span className="text-success font-bold">
                            {formatCurrency(stable.cash)}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex divide-x divide-white/5 border-t border-white/5 bg-black/20">
                      {(["roster", "staff", "history"] as const).map((t) => (
                        <Link
                          key={t}
                          to="/npc-stables/$stableId"
                          params={{ stableId: stable.id }}
                          search={{ tab: t }}
                          className="flex-1 py-2 text-center text-[9px] font-black uppercase tracking-tighter text-cream/30 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
