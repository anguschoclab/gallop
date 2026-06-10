import { useNavigate } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isStallionAvailable } from "@/core/breeding/stallions";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import type { Horse } from "@/game/types";

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
      className="border-gold-muted cursor-pointer hover:border-gold transition-colors"
      onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: stallion.id } })}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-cream font-[family-name:var(--font-display)]">
            {stallion.name}
          </CardTitle>
          <Badge className="bg-t700 text-cream">{stallion.hemisphere}</Badge>
        </div>
        <p className="text-xs text-cream-muted">{stableName}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-cream-muted">Standing fee</span>
          <span className="font-mono font-semibold tabular-nums text-cream">
            ${stud.standingFee.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Book</span>
          <span className="text-cream">
            {stud.seasonBookings} / {stud.bookSize}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Stakes foals</span>
          <span className="text-cream">{stud.lifetimeStakesFoals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">G1 foals</span>
          <span className="text-cream">{stud.lifetimeG1Foals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Age · Fame</span>
          <span className="text-cream">
            {stallion.age} · {stallion.fame}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Pref. Distance</span>
          <span className="text-cream">{Math.round(stallion.distanceAptitude)}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Best Surface</span>
          <span className="text-cream">
            {(() => {
              const best = Object.entries(stallion.surfaceAptitude || {}).sort((a, b) => b[1] - a[1])[0];
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
