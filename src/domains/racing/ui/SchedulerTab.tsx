import { useGame, useGameWithShallow } from "@/platform/game/store";
import { useMemo } from "react";
import type { GameState, Horse, HorseCampaign } from "@/platform/game/types";
import { Badge } from "@/shared/ui/badge";
import { CalendarClock, Flag } from "lucide-react";
import { gameCalendarDate } from "@/domains/calendar/application/calendarFacade";
import { CampaignAddPanel } from "@/domains/scheduler/ui/CampaignAddPanel";
import { CampaignCard } from "@/domains/scheduler/ui/CampaignCard";
import { isPlayerOwned } from "@/domains/horse/application/horseFacade";
import { EmptyState } from "@/shared/ui/common/EmptyState";

export function SchedulerTab() {
  const day = useGame((s: GameState) => s.day);
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const races = useGameWithShallow((s: GameState) => s.races);
  const campaigns = useGameWithShallow((s: GameState) => s.campaigns ?? []);
  const generateAutoCampaign = useGame((s) => s.generateAutoCampaign);
  const deleteCampaign = useGame((s) => s.deleteCampaign);
  const dismissCampaignFlag = useGame((s) => s.dismissCampaignFlag);

  const { ownedHorses, horsesWithoutCampaign } = useMemo(() => {
    const owned = Object.values(horses).filter((h: Horse) => isPlayerOwned(h));
    const campaignIds = new Set(campaigns.map((c: HorseCampaign) => c.horseId));
    const withoutCampaign = owned.filter((h: Horse) => !campaignIds.has(h.id));
    return { ownedHorses: owned, horsesWithoutCampaign: withoutCampaign };
  }, [horses, campaigns]);

  const getRace = (raceId: string) => races[raceId];
  const getHorse = (horseId: string) => horses[horseId];

  const totalActiveFlags = campaigns.reduce(
    (acc: number, c: HorseCampaign) => acc + c.flags.filter((f) => !f.dismissed).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Campaign Scheduler
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
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
        <EmptyState
          icon={CalendarClock}
          title="No campaigns yet"
          description="Add a campaign above to start planning your horses' race schedules."
        />
      )}

      {campaigns.map((campaign: HorseCampaign) => {
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
