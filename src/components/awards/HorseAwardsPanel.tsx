import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AwardIcon } from "./AwardIcon";
import { AwardBadge } from "./AwardBadge";
import { cn } from "@/lib/utils";
import type { Horse } from "@/game/types";
import { Trophy, Award, Star } from "lucide-react";

interface HorseAwardsPanelProps {
  horse: Horse;
  className?: string;
}

export function HorseAwardsPanel({ horse, className }: HorseAwardsPanelProps) {
  const awards = useGame((s) => s.awards ?? []);

  // Get awards for this horse
  const horseAwards = awards.filter((a) => a.horseId === horse.id);

  if (horseAwards.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No awards yet. Win graded stakes to earn regional championships!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by year descending, HOTY first
  const sortedAwards = [...horseAwards].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.category === "horse_of_the_year") return -1;
    if (b.category === "horse_of_the_year") return 1;
    return 0;
  });

  const hotyAwards = sortedAwards.filter((a) => a.category === "horse_of_the_year");
  const categoryAwards = sortedAwards.filter((a) => a.category !== "horse_of_the_year");

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Awards
          </CardTitle>
          <Badge variant="secondary">{horseAwards.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* HOTY Highlight */}
        {hotyAwards.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Star className="w-3 h-3" />
              Horse of the Year
            </h4>
            <div className="flex flex-wrap gap-2">
              {hotyAwards.map((award) => (
                <div
                  key={award.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-fame/10 border border-fame/30"
                >
                  <AwardIcon
                    region={award.region}
                    category={award.category}
                    size="small"
                    animated
                  />
                  <div className="text-sm">
                    <div className="font-medium">{award.year}</div>
                    <div className="text-xs text-muted-foreground">
                      {award.points} points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Awards */}
        {categoryAwards.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Award className="w-3 h-3" />
              Championships
            </h4>
            <div className="grid gap-2">
              {categoryAwards.slice(0, 6).map((award) => (
                <AwardBadge
                  key={award.id}
                  award={award}
                  variant="inline"
                  showYear
                />
              ))}
              {categoryAwards.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{categoryAwards.length - 6} more awards
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{sortedAwards.length}</div>
              <div className="text-xs text-muted-foreground">Total Awards</div>
            </div>
            <div>
              <div className="text-lg font-bold">{hotyAwards.length}</div>
              <div className="text-xs text-muted-foreground">HOTY</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {Math.max(...sortedAwards.map((a) => a.year)) -
                  Math.min(...sortedAwards.map((a) => a.year)) + 1}
              </div>
              <div className="text-xs text-muted-foreground">Years Active</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
