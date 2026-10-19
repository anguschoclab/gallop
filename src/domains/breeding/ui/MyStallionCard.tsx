import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { Horse } from "@/platform/game/types";

interface MyStallionCardProps {
  stallion: Horse;
  day: number;
  recommendedFee: number;
  onUpdateFee: (fee: number) => void;
}

export function MyStallionCard({
  stallion,
  day,
  recommendedFee,
  onUpdateFee,
}: MyStallionCardProps) {
  const [feeInput, setFeeInput] = useState(stallion.stud!.standingFee.toString());
  const stud = stallion.stud!;
  const navigate = useNavigate();

  return (
    <Card
      className="border-primary cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate({ to: "/stable/$horseId", params: { horseId: stallion.id } })}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-foreground font-[family-name:var(--font-display)]">
              {stallion.name}
            </CardTitle>
            <p className="text-xs text-primary">Player Owned</p>
          </div>
          <Badge className="bg-muted text-foreground">{stallion.hemisphere}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Season Bookings</span>
            <span className="text-foreground font-mono">
              {stud.seasonBookings} / {stud.bookSize}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Stakes / G1 Foals</span>
            <span className="text-foreground font-mono">
              {stud.lifetimeStakesFoals} / {stud.lifetimeG1Foals}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Pref. Distance</span>
            <span className="text-foreground font-mono">
              {Math.round(stallion.distanceAptitude)}m
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Best Surface</span>
            <span className="text-foreground font-mono">
              {(() => {
                const best = Object.entries(stallion.surfaceAptitude || {}).sort(
                  (a, b) => b[1] - a[1],
                )[0];
                return best ? `${best[0]} (${Math.round(best[1])})` : "—";
              })()}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-xs text-muted-foreground">Standing Fee</label>
            <button
              className="text-[10px] text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setFeeInput(recommendedFee.toString());
                onUpdateFee(recommendedFee);
              }}
            >
              Apply Recommended: ${recommendedFee.toLocaleString()}
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                className="pl-6 bg-surface/50 border-border text-foreground"
                type="number"
                value={feeInput}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setFeeInput(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-surface"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateFee(parseInt(feeInput) || 0);
              }}
            >
              Update
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
