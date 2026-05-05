import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Flag, Plus, Trash2, X, ChevronRight } from "lucide-react";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import type { CampaignGoalType } from "@/game/types";
import { useState } from "react";

export const Route = createFileRoute("/scheduler")({
  component: SchedulerPage,
});

const GOAL_LABELS: Record<CampaignGoalType, string> = {
  chase_g1: "Chase G1",
  chase_g2: "Chase G2",
  chase_g3: "Chase G3",
  maximize_earnings: "Maximize Earnings",
  develop_maiden: "Develop Maiden",
  free_run: "Free Run",
};

const SLOT_STATUS_COLORS: Record<string, string> = {
  planned: "bg-t700 text-cream",
  entered: "bg-warning text-t950",
  completed: "bg-success text-t950",
  skipped: "bg-t600 text-cream-muted",
  cancelled: "bg-destructive text-t950",
};

function SlotStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SLOT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

function SchedulerPage() {
  const day = useGame((s) => s.day);
  const horses = useGame((s) => s.horses);
  const races = useGame((s) => s.races);
  const campaigns = useGame((s) => s.campaigns ?? []);
  const setCampaign = useGame((s) => s.setCampaign);
  const deleteCampaign = useGame((s) => s.deleteCampaign);
  const generateAutoCampaign = useGame((s) => s.generateAutoCampaign);
  const dismissCampaignFlag = useGame((s) => s.dismissCampaignFlag);

  const [addingHorseId, setAddingHorseId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<CampaignGoalType>("chase_g1");

  const ownedHorses = horses.filter((h) => h.owned);
  const horsesWithoutCampaign = ownedHorses.filter(
    (h) => !campaigns.some((c) => c.horseId === h.id)
  );

  const getRace = (raceId: string) => races.find((r) => r.id === raceId);
  const getHorse = (horseId: string) => horses.find((h) => h.id === horseId);

  const totalActiveFlags = campaigns.reduce(
    (acc, c) => acc + c.flags.filter((f) => !f.dismissed).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">Campaign Scheduler</h1>
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

      {/* Add campaign panel */}
      {horsesWithoutCampaign.length > 0 && (
        <Card className="border-dashed border-gold-muted">
          <CardContent className="pt-4">
            {addingHorseId === null ? (
              <Button
                variant="ghost"
                className="w-full gap-2 text-cream-muted"
                onClick={() => setAddingHorseId(horsesWithoutCampaign[0]?.id ?? "")}
              >
                <Plus className="h-4 w-4" />
                Add campaign for a horse
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Select value={addingHorseId} onValueChange={setAddingHorseId}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Select horse" />
                  </SelectTrigger>
                  <SelectContent>
                    {horsesWithoutCampaign.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedGoal}
                  onValueChange={(v) => setSelectedGoal(v as CampaignGoalType)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GOAL_LABELS) as CampaignGoalType[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {GOAL_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => {
                    if (addingHorseId) {
                      generateAutoCampaign(addingHorseId, selectedGoal);
                      setAddingHorseId(null);
                    }
                  }}
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingHorseId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {campaigns.length === 0 && (
        <Card className="border-gold-muted">
          <CardContent className="py-12 text-center text-cream-muted">
            <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm mt-1">Add a campaign above to start planning your horses' race schedules.</p>
          </CardContent>
        </Card>
      )}

      {/* Campaign cards */}
      {campaigns.map((campaign) => {
        const horse = getHorse(campaign.horseId);
        if (!horse) return null;

        const activeFlags = campaign.flags.filter((f) => !f.dismissed);
        const upcomingSlots = campaign.slots
          .filter((s) => s.status === "planned" || s.status === "entered")
          .sort((a, b) => a.dayTarget - b.dayTarget)
          .slice(0, 5);

        return (
          <Card key={campaign.horseId} className="border-gold-muted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-base font-[family-name:var(--font-display)]">
                      <Link to="/stable/$horseId" params={{ horseId: horse.id }} className="hover:underline">
                        {horse.name}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs border-gold-muted text-cream">
                        {GOAL_LABELS[campaign.goalType]}
                      </Badge>
                      {campaign.autoManaged && (
                        <span className="text-xs text-cream-muted">Auto-managed</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeFlags.length > 0 && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <Flag className="h-3 w-3" />
                      {activeFlags.length}
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-cream-muted"
                    onClick={() => deleteCampaign(campaign.horseId)}
                    title="Delete campaign"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Active flags */}
              {activeFlags.length > 0 && (
                <div className="space-y-2">
                  {activeFlags.map((flag, fi) => (
                    <div
                      key={fi}
                      className="flex items-start justify-between gap-2 p-2 rounded-md bg-warning/20 border border-warning"
                    >
                      <div className="flex items-start gap-2">
                        <Flag className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                        <p className="text-xs text-cream">{flag.message}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0 text-warning hover:text-cream"
                        onClick={() => dismissCampaignFlag(campaign.horseId, fi)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming slots */}
              {upcomingSlots.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-cream-muted uppercase tracking-wide mb-2">
                    Upcoming races
                  </p>
                  {upcomingSlots.map((slot, si) => {
                    const race = slot.raceId ? getRace(slot.raceId) : undefined;
                    return (
                      <div
                        key={si}
                        className="flex items-center justify-between py-1.5 px-3 rounded-md bg-t700 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-cream-muted tabular-nums w-20">
                            {gameCalendarDate(slot.dayTarget)}
                          </span>
                          <span className="font-medium truncate max-w-[180px]">
                            {race?.name ?? slot.raceKey ?? "TBD"}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize border-gold-muted text-cream">
                            {slot.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <SlotStatusBadge status={slot.status} />
                          {race && (
                            <Link
                              to="/race/$raceId"
                              params={{ raceId: race.id }}
                              className="text-cream-muted hover:text-cream"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-cream-muted italic">
                  No upcoming slots — slots are refreshed every 7 days automatically.
                </p>
              )}

              {/* Aptitude summary */}
              {(campaign.confirmedAptitudes.surfaceConfirmed || campaign.confirmedAptitudes.distanceBandConfirmed) && (
                <div className="flex items-center gap-3 pt-1 border-t border-gold-muted">
                  <span className="text-xs text-cream-muted">Confirmed:</span>
                  {campaign.confirmedAptitudes.surfaceConfirmed && (
                    <Badge className="text-xs bg-t700 text-cream">
                      {campaign.confirmedAptitudes.surfaceConfirmed}
                    </Badge>
                  )}
                  {campaign.confirmedAptitudes.distanceBandConfirmed && (
                    <Badge className="text-xs capitalize bg-t700 text-cream">
                      {campaign.confirmedAptitudes.distanceBandConfirmed}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
