import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useGame } from "@/platform/game/store";
import { PersonPortrait } from "@/domains/person/ui/PersonPortrait";
import { PortraitRandomizeButton } from "@/domains/person/ui/PortraitRandomizeButton";
import { getPlayerOwnerName } from "@/domains/stable/application/stablePersonHelpers";
import { User } from "lucide-react";

export function StableIdentityCard() {
  const playerProfile = useGame((s) => s.playerProfile);
  const reroll = useGame((s) => s.rerollPlayerOwnerAppearance);
  const owner = playerProfile?.owner;

  if (!playerProfile || !owner) return null;

  return (
    <Card className="bg-card border-primary/20 rounded-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-[family-name:var(--font-display)] flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Stable Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <PersonPortrait
              identity={owner}
              context="owner-formal"
              width={95}
              height={114}
              ariaLabel={getPlayerOwnerName(playerProfile)}
            />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground truncate">
              {getPlayerOwnerName(playerProfile)}
            </div>
            <div className="text-sm text-muted-foreground">{playerProfile.stableName}</div>
            {owner.biography.nationality && (
              <div className="text-xs text-muted-foreground/60 uppercase tracking-wide mt-1">
                {owner.biography.nationality}
              </div>
            )}
          </div>
        </div>
        <PortraitRandomizeButton onClick={reroll} className="w-full" />
      </CardContent>
    </Card>
  );
}
