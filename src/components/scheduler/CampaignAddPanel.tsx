import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { CampaignGoalType, Horse } from "@/game/types";
import { useState } from "react";

const GOAL_LABELS: Record<CampaignGoalType, string> = {
  chase_g1: "Chase G1",
  chase_g2: "Chase G2",
  chase_g3: "Chase G3",
  chase_major_race: "Chase Major Race",
  maximize_earnings: "Maximize Earnings",
  develop_maiden: "Develop Maiden",
  free_run: "Free Run",
};

interface CampaignAddPanelProps {
  horsesWithoutCampaign: Horse[];
  onCreate: (horseId: string, goal: CampaignGoalType) => void;
}

export function CampaignAddPanel({ horsesWithoutCampaign, onCreate }: CampaignAddPanelProps) {
  const [addingHorseId, setAddingHorseId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<CampaignGoalType>("chase_g1");

  if (horsesWithoutCampaign.length === 0) return null;

  return (
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
                  onCreate(addingHorseId, selectedGoal);
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
              aria-label="Cancel adding campaign"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
