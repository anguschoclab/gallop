import { createFileRoute } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import type { GameState, Horse } from "@/game/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Flag } from "lucide-react";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { CampaignAddPanel } from "@/components/scheduler/CampaignAddPanel";
import { CampaignCard } from "@/components/scheduler/CampaignCard";
import { TacticsAnalyzer } from "@/components/tactics/TacticsAnalyzer";

export const Route = createFileRoute("/scheduler")({
  component: SchedulerPage,
});

function SchedulerPage() {
  const day = useGame((s: GameState) => s.day);
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const races = useGameWithShallow((s: GameState) => s.races);
  const campaigns = useGameWithShallow((s: GameState) => s.campaigns ?? []);
  const generateAutoCampaign = useGame((s) => s.generateAutoCampaign);
  const deleteCampaign = useGame((s) => s.deleteCampaign);
  const dismissCampaignFlag = useGame((s) => s.dismissCampaignFlag);

  const ownedHorses = horses.filter((h: Horse) => h.owned);
  const horsesWithoutCampaign = ownedHorses.filter(
    (h: Horse) => !campaigns.some((c: any) => c.horseId === h.id),
  );

  const getRace = (raceId: string) => races.find((r: any) => r.id === raceId);
  const getHorse = (horseId: string) => horses.find((h: Horse) => h.id === horseId);

  const totalActiveFlags = campaigns.reduce(
    (acc: number, c: any) => acc + c.flags.filter((f: any) => !f.dismissed).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Campaign Scheduler
          </h1>
          <p className="text-sm text-cream-muted mt-1 font-[family-name:var(--font-body)]">
            Plan race campaigns for your horses · {gameCalendarDate(day)}
          </p>
        </div>
        {totalActiveFlags > 0 && (
          <Badge variant="destructive" className="gap-1">
            <Flag className="h-3 w-3" />
            {totalActiveFlags} flags need attention
          </Badge>
        )}
      </div>

      <CampaignAddPanel
        horsesWithoutCampaign={horsesWithoutCampaign}
        onCreate={(horseId, goal) => generateAutoCampaign(horseId, goal)}
      />

      {campaigns.length === 0 && (
        <Card className="border-gold-muted">
          <CardContent className="py-12 text-center text-cream-muted">
            <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm mt-1">
              Add a campaign above to start planning your horses' race schedules.
            </p>
          </CardContent>
        </Card>
      )}

      {campaigns.map((campaign: any) => {
        const horse = getHorse(campaign.horseId);
        if (!horse) return null;
        return (
          <CampaignCard
            key={campaign.horseId}
            campaign={campaign}
            horse={horse}
            getRace={getRace}
            onDelete={deleteCampaign}
            onDismissFlag={dismissCampaignFlag}
          />
        );
      })}
    </div>
  );
}
