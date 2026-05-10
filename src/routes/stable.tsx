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
import { NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { Building2, Users, ChevronRight, Search, Activity, Heart, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const stableSearchSchema = z.object({
  tab: fallback(z.enum(["roster", "rivals"]), "roster").default("roster"),
  status: fallback(z.enum(["active", "retired", "auctioned", "all"]), "active").default("active"),
  rivalQ: fallback(z.string(), "").default(""),
  rivalTier: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/stable")({
  validateSearch: zodValidator(stableSearchSchema),
  component: StablePage,
});

function StablePage() {
  const { tab, status, rivalQ, rivalTier } = Route.useSearch();
  const navigate = Route.useNavigate();
  const horses = useHorses();
  const awards = useAwards();
  const npcStables = useNpcStables();

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
    if (status === "all") return myHorses;
    if (status === "retired") return myHorses.filter((h) => h.lifecycleStatus === "retired");
    if (status === "auctioned") return myHorses.filter((h) => !!h.consignedSaleId);
    return myHorses.filter((h) => h.lifecycleStatus === "active" && !h.consignedSaleId);
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

  const updateRivalFilter = (key: "rivalQ" | "rivalTier", value: string) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value }),
    });
  };

  const clearRivalFilters = () => {
    navigate({
      search: (prev) => ({ ...prev, rivalQ: "", rivalTier: "all" }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Stables
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-mono)] tabular-nums">
          <NumericValue value={counts.active} /> active · <NumericValue value={counts.retired} /> retired · <NumericValue value={counts.auctioned} /> in auction
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/stallions">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Stallions at Stud
              </CardTitle>
              <p className="text-xs text-cream-muted">View available stallions for breeding</p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/jockeys">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Jockeys
              </CardTitle>
              <p className="text-xs text-cream-muted">Manage your jockey roster</p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/horse-gallery">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Horse Gallery
              </CardTitle>
              <p className="text-xs text-cream-muted">View your horses in a gallery format</p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/scheduler">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Campaign Scheduler
              </CardTitle>
              <p className="text-xs text-cream-muted">Plan race campaigns for your horses</p>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ search: (prev) => ({ ...prev, tab: v as "roster" | "rivals" }) })
        }
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="roster" className="gap-2">
            <Users className="h-4 w-4" />
            My Stable
          </TabsTrigger>
          <TabsTrigger value="rivals" className="gap-2">
            <Building2 className="h-4 w-4" />
            Rival Stables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          {playerAwards.length > 0 && <TrophyCase awards={playerAwards} variant="compact" />}

          {/* Status sub-nav, persisted via ?status= */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "active", label: "Active", count: counts.active, icon: Activity },
                { key: "retired", label: "Retired", count: counts.retired, icon: Heart },
                { key: "auctioned", label: "In Auction", count: counts.auctioned, icon: Tag },
                { key: "all", label: "All", count: counts.all, icon: Users },
              ] as const
            ).map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => navigate({ search: (prev) => ({ ...prev, status: key }) })}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm flex items-center gap-2 border transition-colors",
                  status === key
                    ? "bg-gold text-t950 border-gold"
                    : "border-gold-muted text-cream-muted hover:text-cream hover:bg-t700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="font-mono tabular-nums opacity-80">({count})</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMyHorses.map((h) => (
              <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }}>
                <HorseCard horse={h} variant="full" />
              </Link>
            ))}
            {filteredMyHorses.length === 0 && (
              <Card className="col-span-full border-gold-muted">
                <CardContent className="p-8 text-center text-cream-muted italic">
                  {status === "active"
                    ? "No active horses. Visit the auction to recruit your first champion."
                    : status === "retired"
                      ? "No retired horses yet."
                      : status === "auctioned"
                        ? "No horses currently consigned to auction."
                        : "Empty stalls, restless ambition."}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rivals" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cream-muted" />
              <Input
                placeholder="Search rivals..."
                className="pl-8 h-9 text-sm"
                value={rivalQ}
                onChange={(e) => updateRivalFilter("rivalQ", e.target.value)}
              />
            </div>
            <Select value={rivalTier} onValueChange={(v) => updateRivalFilter("rivalTier", v)}>
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="mid">Mid-Tier</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
              </SelectContent>
            </Select>
            {(rivalQ || rivalTier !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRivalFilters}
                className="h-9 gap-1 text-cream-muted hover:text-cream"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>

          {filteredRivalStables.length === 0 ? (
            <Card className="border-dashed border-gold-muted">
              <CardContent className="p-12 text-center text-cream-muted">
                <p>No rival stables match your current filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRivalStables.map((stable) => {
                const stableHorseCount = horseCountsByStable.get(stable.id) || 0;
                return (
                  <Card
                    key={stable.id}
                    className="hover:border-gold transition-colors border-gold-muted h-full flex flex-col"
                  >
                    <Link
                      to="/npc-stables/$stableId"
                      params={{ stableId: stable.id }}
                      className="group"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full border-2 shrink-0"
                              style={{
                                backgroundColor: stable.colors.primary,
                                borderColor: stable.colors.secondary,
                              }}
                            />
                            <div>
                              <CardTitle className="text-base font-[family-name:var(--font-display)] group-hover:text-gold transition-colors">
                                {stable.name}
                              </CardTitle>
                              <p className="text-xs text-cream-muted capitalize">
                                {stable.personality.replace("-", " ")} · {stable.tier}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-cream-muted group-hover:text-gold transition-colors shrink-0 mt-1" />
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-cream-muted">
                            <NumericValue value={stableHorseCount} /> horses
                          </span>
                          <Badge className="font-mono tabular-nums bg-t700 text-cream">
                            {formatCurrency(stable.cash)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Link>
                    {/* Sub-nav inside the card */}
                    <div className="mt-auto px-4 pb-3 flex gap-1 border-t border-gold-muted/40 pt-2">
                      {(
                        [
                          { tab: "roster", label: "Roster" },
                          { tab: "staff", label: "Staff" },
                          { tab: "history", label: "History" },
                        ] as const
                      ).map((item) => (
                        <Link
                          key={item.tab}
                          to="/npc-stables/$stableId"
                          params={{ stableId: stable.id }}
                          search={{ tab: item.tab }}
                          className="flex-1 text-center text-xs py-1 rounded text-cream-muted hover:bg-t700 hover:text-gold transition-colors"
                        >
                          {item.label}
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

