import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { useHorses } from "@/hooks/game/useCoreState";
import { useAwards, useNpcStables } from "@/hooks/game/useSystemsState";
import { AutoRegisterButton } from "@/components/stable";
import { StableRosterView } from "@/components/stable/StableRosterView";
import { RivalArchivesView } from "@/components/stable/RivalArchivesView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumericValue } from "@/components/horse/HorseBits";
import { cn } from "@/lib/cn";
import { useGame, useGameWithShallow } from "@/game/store";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { overall } from "@/components/horse/HorseBits";
import { Users, Clock, Heart, List, LayoutGrid } from "lucide-react";
import { matchesTendency } from "@/core/horse/paceTendency";
import { PaceTendencyFilter } from "@/components/horse/PaceTendencyFilter";
import { isPlayerOwned, getStableId } from "@/core/horse/ownership";

type StableSearch = {
  tab: "roster" | "rivals";
  status: "active" | "retired" | "auctioned" | "all";
  rivalQ: string;
  rivalTier: string;
  view: "ledger" | "gallery";
  tendency: "any" | "front" | "mid" | "off";
  trip: "any" | "sprint" | "mile" | "route";
  surface: "any" | "Turf" | "Dirt" | "Synthetic";
  compareIds: string[];
};

function StablePage() {
  const { tab, status, rivalQ, rivalTier, view, tendency, trip, surface, compareIds } = useSearch({
    from: "/stable/",
  });
  const navigate = useNavigate({ from: "/stable/" });
  const horses = useHorses();
  const awards = useAwards();
  const npcStables = useNpcStables();
  const npcAIManager = useGame((s) => s.npcAIManager);
  const news = useGameWithShallow((s) => s.news ?? []);

  const myHorses = useMemo(
    () =>
      Object.values(horses)
        .filter((h) => isPlayerOwned(h))
        .map(ensurePhenotypeResolved),
    [horses],
  );
  const playerAwards = useMemo(
    () => awards.filter((a) => !(a as { ownership?: unknown }).ownership),
    [awards],
  );

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
    if (tendency !== "any") {
      result = result.filter((h) => matchesTendency(h, tendency, { distance: trip, surface }));
    }
    return result.sort((a, b) => overall(b) - overall(a));
  }, [myHorses, status, tendency, trip, surface]);

  const horseCountsByStable = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(horses).forEach((h) => {
      const sid = getStableId(h);
      if (sid) counts.set(sid, (counts.get(sid) || 0) + 1);
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
      {/* Stable Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name=var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Users className="h-3 w-3" />
            Stability Division
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-cream font-[family-name=var(--font-display)]">
            Our Horses
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
          <AutoRegisterButton />
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
          navigate({ search: (prev: StableSearch) => ({ ...prev, tab: v as "roster" | "rivals" }) })
        }
        className="space-y-4"
      >
        <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
          <TabsList className="bg-transparent h-9">
            <TabsTrigger
              value="roster"
              className="gap-2 uppercase text-[10px] font-black tracking-widest data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-6"
            >
              All Horses
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
                onClick={() =>
                  navigate({
                    search: (prev: StableSearch) => ({ ...prev, view: "ledger" as const }),
                  })
                }
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
                onClick={() =>
                  navigate({
                    search: (prev: StableSearch) => ({ ...prev, view: "gallery" as const }),
                  })
                }
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="roster" className="mt-0 space-y-3">
          <PaceTendencyFilter
            tendency={tendency}
            onTendency={(t) =>
              navigate({ search: (prev: StableSearch) => ({ ...prev, tendency: t }) })
            }
            distance={trip}
            onDistance={(d) => navigate({ search: (prev: StableSearch) => ({ ...prev, trip: d }) })}
            surface={surface}
            onSurface={(s) =>
              navigate({ search: (prev: StableSearch) => ({ ...prev, surface: s }) })
            }
          />
          <StableRosterView
            horses={filteredMyHorses}
            status={status}
            view={view}
            counts={counts}
            playerAwards={playerAwards}
            navigate={navigate}
            compareIds={compareIds}
            onCompareIdsChange={(ids) =>
              navigate({ search: (prev: StableSearch) => ({ ...prev, compareIds: ids }) })
            }
          />
        </TabsContent>

        <TabsContent value="rivals" className="mt-0">
          <RivalArchivesView
            stables={filteredRivalStables}
            rivalQ={rivalQ}
            rivalTier={rivalTier}
            horseCountsByStable={horseCountsByStable}
            npcAIManager={npcAIManager!}
            navigate={navigate}
            news={news}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StablePage;
