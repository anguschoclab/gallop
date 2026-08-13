import { createFileRoute, Link } from "@tanstack/react-router";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
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
import { SeasonStandingsWidget } from "@/components/dashboard/SeasonStandingsWidget";
import { RegionalTrendsWidget } from "@/components/dashboard/RegionalTrendsWidget";
import { ReputationDashboard } from "@/components/reputation/ReputationDashboard";
import { ApprenticeTracker } from "@/components/apprentice/ApprenticeTracker";
import { NextActionBanner } from "@/components/dashboard/NextActionBanner";
import { DebtBanner } from "@/components/dashboard/DebtBanner";
import { deriveNextAction } from "@/core/dashboard/nextAction";
import { useNextActionBanner } from "@/hooks/dashboard/useNextActionBanner";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const {
    day,
    lowEnergyHorses,
    nextOwnedRace,
    activeAuctions,
    urgentMessages,
    topRivals,
    calculateHeadToHead,
  } = useDashboardData();

  const nextAction = deriveNextAction({
    urgentMessageCount: urgentMessages.length,
    nextOwnedRace: nextOwnedRace ? { id: nextOwnedRace.id, day: nextOwnedRace.day } : null,
    lowEnergyCount: lowEnergyHorses.length,
    openAuctionCount: activeAuctions.length,
    day,
  });

  const { isDismissed, dismiss, restore } = useNextActionBanner();

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Command Center
          </h1>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-gold/30 text-gold bg-gold/5 font-mono tracking-[0.2em] text-[10px] uppercase h-5"
            >
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
            <Badge
              variant="destructive"
              className="gap-1.5 animate-pulse py-1 font-bold uppercase tracking-tighter"
            >
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

      {/* Next action */}
      {isDismissed ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={restore}
            className="text-xs text-cream-muted hover:text-gold transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded px-2 py-1"
          >
            Show next action
          </button>
        </div>
      ) : (
        <NextActionBanner action={nextAction} onDismiss={dismiss} />
      )}

      {/* Solvency status */}
      <DebtBanner />

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
        <ReputationDashboard />
        <ApprenticeTracker />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        <RegionalTrendsWidget />
        <SeasonStandingsWidget />
        <NewsFeedWidget />
        <LegacyAwardsWidget />
      </div>

    </div>
  );
}
