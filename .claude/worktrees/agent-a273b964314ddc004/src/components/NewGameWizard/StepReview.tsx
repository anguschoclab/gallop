import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getBackstory } from "@/core/newGame/backstories";
import { SilkPreview } from "./SilkPreview";
import type { PlayerProfile, BackstoryId } from "@/game/types";

interface StepReviewProps {
  profile: PlayerProfile;
  backstoryId: BackstoryId;
  onBegin: () => void;
  onBack: () => void;
}

export function StepReview({ profile, backstoryId, onBegin, onBack }: StepReviewProps) {
  const backstory = getBackstory(backstoryId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-display)] mb-2">
          Review & Begin
        </h2>
        <p className="text-cream-muted">Review your choices and start your racing career.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gold">Stable Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Stable Name</span>
                    <span className="text-cream font-medium">{profile.stableName}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your stable's official name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Owner</span>
                    <span className="text-cream font-medium">{profile.ownerName}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your name as the stable owner</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Racing Silks</span>
                    <SilkPreview silk={profile.silk} size={48} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your stable's racing colors</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex justify-center pt-2">
              <SilkPreview silk={profile.silk} size={120} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gold">Starting Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Backstory</span>
                    <span className="text-cream font-medium">{backstory.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{backstory.blurb}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Starting Cash</span>
                    <span className="text-cream font-medium">${backstory.startingCash.toLocaleString()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Initial funds to operate your stable</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Horses</span>
                    <span className="text-cream font-medium">
                      {backstory.horses.map((h) => `${h.count} ${h.tier}`).join(", ")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Initial horses in your stable</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Facilities</span>
                    <span className="text-cream font-medium">
                      {Object.keys(backstory.facilityUpgrades).length || "None"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Starting infrastructure</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-between items-center">
                    <span className="text-cream-muted">Reputation</span>
                    <span className="text-cream font-medium">{backstory.reputationScore}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Initial industry reputation (0-1000 scale)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onBegin} className="bg-gold text-t950 hover:bg-gold-light">
          Begin Racing Career
        </Button>
      </div>
    </div>
  );
}
