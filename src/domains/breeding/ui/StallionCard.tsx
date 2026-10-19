import { useNavigate } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { isStallionAvailable } from "@/domains/breeding/application/breedingFacade";
import { inBreedingSeason } from "@/domains/breeding/application/breedingFacade";
import type { Horse } from "@/platform/game/types";

interface StallionCardProps {
  stallion: Horse;
  stableName: string;
  day: number;
  mare: Horse | undefined;
  cash: number;
  onBook: () => void;
}

export function StallionCard({ stallion, stableName, day, mare, cash, onBook }: StallionCardProps) {
  const stud = stallion.stud!;
  const available = isStallionAvailable(stallion, day);
  const inSeason = inBreedingSeason(day, stallion.hemisphere);
  const baseBookFee = 2000;
  const totalFee = baseBookFee + stud.standingFee;
  const canAfford = cash >= totalFee;
  const canBook = available && !!mare && mare.hemisphere === stallion.hemisphere && canAfford;

  const navigate = useNavigate();

  return (
    <Card
      className="border-border cursor-pointer hover:border-primary transition-colors"
      onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: stallion.id } })}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-foreground font-[family-name:var(--font-display)]">
            {stallion.name}
          </CardTitle>
          <Badge className="bg-muted text-foreground">{stallion.hemisphere}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{stableName}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Standing fee</span>
          <span className="font-mono font-semibold tabular-nums text-foreground">
            ${stud.standingFee.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Book</span>
          <span className="text-foreground">
            {stud.seasonBookings} / {stud.bookSize}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stakes foals</span>
          <span className="text-foreground">{stud.lifetimeStakesFoals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">G1 foals</span>
          <span className="text-foreground">{stud.lifetimeG1Foals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Age · Fame</span>
          <span className="text-foreground">
            {stallion.age} · {Math.round(stallion.fame)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pref. Distance</span>
          <span className="text-foreground">{Math.round(stallion.distanceAptitude)}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Best Surface</span>
          <span className="text-foreground">
            {(() => {
              const best = Object.entries(stallion.surfaceAptitude || {}).sort(
                (a, b) => b[1] - a[1],
              )[0];
              return best ? `${best[0]} (${Math.round(best[1])})` : "—";
            })()}
          </span>
        </div>
        {!inSeason && (
          <p className="text-xs text-warning">Out of breeding season for {stallion.hemisphere}.</p>
        )}
        {stud.seasonBookings >= stud.bookSize && (
          <p className="text-xs text-warning">Book is full this season.</p>
        )}
        <Button
          size="sm"
          className="w-full mt-2"
          disabled={!canBook}
          onClick={(e) => {
            e.stopPropagation();
            onBook();
          }}
        >
          {!mare
            ? "Select a mare first"
            : mare.hemisphere !== stallion.hemisphere
              ? "Hemisphere mismatch"
              : !canAfford
                ? `Need $${totalFee.toLocaleString()}`
                : !available
                  ? "Unavailable"
                  : `Book — $${totalFee.toLocaleString()}`}
        </Button>
      </CardContent>
    </Card>
  );
}
