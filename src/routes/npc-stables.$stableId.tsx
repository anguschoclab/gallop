import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Eye,
  Brain,
  Building2,
  Globe,
  Users,
  DollarSign,
  HandCoins,
  Trophy,
  CalendarDays,
  Calendar,
  ListChecks,
  History,
  ShieldCheck,
  Zap,
  Activity,
  Briefcase,
} from "lucide-react";
import { useHorses, useDay, useCash } from "@/game/hooks/useCoreState";
import { useNpcStables, useAwards } from "@/game/hooks/useSystemsState";
import { useGame } from "@/game/store";
import { getStableById } from "@/core/stable/stableQueries";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { calculateScoutCost } from "@/game/scouting";
import { HorseCard } from "@/components/HorseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrophyCase } from "@/components/awards";
import { isMaleHorse, isFemaleHorse } from "@/core/horse/gender";
import { NumericValue, overall } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { useState, useEffect } from "react";
import type { Horse, PrivateSaleOffer } from "@/game/types";
import { PrivateSaleOfferDialog } from "@/components/auction/PrivateSaleOfferDialog";
import { PrivateSaleCounterCard } from "@/components/auction/PrivateSaleCounterCard";
import { toast } from "sonner";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  tab: fallback(z.enum(["overview", "roster", "staff", "history"]), "overview").default("overview"),
});

export const Route = createFileRoute("/npc-stables/$stableId")({
  component: NpcStableDetailPage,
  validateSearch: zodValidator(searchSchema),
});

