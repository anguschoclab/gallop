import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, Trash2, X } from "lucide-react";
import type { CampaignGoalType, Horse } from "@/game/types";
import { CampaignSlotList } from "./CampaignSlotList";

const GOAL_LABELS: Record<CampaignGoalType, string> = {
  chase_g1: "Chase G1",
  chase_g2: "Chase G2",
  chase_g3: "Chase G3",
  chase_major_race: "Chase Major Race",
  maximize_earnings: "Maximize Earnings",
  develop_maiden: "Develop Maiden",
  free_run: "Free Run",
};

interface CampaignCardProps {
  campaign: any;
  horse: Horse;
  getRace: (raceId: string) => any;
  onDelete: (horseId: string) => void;
  onDismissFlag: (horseId: string, flagIndex: number) => void;
}

export function CampaignCard({ campaign, horse, getRace, onDelete, onDismissFlag }: CampaignCardProps) {
  const activeFlags = campaign.flags.filter((f: any) => !f.dismissed);
  const upcomingSlots = campaign.slots
    .filter((s: any) => s.status === "planned" || s.status === "entered")
    .sort((a: any, b: any) => a.dayTarget - b.dayTarget)
    .slice(0, 5);

  return (
    <Card className="border-gold-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-base font-[family-name:var(--font-display)]">
                <Link
                  to="/stable/$horseId"
                  params={{ horseId: horse.id }}
                  className="hover:underline text-cream"
                >
                  {horse.name}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs border-gold-muted text-cream">
                  {GOAL_LABELS[campaign.goalType as CampaignGoalType]}
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
              onClick={() => onDelete(campaign.horseId)}
              title="Delete campaign"
              aria-label={`Delete campaign for ${horse.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeFlags.length > 0 && (
          <div className="space-y-2">
            {activeFlags.map((flag: any, fi: number) => (
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
                  onClick={() => onDismissFlag(campaign.horseId, fi)}
                  aria-label={`Dismiss flag: ${flag.message}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <CampaignSlotList slots={upcomingSlots} getRace={getRace} />

        {(campaign.confirmedAptitudes.surfaceConfirmed ||
          campaign.confirmedAptitudes.distanceBandConfirmed) && (
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
}
