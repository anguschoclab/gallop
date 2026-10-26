import { createFileRoute, Link } from "@tanstack/react-router";
import { useDashboardData } from "@/domains/dashboard/application/hooks/useDashboardData";
import { gameCalendarDate } from "@/domains/calendar/application/calendarFacade";
import { Badge } from "@/shared/ui/badge";
import { ReputationBadge } from "@/domains/shell/ui/ReputationBadge";
import { Zap, AlertCircle, Gavel } from "lucide-react";
import { UrgentMessagesStrip } from "@/domains/dashboard/ui/UrgentMessagesStrip";
import { GallopGazette } from "@/domains/dashboard/ui/GallopGazette";
import { OperationsTicker } from "@/domains/dashboard/ui/OperationsTicker";
import { KeyRivalsWidget } from "@/domains/dashboard/ui/KeyRivalsWidget";
import { HQOpsWidget } from "@/domains/dashboard/ui/HQOpsWidget";
import { StableRosterWidget } from "@/domains/dashboard/ui/StableRosterWidget";
import { CircuitWidget } from "@/domains/dashboard/ui/CircuitWidget";
import { NewsFeedWidget } from "@/domains/dashboard/ui/NewsFeedWidget";
import { AIActivityStrip } from "@/domains/dashboard/ui/AIActivityStrip";
import { LegacyAwardsWidget } from "@/domains/dashboard/ui/LegacyAwardsWidget";
import { SeasonStandingsWidget } from "@/domains/dashboard/ui/SeasonStandingsWidget";
import { RegionalTrendsWidget } from "@/domains/dashboard/ui/RegionalTrendsWidget";
import { ReputationDashboard } from "@/domains/reputation/ui/ReputationDashboard";
import { PlayerPrestigePanel } from "@/domains/prestige/ui/PlayerPrestigePanel";
import { ApprenticeTracker } from "@/domains/apprentice/ui/ApprenticeTracker";
import { TutorialNextActionBanner } from "@/domains/tutorial/ui/TutorialNextActionBanner";
import { DebtBanner } from "@/domains/dashboard/ui/DebtBanner";
import { DailyStatsSummaryWidget } from "@/domains/dashboard/ui/DailyStatsSummaryWidget";
import { deriveNextAction } from "@/domains/dashboard/simulation/nextAction";
import { useNextActionBanner } from "@/domains/dashboard/application/hooks/useNextActionBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gallop" },
      {
        name: "description",
        content: "Manage your Gallop racing stable, horses, finances and upcoming races.",
      },
      { property: "og:title", content: "Dashboard — Gallop" },
      {
        property: "og:description",
        content: "Manage your Gallop racing stable, horses, finances and upcoming races.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {
    day,
    ownedHorses,
    lowEnergyHorses,
    nextOwnedRace,
    activeAuctions,
    urgentMessages,
    topRivals,
    calculateHeadToHead,
    news,
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
          <h1 className="text-4xl font-bold tracking-tighter text-foreground font-[family-name:var(--font-display)]">
            {ownedHorses.length === 0 ? "Welcome to your stable." : "Welcome back"}
          </h1>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-primary/30 text-primary bg-primary/5 font-mono tracking-wide text-[10px] uppercase h-5"
            >
              {gameCalendarDate(day)}
            </Badge>
            <ReputationBadge />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextOwnedRace && (
            <Badge className="bg-fame text-slate-950 gap-1.5 py-1 font-black uppercase tracking-tighter shadow-[0_0_10px_var(--border)]">
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
            className="text-xs text-muted-foreground hover:text-primary transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-2 py-1"
          >
            Show next action
          </button>
        </div>
      ) : (
        <TutorialNextActionBanner fallbackAction={nextAction} />
      )}

      {/* Solvency status */}
      <DebtBanner />

      {/* Urgent Messages */}
      <UrgentMessagesStrip messages={urgentMessages} />

      {/* Daily stats summary */}
      <DailyStatsSummaryWidget />

      {/* Top Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8">
          <GallopGazette />
        </div>
        <div className="xl:col-span-4 space-y-4">
          <OperationsTicker />
          <AIActivityStrip news={news} />
        </div>
      </div>

      {/* Main Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KeyRivalsWidget rivals={topRivals} calculateHeadToHead={calculateHeadToHead} />
        <HQOpsWidget />
        <StableRosterWidget />
        <CircuitWidget />
        <ReputationDashboard />
        <PlayerPrestigePanel />
        <ApprenticeTracker />
      </div>

      {/* Regional trends */}
      <RegionalTrendsWidget />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        <SeasonStandingsWidget />
        <NewsFeedWidget />
        <LegacyAwardsWidget />
      </div>
    </div>
  );
}