function NpcStableDetailPage() {
  const { stableId } = Route.useParams();
  const router = useRouter();
  const npcStables = useNpcStables();
  const horses = useHorses();
  const day = useDay();
  const cash = useCash();
  const awards = useAwards();
  const scoutHorse = useGame((s) => s.scoutHorse);
  const respondToPrivateSale = useGame((s) => s.respondToPrivateSale);
  const privateSaleOffers: PrivateSaleOffer[] = useGame((s) => s.privateSaleOffers ?? []);
  const npcAIManager = useGame((s) => (s as any).npcAIManager);

  const [offerHorse, setOfferHorse] = useState<Horse | null>(null);

  const stable = getStableById(npcStables, stableId);
  if (!stable) {
    return (
      <div className="p-12 text-center space-y-4">
        <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream">
          Stable not found
        </h1>
        <Link
          to="/stable"
          search={{ tab: "rivals" }}
          className="text-blue-400 uppercase font-mono text-xs tracking-widest hover:underline"
        >
          All Stables
        </Link>
      </div>
    );
  }

  const stableHorses = horses.filter((h: Horse) => h.stableId === stableId);
  const activeHorses = stableHorses.filter(
    (h: Horse) => !h.healthStatus || h.healthStatus === "healthy",
  );
  const colts = stableHorses.filter((h: Horse) => isMaleHorse(h.gender));
  const fillies = stableHorses.filter((h: Horse) => isFemaleHorse(h.gender));

  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  const stableAI = npcAIManager?.stableStates?.[stable.id];
  const friction = stableAI?.friction ?? 0;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-500/20 pb-6">
        <div>
          <button
            onClick={() => navigate({ to: "/stable", search: { tab: "rivals" } })}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cream/30 hover:text-blue-400 transition-colors mb-4"
          >
            <ArrowLeft className="h-3 w-3" /> Stables
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div
              className="w-10 h-10 rounded-sm rotate-45 border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0"
              style={{ backgroundColor: stable.colors.primary }}
            />
            <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)] uppercase text-left">
              {stable.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              <Globe className="h-3 w-3 inline mr-1" />
              {stable.country}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Horses: <NumericValue value={stableHorses.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Type: {stable.personality}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-mono text-cream/20 uppercase tracking-widest">
            Liquid_Capital
          </div>
          <div className="text-2xl font-black font-mono text-success tabular-nums tracking-tighter">
            {formatCurrency(stable.cash)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Main Content */}
        <div className="space-y-6 min-w-0">
          <Tabs
            value={tab}
            onValueChange={(v) => navigate({ search: { tab: v as any } })}
            className="space-y-6"
          >
            <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
              <TabsList className="bg-transparent h-10 gap-2">
                <TabsTrigger
                  value="overview"
                  className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="roster"
                  className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  Roster
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-4 transition-all"
                >
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="overview"
              className="mt-0 space-y-6 animate-in fade-in duration-300"
            >
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
                <CardContent className="p-6 space-y-6">
                  {stable.description && (
                    <p className="text-sm text-cream/80 font-serif italic border-l-2 border-white/10 pl-4">
                      {stable.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1.5 px-3 py-1 border-white/10 text-cream/60 rounded-none font-mono text-[10px] uppercase"
                    >
                      <Brain className="w-3 h-3 text-blue-400" />
                      {stable.personality.replace("-", " ")}
                    </Badge>
                    <span className="text-[10px] text-cream/40 font-mono uppercase tracking-tighter">
                      {PERSONALITY_CONFIG[stable.personality]?.description}
                    </span>
                    {stable.preferredDistance && (
                      <Badge className="text-[9px] bg-black/40 text-cream/60 border border-white/5 rounded-none px-2 font-black tracking-widest uppercase">
                        SPEC: {stable.preferredDistance}m {stable.preferredSurface}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                    <div className="bg-black/20 p-3 border border-white/5 text-center">
                      <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                        Total Horses
                      </div>
                      <div className="text-xl font-bold font-mono text-cream">
                        {stableHorses.length}
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 border border-white/5 text-center">
                      <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                        Active
                      </div>
                      <div className="text-xl font-bold font-mono text-success">
                        {activeHorses.length}
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 border border-white/5 text-center">
                      <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                        Colts/Horses
                      </div>
                      <div className="text-xl font-bold font-mono text-blue-400">
                        {colts.length}
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 border border-white/5 text-center">
                      <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                        Fillies/Mares
                      </div>
                      <div className="text-xl font-bold font-mono text-pink-400">
                        {fillies.length}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <TrophyCase
                awards={awards?.filter((a) => a.stableId === stableId) ?? []}
                ownerName={stable.name}
                variant="compact"
              />
            </TabsContent>

            <TabsContent value="roster" className="mt-0 space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stableHorses
                  .sort((a, b) => overall(b) - overall(a))
                  .map((horse: Horse) => {
                    const scoutCost = calculateScoutCost(horse, stable!);
                    const canScout = !horse.lastScoutedDay || day - horse.lastScoutedDay > 0;

                    const activeOffer = privateSaleOffers.find(
                      (o: PrivateSaleOffer) =>
                        o.horseId === horse.id &&
                        o.fromStableId === undefined &&
                        (o.status === "pending" || o.status === "countered"),
                    );
                    const hasInAuction = !!horse.consignedSaleId;

                    const handleScout = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const result = scoutHorse(horse.id);
                      if (result.success) toast.success(result.message);
                      else toast.error(result.message);
                    };

                    return (
                      <div key={horse.id} className="relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/10 group-hover:bg-blue-500 transition-colors z-10" />

                        <Link
                          to="/stable/$horseId"
                          params={{ horseId: horse.id }}
                          className="block"
                        >
                          <HorseCard
                            horse={horse}
                            variant="scout"
                            showScoutInfo
                            className="hover:border-blue-500/40"
                          />
                        </Link>

                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOfferHorse(horse);
                            }}
                            disabled={!!activeOffer || hasInAuction}
                            className="h-7 px-3 text-[9px] font-black uppercase tracking-widest border-white/10 hover:bg-gold/10 hover:text-gold hover:border-gold/30 rounded-none bg-slate-950/80 backdrop-blur-sm text-cream/60"
                          >
                            <HandCoins className="w-3 h-3 mr-1.5" />
                            {activeOffer ? "PENDING" : "OFFER"}
                          </Button>
                          {canScout && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleScout}
                              disabled={cash < scoutCost}
                              className="h-7 px-3 text-[9px] font-black uppercase tracking-widest border-white/10 hover:bg-blue-400/10 hover:text-blue-400 hover:border-blue-400/30 rounded-none bg-slate-950/80 backdrop-blur-sm text-cream/60"
                            >
                              <Eye className="w-3 h-3 mr-1.5" />
                              SCOUT_[-${formatCurrency(scoutCost).replace("$", "")}]
                            </Button>
                          )}
                        </div>

                        {activeOffer && (
                          <div className="mt-2">
                            <PrivateSaleCounterCard
                              offer={activeOffer}
                              horse={horse}
                              stable={stable!}
                              cash={cash}
                              onRespond={respondToPrivateSale}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              {stableHorses.length === 0 && (
                <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
                  <ShieldCheck className="h-16 w-16 mx-auto mb-6 text-cream/5" />
                  <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                    No Horses
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="staff" className="mt-0 animate-in fade-in duration-300">
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
                <CardHeader className="bg-black/20 border-b border-white/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                    Retained Personnel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    {Object.entries(stable.staff || {}).map(([role, name]) => (
                      <div
                        key={role}
                        className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-cream/40 flex items-center gap-2">
                          <Briefcase className="h-3 w-3" /> {role.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-bold text-cream uppercase text-right">
                          {name || <span className="italic text-cream/20 font-mono">Vacant</span>}
                        </span>
                      </div>
                    ))}
                    {Object.keys(stable.staff || {}).length === 0 && (
                      <div className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                        No personnel records found.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0 animate-in fade-in duration-300">
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
                <CardHeader className="bg-black/20 border-b border-white/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                    Entity Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-white/5">
                    <div className="flex justify-between p-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                        Established
                      </span>
                      <span className="font-mono text-xs text-cream tabular-nums">
                        {stable.founded}
                      </span>
                    </div>
                    <div className="flex justify-between p-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                        Reputation
                      </span>
                      <span className="font-mono text-xs text-fame tabular-nums">
                        {stable.reputation}
                      </span>
                    </div>
                    <div className="flex justify-between p-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                        Cash on Hand
                      </span>
                      <span className="font-mono text-xs text-success tabular-nums">
                        {formatCurrency(stable.cash)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="bg-slate-900/60 border-white/5 rounded-none shadow-2xl">
            <CardHeader className="pb-3 border-b border-white/5 bg-black/40">
              <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-cream/40">
                Entity Brief
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <div className="flex justify-between items-center p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
                    Tier
                  </span>
                  <Badge
                    className={cn(
                      "rounded-none h-4 px-1.5 text-[8px] font-black uppercase tracking-widest",
                      stable.tier === "elite"
                        ? "bg-fame text-slate-950"
                        : stable.tier === "mid"
                          ? "bg-gold text-slate-950"
                          : "bg-slate-700 text-cream",
                    )}
                  >
                    {stable.tier}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
                    Relation
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      friction > 50
                        ? "text-destructive"
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
                <div className="flex justify-between items-center p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cream/30">
                    Reputation
                  </span>
                  <span className="text-fame flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Trophy
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < Math.floor(stable.reputation / 20) ? "fill-current" : "opacity-20",
                        )}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-white/5 rounded-none shadow-2xl">
            <CardHeader className="pb-3 border-b border-white/5 bg-black/40">
              <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-cream/40">
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <button
                  onClick={() => navigate({ search: { tab: "roster" } })}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-blue-400">
                    <ListChecks className="h-3 w-3" /> Horse Roster
                  </span>
                  <span className="font-mono text-[10px] text-cream/20">{stableHorses.length}</span>
                </button>
                <button
                  onClick={() => navigate({ search: { tab: "staff" } })}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-blue-400">
                    <Users className="h-3 w-3" /> Personnel
                  </span>
                </button>
                <button
                  onClick={() => navigate({ search: { tab: "history" } })}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-blue-400">
                    <History className="h-3 w-3" /> Records
                  </span>
                </button>
                <Link
                  to="/races"
                  search={{ stableId }}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cream/40 group-hover:text-gold">
                    <CalendarDays className="h-3 w-3" /> Schedule
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Make an Offer dialog */}
      {offerHorse && (
        <PrivateSaleOfferDialog
          horse={offerHorse}
          stable={stable!}
          isOpen={!!offerHorse}
          onClose={() => setOfferHorse(null)}
          cash={cash}
          allHorses={horses}
        />
      )}
    </div>
  );
}

import React from "react";
