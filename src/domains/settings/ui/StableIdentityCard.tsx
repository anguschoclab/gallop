import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useGame } from "@/platform/game/store";
import { PersonPortrait } from "@/domains/person/ui/PersonPortrait";
import { getPlayerOwnerName } from "@/domains/stable/application/stablePersonHelpers";
import { User, Shuffle } from "lucide-react";

export function StableIdentityCard() {
  const playerProfile = useGame((s) => s.playerProfile);
  const reroll = useGame((s) => s.rerollPlayerOwnerAppearance);
  const owner = playerProfile?.owner;

  if (!playerProfile || !owner) return null;

  return (
    <Card className="bg-card border-gold/20 rounded-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-[family-name:var(--font-display)] flex items-center gap-2">
          <User className="h-5 w-5 text-gold" />
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
            <div className="text-base font-bold text-cream truncate">
              {getPlayerOwnerName(playerProfile)}
            </div>
            <div className="text-sm text-cream-muted">{playerProfile.stableName}</div>
            {owner.biography.nationality && (
              <div className="text-xs text-cream-muted/60 uppercase tracking-wide mt-1">
                {owner.biography.nationality}
              </div>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reroll} className="w-full gap-2 rounded-none">
          <Shuffle className="h-4 w-4" />
          Randomize Portrait
        </Button>
      </CardContent>
    </Card>
  );
}
