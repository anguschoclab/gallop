import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { Badge } from "@/components/ui/badge";
import { ReputationBadge } from "@/components/ReputationBadge";
import { Zap, AlertCircle, Gavel } from "lucide-react";
import { UrgentMessagesStrip } from "@/components/dashboard/UrgentMessagesStrip";
import { GallopGazette } from "@/components/dashboard/GallopGazette";
import { OperationsTicker } from "@/components/dashboard/OperationsTicker";
import { KeyRivalsWidget } from "@/components/dashboard/KeyRivalsWidget";
import { HQOpsWidget } from "@/components/dashboard/HQOpsWidget";
import { StableRosterWidget } from "@/components/dashboard/StableRosterWidget";
import { CircuitWidget } from "@/components/dashboard/CircuitWidget";
import { NewsFeedWidget } from "@/components/dashboard/NewsFeedWidget";
import { LegacyAwardsWidget } from "@/components/dashboard/LegacyAwardsWidget";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const {
    day,
    cash,
    horses,
    races,
    auctions,
    npcStables,
    npcAIManager,
    inbox,
  } = useGame();

  const ownedHorses = horses.filter((h) => h.owned);
  const activeHorses = ownedHorses.filter((h) => h.lifecycleStatus === "active");
  const lowEnergyHorses = activeHorses.filter((h) => h.energy < 40);

  const upcoming = races
    .filter((r) => !r.resolved && r.day >= day)
    .sort((a, b) => a.day - b.day)
    .slice(0, 8);

  const nextOwnedRace = upcoming.find((r) => r.entries.some((e: any) => e.owned));
  const activeAuctions = auctions?.filter((a) => !a.resolved) ?? [];

  const urgentMessages = (inbox || [])
    .filter((m: any) => !m.readAt && m.priority !== "info")
    .sort((a: any, b: any) => b.day - a.day)
    .slice(0, 3);

  const topRivals = npcStables
    .map((stable) => ({
      stable,
      friction: npcAIManager?.stableStates?.[stable.id]?.friction ?? 0,
    }))
    .filter((r) => r.friction >= 40)
    .sort((a, b) => b.friction - a.friction)
    .slice(0, 3);

  const raceMap = React.useMemo(() => new Map(races.map((r: any) => [r.id, r])), [races]);

  const calculateHeadToHead = React.useCallback(
    (stableId: string) => {
      const thirtyDaysAgo = day - 30;
      let wins = 0;
      let losses = 0;
      ownedHorses.forEach((horse) => {
        horse.raceHistory
          .filter((r: { day: number }) => r.day >= thirtyDaysAgo)
          .forEach((raceResult: { raceId: string; position: number }) => {
            const race = raceMap.get(raceResult.raceId);
            if (race) {
              const hadRivalEntry = race.entries.some((e: any) => e.stableId === stableId);
              if (hadRivalEntry) {
                if (raceResult.position === 1) wins++;
                else losses++;
              }
            }
          });
      });
      return { wins, losses };
    },
    [day, ownedHorses, raceMap],
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Command Center
          </h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-gold/30 text-gold bg-gold/5 font-mono tracking-[0.2em] text-[10px] uppercase h-5">
              {gameCalendarDate(day)}
            </Badge>
            <ReputationBadge />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextOwnedRace && (
            <Badge className="bg-fame text-slate-950 gap-1.5 py-1 font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              <Zap className="h-3 w-3 fill-current" />
              Next Race: D{nextOwnedRace.day}
            </Badge>
          )}
          {lowEnergyHorses.length > 0 && (
            <Badge variant="destructive" className="gap-1.5 animate-pulse py-1 font-bold uppercase tracking-tighter">
              <AlertCircle className="h-3 w-3" />
              {lowEnergyHorses.length} Fatigued
            </Badge>
          )}
          {activeAuctions.length > 0 && (
            <Link to="/auction">
              <Badge className="bg-success text-slate-950 gap-1.5 py-1 font-bold uppercase tracking-tighter hover:opacity-90 transition-opacity">
                <Gavel className="h-3 w-3" />
                {activeAuctions.length} Sales Open
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Urgent Messages */}
      <UrgentMessagesStrip messages={urgentMessages} />

      {/* Top Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">
          <GallopGazette />
        </div>
        <div className="xl:col-span-4">
          <OperationsTicker />
        </div>
      </div>

      {/* Main Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KeyRivalsWidget rivals={topRivals} calculateHeadToHead={calculateHeadToHead} />
        <HQOpsWidget />
        <StableRosterWidget />
        <CircuitWidget />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        <NewsFeedWidget />
        <LegacyAwardsWidget />
      </div>
    </div>
  );
}
